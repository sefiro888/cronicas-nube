import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARD_BY_ID,
  COMMANDER_BY_ID,
  STARTER_DECKS,
  type MatchSetup,
  type MatchState,
} from '../game'

export const TOWER_FLOORS = STARTER_DECKS.length
export type TowerVariant = 'classic' | 'paths' | 'short'
export type TowerRouteId = 'passage' | 'sentinel'
export type TowerRelicId = 'ember' | 'lantern' | 'quill'
export type TowerEncounterChoiceId = 'heal' | 'relic' | 'scout'
export type BlessingId = 'mend' | 'surge' | 'insight'

export interface Blessing {
  readonly id: BlessingId
  readonly name: string
  readonly description: string
}
export const BLESSINGS: Readonly<Record<BlessingId, Blessing>> = {
  mend: {
    id: 'mend',
    name: 'Restaurar el Nexo',
    description: 'Recupera 10 de Vida (sin pasar del máximo de tu comandante).',
  },
  surge: {
    id: 'surge',
    name: 'Oleada de Esencia',
    description: 'El rival del siguiente piso empieza con 4 de Vida menos.',
  },
  insight: {
    id: 'insight',
    name: 'Presagio',
    description: 'Recupera 4 de Vida y el rival del siguiente piso pierde 2.',
  },
}
export const TOWER_VARIANTS: Readonly<
  Record<TowerVariant, { name: string; description: string; floors: number }>
> = {
  classic: {
    name: 'Ascensión clásica',
    description:
      'Un duelo contra cada facción, bendiciones y el espejo final. Las reglas de siempre.',
    floors: TOWER_FLOORS,
  },
  paths: {
    name: 'Caminos del umbral',
    description: 'Nueve pisos con bifurcaciones, encuentros, guardianes y reliquias de expedición.',
    floors: 9,
  },
  short: {
    name: 'Expedición breve',
    description:
      'Cinco pisos con encuentros y un guardián en la cima. Una aventura para una sesión corta.',
    floors: 5,
  },
}
export const TOWER_RELICS: Readonly<
  Record<TowerRelicId, { name: string; description: string; art: string }>
> = {
  ember: {
    name: 'Ascua del primer umbral',
    description: 'El Nexo rival empieza cada combate con 3 de Vida menos.',
    art: 'cometa-arcano',
  },
  lantern: {
    name: 'Farol del peregrino',
    description: 'Recuperas 3 de Vida después de cada victoria, sin superar el máximo.',
    art: 'crecimiento-salvaje',
  },
  quill: {
    name: 'Pluma de la cronista',
    description: 'Empiezas cada combate con una carta adicional de tu propio mazo.',
    art: 'juicio-divino',
  },
}
export const blessingEffect = (id: BlessingId): { heal: number; enemyPenalty: number } => {
  switch (id) {
    case 'mend':
      return { heal: 10, enemyPenalty: 0 }
    case 'surge':
      return { heal: 0, enemyPenalty: 4 }
    case 'insight':
      return { heal: 4, enemyPenalty: 2 }
  }
}

