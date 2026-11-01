import { CARD_BY_ID, COMMANDER_BY_ID, type CardDefinition, type FactionId } from '../game'

/**
 * Animación de cada hechizo, según lo que hace. Antes casi todos eran el
 * mismo viaje de luz desde el Nexo hasta el objetivo; el propietario pidió
 * que cada uno se viera distinto: bola de fuego, tormenta, curación, robo con
 * cartas volando... Solo es presentación.
 */
export type SpellKind =
  | 'fireball'  // daño a un objetivo con fuego
  | 'bolt'      // daño a un objetivo, rayo
  | 'storm'     // daño a varios: lluvia de meteoros o rayos sobre cada uno
  | 'heal'      // curación: columna de luz verde y destellos que suben
  | 'draw'      // robar o adivinar: cartas que vuelan hacia la mano
  | 'frost'     // congelar o ralentizar: ola de escarcha
  | 'blessing'  // mejorar aliados: anillos dorados que suben por cada uno
  | 'judgement' // destruir: rayo del cielo sobre el objetivo
  | 'push'      // empujar: onda de choque
  | 'trail'     // el viaje de luz de siempre

const FIRE: ReadonlySet<FactionId> = new Set(['fury', 'goblins', 'sol', 'samsara'])

const effectsOf = (sourceId: string, kind: 'spell' | 'structure' | 'power'): { readonly effects: readonly CardDefinition['effects'][number][]; readonly faction?: FactionId } => {
  if (kind === 'power') {
    const commander = COMMANDER_BY_ID[sourceId]
    return { effects: (commander?.power.effects ?? []) as CardDefinition['effects'][number][], faction: commander?.faction }
  }
  const card = CARD_BY_ID[sourceId]
  return { effects: card?.effects ?? [], faction: card?.faction }
}

export const spellKindFor = (sourceId: string, kind: 'spell' | 'structure' | 'power' = 'spell'): SpellKind => {
  const { effects, faction } = effectsOf(sourceId, kind)
  const kinds = new Set(effects.map((effect) => effect.kind as string))
  const has = (...names: string[]) => names.some((name) => kinds.has(name))
  if (has('destroy-strongest-enemy', 'destroy-all-enemy-structures', 'sink', 'sink-low-health', 'choose-sinks')) return 'judgement'
  if (has('damage-all-enemies', 'conditional-damage-all-enemies', 'damage-all-enemies-by-sun-count', 'splash-weakest-enemy', 'choose-line')) return 'storm'
  if (has('freeze', 'slow-all-enemies', 'stun')) return 'frost'
  if (has('damage', 'damage-enemy-nexus')) return faction && FIRE.has(faction) ? 'fireball' : 'bolt'
  if (has('heal-nexus', 'heal-unit', 'return-fallen-allies', 'restore-structures')) return 'heal'
  if (has('buff-all-allies-permanent', 'shield-all-allies', 'grant-keyword', 'buff-automata', 'grant-formation', 'grant-petardazo-all', 'refresh-move', 'refresh-attack', 'formation-march', 'boost-discharge')) return 'blessing'
  if (has('push-target', 'push-all-enemies', 'tide')) return 'push'
  if (has('draw', 'scry', 'discard')) return 'draw'
  return 'trail'
}
