import { describe, expect, it } from 'vitest'
import { CARD_BY_ID } from './cards'
import { STARTER_DECKS } from './decks'
import { applyAction } from './engine'
import {
  addLaboratoryCard,
  addLaboratoryResource,
  createLaboratoryMatch,
  rechargeLaboratoryResources,
} from './adventureLaboratory'

describe('laboratorio aislado del juego normal', () => {
  const create = () => createLaboratoryMatch(STARTER_DECKS[0]!.id, STARTER_DECKS[1]!.id, 3)
  it('prepara ambos bandos reproducibles con seis fuentes y el turno se cede por reglas', () => {
    const match = create()
    expect(match).toEqual(create())
    expect(match.players.player.resources).toHaveLength(6)
    expect(match.players.ai.resources).toHaveLength(6)
    const passed = applyAction(match, { type: 'end-turn', playerId: 'player' })
    expect(passed.ok).toBe(true)
    expect(passed.state.activePlayer).toBe('ai')
    expect(passed.state.players.ai.mulliganTaken).toBe(true)
  })
  it('añade material solo al bando pedido y no modifica la plantilla previa', () => {
    const base = create()
    const card = Object.values(CARD_BY_ID).find((entry) => entry.type === 'unit')!
    const added = addLaboratoryCard(base, 'ai', card.id)
    const resourced = addLaboratoryResource(added, 'ai', card.faction)
    expect(base.players.ai.hand).toHaveLength(10)
    expect(resourced.players.ai.hand).toHaveLength(11)
    expect(resourced.players.player).toBe(base.players.player)
    const ids = [...resourced.players.ai.hand, ...resourced.players.ai.resources].map(
      (entry) => entry.instanceId,
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(addLaboratoryCard(base, 'player', 'no-existe')).toBe(base)
  })
  it('recargar fuentes no habilita una acción fuera de turno', () => {
    const base = create()
    const recharged = rechargeLaboratoryResources(base, 'ai')
    expect(recharged.players.ai.resources.every((source) => !source.exhausted)).toBe(true)
    const resource = base.players.ai.hand.find(
      (instance) => CARD_BY_ID[instance.cardId]?.type === 'mana',
    )!
    expect(
      applyAction(recharged, {
        type: 'play-resource',
        playerId: 'ai',
        cardInstanceId: resource.instanceId,
      }).ok,
    ).toBe(false)
  })
})