export interface TowerRun {
  readonly deckId: string
  readonly floor: number
  readonly health: number
  readonly enemyPenalty: number
  readonly seed: number
  readonly defeated: readonly string[]
  readonly awaitingBlessing: boolean
  /** Los campos opcionales conservan las expediciones clásicas guardadas antes de las variantes. */
  readonly variant?: TowerVariant
  readonly routes?: Readonly<Record<number, TowerRouteId>>
  readonly relics?: readonly TowerRelicId[]
  readonly awaitingEncounter?: boolean
  readonly encounters?: readonly { floor: number; choice: TowerEncounterChoiceId }[]
}
export interface TowerSummary {
  readonly variant: TowerVariant
  readonly won: boolean
  readonly floors: number
  readonly total: number
  readonly relics: readonly TowerRelicId[]
  readonly seed: number
}
export interface TowerRoute {
  readonly id: TowerRouteId
  readonly deckId: string
  readonly name: string
  readonly description: string
  readonly guardian: boolean
}
export interface TowerState {
  run?: TowerRun
  best: number
  variantBest?: Partial<Record<TowerVariant, number>>
  lastRun?: TowerSummary
  start: (deckId: string, seed?: number, variant?: TowerVariant) => void
  finishFloor: (won: boolean, healthLeft: number) => void
  chooseBlessing: (id: BlessingId) => void
  chooseRoute: (id: TowerRouteId) => void
  chooseEncounter: (id: TowerEncounterChoiceId) => void
  abandon: () => void
}
export const towerVariant = (run: TowerRun): TowerVariant => run.variant ?? 'classic'
export const towerFloorCount = (run: TowerRun): number => TOWER_VARIANTS[towerVariant(run)].floors
export const towerOpponents = (deckId: string, seed: number): readonly string[] => {
  const exists = STARTER_DECKS.some((deck) => deck.id === deckId)
  const ordered = STARTER_DECKS.filter((deck) => deck.id !== deckId).map((deck) => deck.id)
  let state = seed >>> 0 || 1
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const j = state % (i + 1)
    const a = ordered[i]!
    ordered[i] = ordered[j]!
    ordered[j] = a
  }
  return exists ? [...ordered, deckId] : ordered
}
export const towerRoutes = (run: TowerRun): readonly TowerRoute[] => {
  if (towerVariant(run) !== 'paths' || run.floor >= towerFloorCount(run)) return []
  const ordered = towerOpponents(run.deckId, run.seed).filter((id) => id !== run.deckId)
  const remaining = ordered.filter((id) => !run.defeated.includes(id))
  const candidates = remaining.length >= 2 ? remaining : ordered
  const offset = ((run.seed >>> 0) + run.floor * 3) % candidates.length
  return [
    {
      id: 'passage',
      deckId: candidates[offset]!,
      name: 'Pasadizo de la vigilia',
      description: 'Un duelo sin ventajas iniciales para el rival. Conserva fuerzas para la cima.',
      guardian: false,
    },
    {
      id: 'sentinel',
      deckId: candidates[(offset + 1) % candidates.length]!,
      name: 'Puerta del centinela',
      description:
        'Rival con +8 de Vida y una fuente inicial adicional. Vencer entrega una reliquia.',
      guardian: true,
    },
  ]
}
export const opponentForFloor = (run: TowerRun, floor: number): string | undefined => {
  if (floor < 1 || floor > towerFloorCount(run)) return undefined
  if (run.defeated[floor - 1]) return run.defeated[floor - 1]
  if (floor === towerFloorCount(run)) return run.deckId
  if (towerVariant(run) === 'paths') {
    const route = run.routes?.[floor]
    return towerRoutes({ ...run, floor }).find((candidate) => candidate.id === route)?.deckId
  }
  return towerOpponents(run.deckId, run.seed)[floor - 1]
}
export const commanderOfDeck = (deckId: string | undefined): string => {
  const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId)
  return (deck && COMMANDER_BY_ID[deck.commanderId]?.name) ?? '—'
}
export const towerMaxHealth = (deckId: string): number => {
  const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId)
  return (deck && COMMANDER_BY_ID[deck.commanderId]?.nexusHealth) ?? 35
}
export const towerGuardian = (run: TowerRun): boolean =>
  towerVariant(run) !== 'classic' &&
  (run.floor === towerFloorCount(run) ||
    (towerVariant(run) === 'paths' &&
      (run.floor % 3 === 0 || run.routes?.[run.floor] === 'sentinel')))
export const towerCanEnter = (run: TowerRun): boolean =>
  !run.awaitingBlessing && !run.awaitingEncounter && Boolean(opponentForFloor(run, run.floor))
