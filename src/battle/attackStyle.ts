import type { CardDefinition, FactionId } from '../game'

/**
 * Cómo se ve un ataque según quién lo lanza.
 *
 * Antes todos los ataques eran el mismo arco con una bola de color (o un
 * aro en cuerpo a cuerpo) y solo cambiaba el tono: el propietario decía que
 * «todos los ataques se ven igual». Ahora cada tipo de criatura golpea a su
 * manera: un soldado tajea, una bestia desgarra, un gólem aplasta, un
 * arquero dispara flechas, un arcabucero hace fuego, un mago lanza rayos y
 * un dragón escupe fuego. Solo es presentación: el motor no lo lee.
 */
export type AttackKind =
  | 'slash'      // tajos cruzados de arma
  | 'claw'       // tres zarpazos paralelos
  | 'crush'      // golpe al suelo con onda y cascotes
  | 'spectral'   // espíritus que giran hasta el objetivo
  | 'arrow'      // andanada de flechas en arco bajo
  | 'shot'       // trazadora recta con fogonazo y humo
  | 'bolt'       // rayo en zigzag
  | 'breath'     // chorro de fuego en cono
  | 'barbs'      // púas que se abren y convergen
  | 'orb'        // proyectil mágico con estela (el de siempre)

const lower = (value: string | undefined) => (value ?? '').toLocaleLowerCase('es-ES')

const has = (subtype: string, words: readonly string[]) => words.some((word) => subtype.includes(word))

const HEAVY = ['constructo', 'gigante', 'autómata', 'automata', 'treant', 'artefacto', 'gólem', 'golem', 'titán', 'titan']
const BEAST = ['bestia', 'horror', 'ave', 'serpiente', 'lobo', 'jabalí', 'felino', 'insecto', 'enjambre']
const GHOST = ['no muerto', 'undead', 'espíritu', 'espiritu', 'fantasma', 'zombi']
const CASTER = ['hechicer', 'mago', 'místic', 'mistic', 'bruja', 'elemental', 'cantor', 'chamán', 'chaman', 'sacerdot', 'celestial']
const GUNNER = ['arcabucer', 'mosquetero', 'artiller', 'zapador']
const ARCHER = ['cazador', 'arquer', 'jinete', 'humanoid', 'soldado', 'guerrer', 'bandido', 'aldeano', 'héroe', 'heroe', 'infantería', 'oficial']

/** Facciones de pólvora: su ataque a distancia por defecto es un disparo. */
const GUNPOWDER: ReadonlySet<FactionId> = new Set(['tercios', 'forja', 'goblins'])
/** Facciones de fuego: su proyectil por defecto es una bola de fuego (estela ember). */
const FIRE: ReadonlySet<FactionId> = new Set(['fury', 'sol', 'samsara'])

export const attackKindFor = (card: Pick<CardDefinition, 'subtype' | 'range' | 'attack' | 'faction'> | undefined, melee: boolean): AttackKind => {
  if (!card) return melee ? 'slash' : 'orb'
  const subtype = lower(card.subtype)
  if (subtype.includes('dragón') || subtype.includes('dragon')) return 'breath'
  if (melee) {
    if (has(subtype, GHOST)) return 'spectral'
    // Un golpe de 5 o más se siente como un mazazo aunque lo dé un humano.
    if (has(subtype, HEAVY) || (card.attack ?? 0) >= 5) return 'crush'
    if (has(subtype, BEAST)) return 'claw'
    return 'slash'
  }
  if (has(subtype, GUNNER)) return 'shot'
  if (has(subtype, CASTER) || has(subtype, GHOST)) return 'bolt'
  if (has(subtype, BEAST)) return 'barbs'
  if (subtype.includes('ígne') || subtype.includes('igne')) return 'orb'
  if (GUNPOWDER.has(card.faction) && !has(subtype, ['cazador', 'arquer'])) return 'shot'
  if (FIRE.has(card.faction)) return 'orb'
  if (has(subtype, ARCHER)) return 'arrow'
  return 'orb'
}

/** Cuánto pesa el golpe (0–1): más flechas, más cascotes, más onda. */
export const attackWeight = (attack: number | undefined): number => Math.max(0, Math.min(1, ((attack ?? 1) - 1) / 5))
