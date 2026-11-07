import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatch, STARTER_DECKS, type AnimationEvent } from '../game'
import { useMatchStore } from '../store/match'
import { useNetworkStore } from '../store/network'
import { useNetworkSync } from './useNetworkSync'
import type { Room, RoomRole } from './room'

function fakeRoom(role: RoomRole) {
  const listeners = new Map<string, (payload: unknown) => void>()
  const send = vi.fn()
  const room: Room = {
    code: 'TESTX', role, send,
    getStatus: () => 'connected', getError: () => undefined,
    onStatusChange: () => () => undefined,
    onMessage: (event, callback) => { listeners.set(event, callback); return () => { listeners.delete(event) } },
    leave: () => undefined,
  }
  return { room, send, receive: (event: string, payload: unknown) => act(() => listeners.get(event)?.(payload)) }
}
const match = () => createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 7701)
const attack: AnimationEvent = { id: 'network-hit', type: 'attack', durationMs: 200, actorId: 'attacker', targetId: 'victim', cardId: 'lobo-salvaje' }
const death: AnimationEvent = { id: 'network-death', type: 'destroy', durationMs: 200, targetId: 'victim', cardId: 'sabueso-brasa' }

beforeEach(() => { useMatchStore.getState().reset(); useNetworkStore.getState().clear() })
afterEach(cleanup)

describe('presentación de partidas en red', () => {
  it('el anfitrión envía los eventos drenados, sin repetir los de jugadas anteriores', () => {
    const initial = match()
    useMatchStore.getState().startFromMatch(initial)
    const { room, send } = fakeRoom('host')
    renderHook(() => useNetworkSync(room, 'host', STARTER_DECKS[0]!.id))
    act(() => useMatchStore.getState().replaceMatch({ ...initial, animations: [attack, death] }))
    const first = send.mock.calls.filter(([event]) => event === 'state').at(-1)![1]
    expect(first.match.animations).toEqual([attack, death])
    expect(first.presentation.lastPlay).toEqual([attack, death])
    act(() => useMatchStore.getState().replaceMatch({ ...initial, turn: 3, animations: [] }))
    expect(send.mock.calls.filter(([event]) => event === 'state').at(-1)![1].match.animations).toEqual([])
  })

  it('el invitado conserva ataque, muerte y repetición y evita eventos duplicados', () => {
    const initial = match()
    useMatchStore.getState().startFromMatch(initial)
    const { room, receive } = fakeRoom('guest')
    renderHook(() => useNetworkSync(room, 'guest', STARTER_DECKS[1]!.id))
    const packet = { match: { ...initial, animations: [attack, death] }, scenario: 'fimbul' }
    receive('state', packet)
    receive('state', packet)
    expect(useMatchStore.getState().pendingAnimations).toEqual([attack, death])
    expect(useMatchStore.getState().lastPlay).toEqual([attack, death])
    expect(useNetworkStore.getState().scenario).toBe('fimbul')
    // Una recuperación de estado conserva la cola local y no vuelve a lanzarla.
    receive('state', { match: { ...initial, animations: [] }, scenario: 'fimbul' })
    expect(useMatchStore.getState().pendingAnimations).toEqual([attack, death])
  })

  it('recupera la última jugada y el registro en una reconexión sin reproducirlos automáticamente', () => {
    const { room, receive } = fakeRoom('guest')
    renderHook(() => useNetworkSync(room, 'guest', STARTER_DECKS[1]!.id))
    receive('state', { match: { ...match(), animations: [] }, presentation: { lastPlay: [attack, death], castImpacts: {}, history: ['Ataque resuelto'], matchLog: [], bestPlay: undefined } })
    expect(useMatchStore.getState().pendingAnimations).toEqual([])
    expect(useMatchStore.getState().lastPlay).toEqual([attack, death])
    expect(useMatchStore.getState().history).toEqual(['Ataque resuelto'])
  })
})