export const towerBattleSetup = (run: TowerRun, playerCommanderId?: string): MatchSetup => {
  const enemy = opponentForFloor(run, run.floor)
  const guardianHealth = towerGuardian(run) ? 8 : 0
  const relicPenalty = run.relics?.includes('ember') ? 3 : 0
  return {
    playerNexusHealth: run.health,
    aiNexusHealth: Math.max(
      1,
      towerMaxHealth(enemy ?? run.deckId) + guardianHealth - run.enemyPenalty - relicPenalty,
    ),
    playerCommanderId,
  }
}
export const towerMatchKey = (run: TowerRun): string =>
  `${run.seed}:${towerVariant(run)}:${run.floor}`
export const towerMatchIsPrepared = (match: MatchState, run: TowerRun): boolean =>
  (match as MatchState & { readonly towerPreparation?: string }).towerPreparation ===
  towerMatchKey(run)

/** La marca viaja en el guardado de partida: recargar no roba otra carta ni crea otra fuente. */
export const prepareTowerMatch = (match: MatchState, run: TowerRun): MatchState => {
  const stamp = towerMatchKey(run)
  if (towerMatchIsPrepared(match, run)) return match
  if (towerVariant(run) === 'classic') {
    const result: MatchState & { readonly towerPreparation: string } = {
      ...match,
      towerPreparation: stamp,
    }
    return result
  }
  const player = match.players.player
  const extra = run.relics?.includes('quill') ? player.deck[0] : undefined
  const ai = match.players.ai
  const source = towerGuardian(run)
    ? ai.deck.find((instance) => CARD_BY_ID[instance.cardId]?.type === 'mana')
    : undefined
  const sourceCard = source ? CARD_BY_ID[source.cardId] : undefined
  const result: MatchState & { readonly towerPreparation: string } = {
    ...match,
    towerPreparation: stamp,
    players: {
      player: extra
        ? { ...player, hand: [...player.hand, extra], deck: player.deck.slice(1) }
        : player,
      ai:
        source && sourceCard
          ? {
              ...ai,
              deck: ai.deck.filter((card) => card.instanceId !== source.instanceId),
              resources: [
                ...ai.resources,
                { ...source, faction: sourceCard.faction, exhausted: false },
              ],
            }
          : ai,
    },
  }
  return result
}
export const towerEncounter = (run: TowerRun) => {
  const stories = [
    {
      name: 'El refugio de las voces',
      description:
        'Una cronista guarda las brasas de quienes no alcanzaron la cima. A cambio de una herida, te ofrece una de sus reliquias.',
    },
    {
      name: 'El puente del peregrino',
      description:
        'Un caminante te muestra tres pasos entre los mundos: descanso, poder o el rastro de tu próximo rival.',
    },
    {
      name: 'La cámara del eco',
      description:
        'En el agua inmóvil ves al guardián que te espera. Puedes recuperar fuerzas, reclamar un tesoro o debilitar su vínculo.',
    },
  ] as const
  return stories[((run.seed >>> 0) + run.floor) % stories.length]!
}
const RELIC_IDS = Object.keys(TOWER_RELICS) as TowerRelicId[]
export const nextTowerRelic = (run: TowerRun): TowerRelicId | undefined => {
  const missing = RELIC_IDS.filter((id) => !run.relics?.includes(id))
  return missing[((run.seed >>> 0) + run.floor) % missing.length]
}
export const useTower = create<TowerState>()(
  persist(
    (set) => ({
      run: undefined,
      best: 0,
      variantBest: {},
      lastRun: undefined,
      start: (deckId, seed, variant = 'classic') =>
        set((current) => {
          if (!STARTER_DECKS.some((deck) => deck.id === deckId) || current.run) return current
          return {
            run: {
              deckId,
              floor: 1,
              health: towerMaxHealth(deckId),
              enemyPenalty: 0,
              seed: seed ?? Date.now() >>> 0,
              defeated: [],
              awaitingBlessing: false,
              variant,
              routes: {},
              relics: [],
              encounters: [],
            },
            lastRun: undefined,
          }
        }),
      finishFloor: (won, healthLeft) =>
        set((current) => {
          const run = current.run
          if (!run || run.awaitingBlessing || run.awaitingEncounter || !towerCanEnter(run))
            return current
          const variant = towerVariant(run)
          const total = towerFloorCount(run)
          const reached = won ? run.floor : run.floor - 1
          const best = variant === 'classic' ? Math.max(current.best, reached) : current.best
          const variantBest = {
            ...current.variantBest,
            [variant]: Math.max(current.variantBest?.[variant] ?? 0, reached),
          }
          if (!won || run.floor >= total)
            return {
              run: undefined,
              best,
              variantBest,
              lastRun: {
                variant,
                won,
                floors: reached,
                total,
                relics: run.relics ?? [],
                seed: run.seed,
              },
            }
          const opponent = opponentForFloor(run, run.floor)
          const relic = towerGuardian(run) ? nextTowerRelic(run) : undefined
          const relics = relic ? [...(run.relics ?? []), relic] : (run.relics ?? [])
          const heal = relics.includes('lantern') ? 3 : 0
          return {
            best,
            variantBest,
            run: {
              ...run,
              health: Math.min(
                towerMaxHealth(run.deckId),
                Math.max(1, Math.trunc(healthLeft)) + heal,
              ),
              defeated: opponent ? [...run.defeated, opponent] : run.defeated,
              enemyPenalty: 0,
              relics,
              awaitingEncounter: variant !== 'classic',
              awaitingBlessing: variant === 'classic',
            },
          }
        }),
      chooseBlessing: (id) =>
        set((current) => {
          const run = current.run
          if (!run || !run.awaitingBlessing || run.awaitingEncounter || !BLESSINGS[id])
            return current
          const { heal, enemyPenalty } = blessingEffect(id)
          return {
            run: {
              ...run,
              floor: run.floor + 1,
              health: Math.min(towerMaxHealth(run.deckId), run.health + heal),
              enemyPenalty: run.enemyPenalty + enemyPenalty,
              awaitingBlessing: false,
            },
          }
        }),
      chooseRoute: (id) =>
        set((current) => {
          const run = current.run
          if (
            !run ||
            run.awaitingBlessing ||
            run.awaitingEncounter ||
            run.routes?.[run.floor] ||
            !towerRoutes(run).some((route) => route.id === id)
          )
            return current
          return { run: { ...run, routes: { ...run.routes, [run.floor]: id } } }
        }),
      chooseEncounter: (id) =>
        set((current) => {
          const run = current.run
          if (!run || !run.awaitingEncounter || run.awaitingBlessing) return current
          const relic = id === 'relic' ? nextTowerRelic(run) : undefined
          if (id === 'relic' && (run.health <= 5 || !relic)) return current
          if (!['heal', 'relic', 'scout'].includes(id)) return current
          return {
            run: {
              ...run,
              health:
                id === 'heal'
                  ? Math.min(towerMaxHealth(run.deckId), run.health + 6)
                  : id === 'relic'
                    ? run.health - 5
                    : run.health,
              relics: relic ? [...(run.relics ?? []), relic] : run.relics,
              enemyPenalty: id === 'scout' ? run.enemyPenalty + 5 : run.enemyPenalty,
              encounters: [...(run.encounters ?? []), { floor: run.floor, choice: id }],
              awaitingEncounter: false,
              awaitingBlessing: true,
            },
          }
        }),
      abandon: () =>
        set((current) => ({
          run: undefined,
          lastRun: current.run
            ? {
                variant: towerVariant(current.run),
                won: false,
                floors: current.run.defeated.length,
                total: towerFloorCount(current.run),
                relics: current.run.relics ?? [],
                seed: current.run.seed,
              }
            : current.lastRun,
        })),
    }),
    { name: 'cronicas-nexo-tower', version: 1 },
  ),
)
