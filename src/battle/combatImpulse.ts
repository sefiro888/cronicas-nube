import type { AnimationEvent, BoardPiece } from '../game'
import { CARD_BY_ID } from '../game'
import { gridToWorldX, gridToWorldZ, nexusWorldZ } from './grid/gridCoordinates'

/**
 * Golpe físico de una ficha: la embestida del atacante hacia su objetivo y el
 * retroceso del que lo recibe. Hasta ahora un ataque solo se veía por los
 * números de daño flotantes — las dos fichas se quedaban quietas, así que no
 * había forma de saber quién estaba pegando a quién sin leer la crónica.
 */
export interface Impulse {
  /** Id del evento que lo provocó: cambiar de id es lo que dispara la animación. */
  readonly key: string
  readonly kind: 'lunge' | 'recoil' | 'release'
  /** Dirección normalizada en el plano del tablero. */
  readonly dx: number
  readonly dz: number
  readonly durationMs: number
}

/**
 * Un seno simétrico parecía una oscilación sin peso. El ataque reserva un
 * tramo corto para cargar, acelera al impacto y vuelve más despacio. El
 * retroceso usa SIEMPRE la dirección de alejamiento calculada por el evento:
 * el alcance negativo anterior devolvía la defensora hacia quien la golpeó.
 */
export const combatPose = (kind: Impulse['kind'], progress: number): { reach: number; lift: number; lean: number } => {
  const t = Math.max(0, Math.min(1, progress))
  if (t === 0 || t === 1) return { reach: 0, lift: 0, lean: 0 }
  if (kind === 'release') {
    const smooth = (value: number) => value * value * (3 - 2 * value)
    // El tirador se afianza en su casilla. La embestida de medio metro lo
    // adelantaba a su propio proyectil y parecía un ataque cuerpo a cuerpo.
    const load = t < 0.3 ? smooth(t / 0.3) : 1 - smooth(Math.min(1, (t - 0.3) / 0.4))
    const kick = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.4) / 0.24)))
    return { reach: -0.045 * load + 0.02 * kick, lift: 0.008 * load, lean: -0.08 * load + 0.045 * kick }
  }
  if (kind === 'recoil') {
    const kick = Math.sin(Math.PI * Math.min(1, t / 0.38))
    const settle = t > 0.38 ? Math.sin((t - 0.38) / 0.62 * Math.PI) * 0.035 : 0
    return { reach: kick * 0.23 + settle, lift: kick * 0.025, lean: kick * 0.11 }
  }
  const smooth = (value: number) => value * value * (3 - 2 * value)
  const reach = t < 0.2
    ? -0.055 * smooth(t / 0.2)
    : t < 0.46
      ? -0.055 + 0.555 * Math.pow((t - 0.2) / 0.26, 2)
      : 0.5 * (1 - smooth((t - 0.46) / 0.54))
  return { reach, lift: Math.max(0, reach) * 0.16, lean: reach * 0.18 }
}

/** Dirección unitaria de un punto a otro; hacia el fondo si coinciden. */
const direction = (fromX: number, fromZ: number, toX: number, toZ: number) => {
  const dx = toX - fromX
  const dz = toZ - fromZ
  const length = Math.hypot(dx, dz)
  return length < 0.0001 ? { dx: 0, dz: -1 } : { dx: dx / length, dz: dz / length }
}

/**
 * Qué fichas se mueven por el evento que se está reproduciendo, y hacia dónde.
 *
 * El atacante embiste en la dirección de su objetivo (contra el Nexo rival no
 * viene casilla de destino: se apunta al Nexo). El que recibe daño retrocede
 * alejándose de la casilla de la que vino el golpe — por eso el motor marca
 * `from` en los eventos de daño de combate; sin ese dato, el retroceso se
 * calculaba «hacia fuera del centro» y en medio tablero salía al revés.
 */
export const impulsesForEvent = (
  event: AnimationEvent | undefined,
  board: readonly BoardPiece[],
): ReadonlyMap<string, Impulse> => {
  const map = new Map<string, Impulse>()
  if (!event) return map
  const pieceAt = (id?: string) => board.find((candidate) => candidate.instanceId === id)

  if ((event.type === 'attack' || event.type === 'obstacle-break') && event.actorId) {
    const attacker = pieceAt(event.actorId)
    if (attacker) {
      const from = { x: gridToWorldX(attacker.position.x), z: gridToWorldZ(attacker.position.y) }
      const to = event.to
        ? { x: gridToWorldX(event.to.x), z: gridToWorldZ(event.to.y) }
        : { x: 0, z: nexusWorldZ(attacker.owner === 'player' ? 'ai' : 'player') }
      const { dx, dz } = direction(from.x, from.z, to.x, to.z)
      const kind = event.type === 'attack' && (CARD_BY_ID[attacker.cardId]?.range ?? 1) > 1 ? 'release' : 'lunge'
      map.set(attacker.instanceId, { key: event.id, kind, dx, dz, durationMs: event.durationMs })
    }
  }

  if ((event.type === 'damage' || event.type === 'destroy') && event.targetId) {
    const defender = pieceAt(event.targetId)
    if (defender) {
      const to = { x: gridToWorldX(defender.position.x), z: gridToWorldZ(defender.position.y) }
      const from = event.from
        ? { x: gridToWorldX(event.from.x), z: gridToWorldZ(event.from.y) }
        : { x: 0, z: 0 }
      const { dx, dz } = direction(from.x, from.z, to.x, to.z)
      map.set(defender.instanceId, { key: event.id, kind: 'recoil', dx, dz, durationMs: event.durationMs })
    }
  }

  return map
}
