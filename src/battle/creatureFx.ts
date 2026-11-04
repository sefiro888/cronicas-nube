import { CARD_BY_ID, type AnimationEvent, type FactionId } from '../game'

/**
 * De qué está hecha una criatura, para que al recibir un golpe o morir
 * reaccione según su naturaleza: una bestia salpica, un constructo suelta
 * chispas y tornillos, un espíritu se deshace en niebla, una planta en
 * hojas y un goblin… revienta. Antes todas morían con las mismas pavesas.
 *
 * Sin gore: la «sangre» son gotas estilizadas de un rojo oscuro que se
 * desvanecen en el aire, igual de abstractas que las pavesas de siempre.
 */
export type CreatureKind = 'flesh' | 'plant' | 'machine' | 'spirit' | 'stone' | 'crystal' | 'goblin'

const sub = (cardId?: string) => (cardId ? CARD_BY_ID[cardId]?.subtype ?? '' : '').toLocaleLowerCase('es-ES')

export const creatureKind = (cardId?: string): CreatureKind => {
  const card = cardId ? CARD_BY_ID[cardId] : undefined
  if (!card) return 'stone'
  const subtype = sub(cardId)
  if (card.type === 'structure') return /cristal/.test(subtype) ? 'crystal' : 'stone'
  if (card.faction === 'goblins' || /goblin/.test(subtype)) return 'goblin'
  if (/autómata|automata|máquina|maquina|constructo|artefacto|armadura/.test(subtype) || card.faction === 'forja') return 'machine'
  if (/no muerto|undead|espíritu|espiritu|fantasma|horror/.test(subtype) || card.faction === 'void' || card.faction === 'shadow') return 'spirit'
  if (/treant|planta|árbol|arbol|druida|enredadera/.test(subtype) || card.faction === 'nature' || card.faction === 'jade') return 'plant'
  if (/gólem|golem|estatua|gigante/.test(subtype)) return 'stone'
  if (/cristal|elemental de hielo/.test(subtype) || card.faction === 'arcane' || card.faction === 'fimbul') return 'crystal'
  return 'flesh'
}

/** Colores de lo que salta al golpear: [principal, secundario]. */
export const SPILL_COLORS: Readonly<Record<CreatureKind, readonly [string, string]>> = {
  flesh: ['#9e1b1b', '#e0463a'],
  plant: ['#4f9a3a', '#b8e07a'],
  machine: ['#ffcf6a', '#fff4d0'],
  spirit: ['#7fb8ff', '#e2f0ff'],
  stone: ['#8c7d68', '#c9b89a'],
  crystal: ['#9fe8ff', '#ffffff'],
  goblin: ['#ff8a1f', '#ffe066'],
}

/** Tipo de daño, para dar a cada número su color e icono. */
export type DamageKind = 'physical' | 'fire' | 'ice' | 'poison' | 'shadow' | 'arcane'

const FACTION_DAMAGE: Partial<Record<FactionId, DamageKind>> = {
  fury: 'fire', goblins: 'fire', sol: 'fire', samsara: 'fire',
  fimbul: 'ice', marea: 'ice', kalevala: 'ice',
  plaga: 'poison',
  shadow: 'shadow', void: 'shadow',
  arcane: 'arcane', olimpo: 'arcane',
}

export const damageKind = (event: Pick<AnimationEvent, 'effectId' | 'faction'>): DamageKind => {
  const effect = (event.effectId ?? '').toLowerCase()
  if (/fire|burn|ember|scorch|flame|petardazo|lava|caldera|abras/.test(effect)) return 'fire'
  if (/frost|ice|freeze|snow|hielo|congel/.test(effect)) return 'ice'
  if (/poison|plague|contagi|infect|venom|toxic/.test(effect)) return 'poison'
  if (/shadow|void|curse|necro|sombra|maldic/.test(effect)) return 'shadow'
  if (/arcane|lightning|spark|bolt|rayo|arcan/.test(effect)) return 'arcane'
  return (event.faction && FACTION_DAMAGE[event.faction]) || 'physical'
}

/** Un golpe de 5 o más es crítico: se ve en oro y más grande. */
export const CRITICAL_DAMAGE = 5
