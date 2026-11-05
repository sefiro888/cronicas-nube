import { beforeEach, describe, expect, it } from 'vitest'
import { CARD_BY_ID, STARTER_DECKS, createMatch } from '../game'
import {
  TOWER_FLOORS,
  nextTowerRelic,
  opponentForFloor,
  prepareTowerMatch,
  towerBattleSetup,
  towerCanEnter,
  towerFloorCount,
  towerGuardian,
  towerMatchIsPrepared,
  towerMaxHealth,
  towerRoutes,
  useTower,
  type TowerRun,
} from './tower'

const DECK = 'furia-caldera'
beforeEach(() =>
  useTower.setState({ run: undefined, best: 0, variantBest: {}, lastRun: undefined }),
)
const current = (): TowerRun => useTower.getState().run!
const completeInterlude = () => {
  if (current().awaitingEncounter) useTower.getState().chooseEncounter('heal')
  useTower.getState().chooseBlessing('mend')
}

describe('expediciones de Torre', () => {
  it('una partida guardada sin variante sigue siendo clásica', () => {
    const run: TowerRun = {
      deckId: DECK,
      floor: 1,
      health: 20,
      seed: 12,
      enemyPenalty: 0,
      defeated: [],
      awaitingBlessing: false,
    }
    expect(towerFloorCount(run)).toBe(TOWER_FLOORS)
    expect(towerCanEnter(run)).toBe(true)
    expect(towerGuardian(run)).toBe(false)
    expect(towerRoutes(run)).toEqual([])
  })

  it('la partida clásica también queda identificada sin recibir ventajas de las variantes', () => {
    useTower.getState().start(DECK, 12)
    const player = STARTER_DECKS.find((deck) => deck.id === DECK)!
    const rival = STARTER_DECKS.find((deck) => deck.id === opponentForFloor(current(), 1))!
    const original = createMatch(player, rival, 13)
    expect(towerMatchIsPrepared(original, current())).toBe(false)
    const prepared = prepareTowerMatch(original, current())
    expect(prepared.players).toBe(original.players)
    expect(towerMatchIsPrepared(prepared, current())).toBe(true)
    expect(towerMatchIsPrepared(prepared, { ...current(), floor: 2 })).toBe(false)
  })

  it('la expedición breve termina en cinco pisos y no cambia la marca clásica', () => {
    useTower.setState({ best: 12 })
    useTower.getState().start(DECK, 7, 'short')
    expect(towerFloorCount(current())).toBe(5)
    for (let floor = 1; floor <= 5; floor += 1) {
      expect(current().floor).toBe(floor)
      useTower.getState().finishFloor(true, 20)
      if (floor < 5) completeInterlude()
    }
    expect(useTower.getState().run).toBeUndefined()
    expect(useTower.getState().best).toBe(12)
    expect(useTower.getState().variantBest?.short).toBe(5)
    expect(useTower.getState().lastRun).toMatchObject({ won: true, total: 5, variant: 'short' })
  })

  it('no permite saltarse la bifurcación ni cambiar una ruta ya elegida', () => {
    useTower.getState().start(DECK, 7, 'paths')
    expect(towerCanEnter(current())).toBe(false)
    useTower.getState().finishFloor(true, 25)
    expect(current().defeated).toHaveLength(0)
    const options = towerRoutes(current())
    expect(options).toHaveLength(2)
    expect(options[0]!.deckId).not.toBe(options[1]!.deckId)
    useTower.getState().chooseRoute('passage')
    const rival = opponentForFloor(current(), 1)
    expect(rival).toBe(options[0]!.deckId)
    useTower.getState().chooseRoute('sentinel')
    expect(opponentForFloor(current(), 1)).toBe(rival)
    expect(towerCanEnter(current())).toBe(true)
  })

  it('las rutas no repiten rivales y conservan el rival de cada piso ya conquistado', () => {
    useTower.getState().start(DECK, 19, 'paths')
    const rivals: string[] = []
    for (let floor = 1; floor < 9; floor += 1) {
      useTower.getState().chooseRoute('passage')
      rivals.push(opponentForFloor(current(), floor)!)
      useTower.getState().finishFloor(true, 25)
      completeInterlude()
      expect(opponentForFloor(current(), floor)).toBe(rivals[floor - 1])
    }
    expect(new Set(rivals).size).toBe(8)
    expect(opponentForFloor(current(), 9)).toBe(DECK)
    expect(towerGuardian(current())).toBe(true)
  })

  it('un centinela entrega una reliquia única y una victoria repetida no duplica premios', () => {
    useTower.getState().start(DECK, 7, 'paths')
    useTower.getState().chooseRoute('sentinel')
    expect(towerGuardian(current())).toBe(true)
    useTower.getState().finishFloor(true, 20)
    expect(current().relics).toHaveLength(1)
    expect(current().awaitingEncounter).toBe(true)
    useTower.getState().finishFloor(true, 20)
    expect(current().relics).toHaveLength(1)
    expect(current().defeated).toHaveLength(1)
  })

  it('un encuentro bloquea la batalla y no puede resolverse dos veces', () => {
    useTower.getState().start(DECK, 8, 'short')
    useTower.getState().finishFloor(true, 15)
    expect(towerCanEnter(current())).toBe(false)
    useTower.getState().chooseBlessing('mend')
    expect(current().floor).toBe(1)
    useTower.getState().chooseEncounter('heal')
    expect(current().health).toBe(21)
    useTower.getState().chooseEncounter('heal')
    expect(current().health).toBe(21)
    expect(current().encounters).toHaveLength(1)
    expect(current().awaitingBlessing).toBe(true)
    useTower.getState().chooseBlessing('mend')
    expect(current().floor).toBe(2)
    expect(towerCanEnter(current())).toBe(true)
  })

  it('el precio de una reliquia nunca puede matar al jugador', () => {
    useTower.getState().start(DECK, 8, 'short')
    useTower.getState().finishFloor(true, 5)
    useTower.getState().chooseEncounter('relic')
    expect(current().health).toBe(5)
    expect(current().awaitingEncounter).toBe(true)
    useTower.getState().chooseEncounter('scout')
    useTower.getState().chooseBlessing('surge')
    expect(current().enemyPenalty).toBe(9)
  })

  it('las reliquias no se repiten y las curas respetan el máximo', () => {
    useTower.getState().start(DECK, 2, 'short')
    useTower.setState({ run: { ...current(), relics: ['ember', 'lantern', 'quill'] } })
    expect(nextTowerRelic(current())).toBeUndefined()
    useTower.getState().finishFloor(true, towerMaxHealth(DECK) - 1)
    expect(current().health).toBe(towerMaxHealth(DECK))
    useTower.getState().chooseEncounter('relic')
    expect(current().awaitingEncounter).toBe(true)
  })

  it('el setup usa el máximo del rival y anuncia ventajas reales de guardián', () => {
    useTower.getState().start(DECK, 2, 'paths')
    useTower.getState().chooseRoute('sentinel')
    const rival = opponentForFloor(current(), 1)!
    useTower.setState({ run: { ...current(), enemyPenalty: 4, relics: ['ember'] } })
    expect(towerBattleSetup(current()).aiNexusHealth).toBe(towerMaxHealth(rival) + 8 - 4 - 3)
    expect(towerBattleSetup(current()).playerNexusHealth).toBe(current().health)
  })

  it('la preparación mueve cartas del mazo, no las duplica, y es idempotente tras serializar', () => {
    useTower.getState().start(DECK, 12, 'paths')
    useTower.getState().chooseRoute('sentinel')
    useTower.setState({ run: { ...current(), relics: ['quill'] } })
    const player = STARTER_DECKS.find((deck) => deck.id === DECK)!
    const rival = STARTER_DECKS.find((deck) => deck.id === opponentForFloor(current(), 1))!
    const match = createMatch(player, rival, 13)
    const result = prepareTowerMatch(match, current())
    expect(result.players.player.hand.length).toBe(match.players.player.hand.length + 1)
    expect(result.players.player.deck.length).toBe(match.players.player.deck.length - 1)
    expect(result.players.ai.resources).toHaveLength(1)
    expect(CARD_BY_ID[result.players.ai.resources[0]!.cardId]?.type).toBe('mana')
    const allAI = [
      ...result.players.ai.deck,
      ...result.players.ai.hand,
      ...result.players.ai.resources,
    ]
    expect(new Set(allAI.map((card) => card.instanceId)).size).toBe(allAI.length)
    const persisted = JSON.parse(JSON.stringify(result)) as typeof result
    expect(prepareTowerMatch(persisted, current())).toBe(persisted)
    expect(prepareTowerMatch(persisted, current()).players.player.hand.length).toBe(
      result.players.player.hand.length,
    )
  })

  it('la variante queda guardada con sus decisiones y una pérdida termina la expedición', () => {
    useTower.getState().start(DECK, 43, 'paths')
    useTower.getState().chooseRoute('sentinel')
    const saved = JSON.parse(localStorage.getItem('cronicas-nexo-tower')!).state as {
      run: TowerRun
    }
    expect(saved.run.variant).toBe('paths')
    expect(saved.run.routes?.[1]).toBe('sentinel')
    useTower.getState().finishFloor(false, 0)
    expect(useTower.getState().run).toBeUndefined()
    expect(useTower.getState().lastRun?.won).toBe(false)
  })
})
