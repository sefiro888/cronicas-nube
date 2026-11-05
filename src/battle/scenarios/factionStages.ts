import type { ScenarioId } from '../../store/preferences'
import type { MusicTheme } from '../../services/audio'

export const factionStageMusic = {
  'bastion-alba': 'aether-citadel',
  'acropolis-olimpo': 'aether-citadel',
  'baluarte-tercios': 'duna',
  'umbral-vacio': 'sanctuary',
  'cripta-plaga': 'sanctuary',
  'desguace-goblin': 'foundry',
  'lago-kalevala': 'grove',
} as const satisfies Partial<Record<ScenarioId, MusicTheme>>

export type FactionStageId = keyof typeof factionStageMusic

export const isFactionStage = (id: ScenarioId): id is FactionStageId =>
  Object.hasOwn(factionStageMusic, id)
