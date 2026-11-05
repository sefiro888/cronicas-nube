import { FACTION_IDS, type FactionId } from '../game'
import type { ScenarioId } from '../store/preferences'

/**
 * Qué escenario le pega a cada facción.
 *
 * El ajuste «Automático» existe porque el sitio donde se pelea decía muy poco
 * de la partida: se jugaba a Duna en una ciudadela de mármol al amanecer
 * porque era el valor por defecto y nadie había bajado a cambiarlo. Con esto,
 * cada facción trae su casa puesta y la elección manual sigue estando para
 * quien la quiera.
 */
const HOME: Readonly<Record<FactionId, Exclude<ScenarioId, 'auto'>>> = {
  fury: 'caldera',
  arcane: 'aether-citadel',
  nature: 'grove',
  order: 'bastion-alba',
  shadow: 'sanctuary',
  void: 'umbral-vacio',
  duna: 'duna',
  fimbul: 'fimbul',
  samsara: 'wheel-ghat',
  jade: 'jade-court',
  olimpo: 'acropolis-olimpo',
  sol: 'solar-court',
  bestiario: 'bestiary-ravine',
  plaga: 'cripta-plaga',
  marea: 'shore',
  forja: 'foundry',
  goblins: 'desguace-goblin',
  tercios: 'baluarte-tercios',
  kalevala: 'lago-kalevala',
}

/**
 * Escenario efectivo de una partida. Manda siempre lo que el jugador haya
 * elegido a mano; 'auto' es lo único que consulta la facción.
 */
export const resolveScenario = (
  scenario: ScenarioId,
  faction: FactionId | undefined,
): Exclude<ScenarioId, 'auto'> => {
  if (scenario !== 'auto') return scenario
  return (faction && HOME[faction]) ?? 'aether-citadel'
}

/** Un mapa elegido a mano lleva el suelo de su propia facción. */
export const factionForScenario = (scenario: ScenarioId): FactionId | undefined =>
  FACTION_IDS.find((faction) => HOME[faction] === scenario)
