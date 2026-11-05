import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STARTER_DECKS } from '../game/decks'
import { deriveSeed } from '../game/random'
import type { FactionId, MatchState, PlayerId } from '../game/types'
import {
  bossById,
  campaignChapters,
  createAdventureMatch,
  resolveBossAction,
  type AdventureKind,
  type BossId,
} from '../game/adventure'

export interface AdventureRun {
  readonly id: number
  readonly kind: AdventureKind
  readonly playerDeckId: string
  readonly opponentDeckId: string
  readonly faction: FactionId
  readonly seed: number
  readonly chapter: number
  readonly round: number
  readonly attempt: number
  readonly wins: number
  readonly losses: number
  readonly status: 'ready' | 'fighting' | 'won' | 'lost' | 'complete'
  readonly bossId?: BossId
  readonly bossPhase: 1 | 2
  readonly battleSeed?: number
}
interface AdventureState {
  run?: AdventureRun
  campaignProgress: Readonly<Partial<Record<FactionId, number>>>
  sessionCounter: number
  startCampaign: (deckId: string, chapter?: number, seed?: number) => void
  startBoss: (deckId: string, bossId: BossId, seed?: number) => void
  startSeries: (deckId: string, opponentDeckId: string, seed?: number) => void
  prepareBattle: () => MatchState | undefined
  resolveAction: (before: MatchState, after: MatchState) => MatchState
  reportResult: (seed: number, winner: PlayerId) => void
  advance: () => void
  retry: () => void
  abandon: () => void
}
const validDeck = (id: string) => STARTER_DECKS.find((deck) => deck.id === id)
const createRun = (
  id: number,
  kind: AdventureKind,
  deckId: string,
  opponentDeckId: string,
  seed: number,
): AdventureRun => ({
  id,
  kind,
  playerDeckId: deckId,
  opponentDeckId,
  faction: validDeck(deckId)!.faction,
  seed: seed >>> 0,
  chapter: 0,
  round: 1,
  attempt: 0,
  wins: 0,
  losses: 0,
  status: 'ready',
  bossPhase: 1,
})

export const useAdventure = create<AdventureState>()(
  persist(
    (set, get) => ({
      run: undefined,
      campaignProgress: {},
      sessionCounter: 0,
      startCampaign: (deckId, chapter = 0, seed = Date.now()) => {
        const deck = validDeck(deckId)
        if (!deck) return
        const accessible = Math.min(2, get().campaignProgress[deck.faction] ?? 0)
        const chosen = Math.min(accessible, Math.max(0, Math.trunc(chapter)))
        const story = campaignChapters(deck.faction)[chosen]!
        const id = get().sessionCounter + 1
        set({
          sessionCounter: id,
          run: {
            ...createRun(id, 'campaign', deckId, story.opponentDeckId, seed),
            chapter: chosen,
            bossId: story.bossId,
          },
        })
      },
      startBoss: (deckId, bossId, seed = Date.now()) => {
        const boss = bossById(bossId)
        const opponent = STARTER_DECKS.find((deck) => deck.faction === boss?.faction)
        if (!validDeck(deckId) || !boss || !opponent) return
        const id = get().sessionCounter + 1
        set({
          sessionCounter: id,
          run: { ...createRun(id, 'boss', deckId, opponent.id, seed), bossId },
        })
      },
      startSeries: (deckId, opponentDeckId, seed = Date.now()) => {
        if (!validDeck(deckId) || !validDeck(opponentDeckId)) return
        const id = get().sessionCounter + 1
        set({ sessionCounter: id, run: createRun(id, 'series', deckId, opponentDeckId, seed) })
      },
      prepareBattle: () => {
        const run = get().run
        if (!run || (run.status !== 'ready' && run.status !== 'fighting')) return undefined
        const seed = deriveSeed(
          run.seed,
          run.id * 101 + run.round * 7 + run.chapter * 31 + run.attempt * 503,
        )
        const match = createAdventureMatch({
          playerDeckId: run.playerDeckId,
          opponentDeckId: run.opponentDeckId,
          seed,
          bossId: run.bossId,
        })
        set({ run: { ...run, status: 'fighting', battleSeed: match.seed, bossPhase: 1 } })
        return match
      },
      resolveAction: (before, after) => {
        const run = get().run
        if (
          !run ||
          run.status !== 'fighting' ||
          run.battleSeed !== before.seed ||
          before.seed !== after.seed
        )
          return after
        const boss = bossById(run.bossId)
        if (!boss) return after
        const result = resolveBossAction(before, after, boss, run.bossPhase)
        if (result.phase !== run.bossPhase) set({ run: { ...run, bossPhase: result.phase } })
        return result.state
      },
      reportResult: (seed, winner) => {
        const run = get().run
        if (!run || run.status !== 'fighting' || run.battleSeed !== seed) return
        const won = winner === 'player'
        if (run.kind === 'series') {
          const wins = run.wins + Number(won)
          const losses = run.losses + Number(!won)
          set({
            run: {
              ...run,
              wins,
              losses,
              status: wins >= 2 || losses >= 2 ? 'complete' : won ? 'won' : 'lost',
            },
          })
          return
        }
        const campaignProgress =
          run.kind === 'campaign' && won
            ? {
                ...get().campaignProgress,
                [run.faction]: Math.max(get().campaignProgress[run.faction] ?? 0, run.chapter + 1),
              }
            : get().campaignProgress
        set({
          campaignProgress,
          run: {
            ...run,
            status: won ? (run.kind === 'boss' || run.chapter >= 2 ? 'complete' : 'won') : 'lost',
            wins: run.wins + Number(won),
            losses: run.losses + Number(!won),
          },
        })
      },
      advance: () => {
        const run = get().run
        if (!run) return
        if (run.kind === 'series' && (run.status === 'won' || run.status === 'lost'))
          set({
            run: {
              ...run,
              round: run.round + 1,
              status: 'ready',
              battleSeed: undefined,
              bossPhase: 1,
            },
          })
        if (run.kind === 'campaign' && run.status === 'won' && run.chapter < 2) {
          const chapter = run.chapter + 1
          const next = campaignChapters(run.faction)[chapter]!
          set({
            run: {
              ...run,
              chapter,
              opponentDeckId: next.opponentDeckId,
              bossId: next.bossId,
              status: 'ready',
              battleSeed: undefined,
              bossPhase: 1,
              attempt: 0,
            },
          })
        }
      },
      retry: () => {
        const run = get().run
        if (!run || run.status !== 'lost' || run.kind === 'series') return
        set({
          run: {
            ...run,
            status: 'ready',
            battleSeed: undefined,
            bossPhase: 1,
            attempt: run.attempt + 1,
          },
        })
      },
      abandon: () => set({ run: undefined }),
    }),
    { name: 'cronicas-nexo-adventures', version: 1 },
  ),
)

/** Llamar solo desde una partida local con ?adventure=1, antes de drenar sus eventos. */
export const resolveAdventureAction = (before: MatchState, after: MatchState): MatchState =>
  useAdventure.getState().resolveAction(before, after)
