import type { ScenarioId } from './preferences'
import { create } from 'zustand'
import type { Room, RoomRole } from '../multiplayer/room'

interface NetworkStore {
  scenario?: ScenarioId
  setScenario: (scenario: ScenarioId) => void
  room?: Room
  role?: RoomRole
  setRoom: (room: Room, role: RoomRole) => void
  clear: () => void
}

/**
 * Sala de multijugador activa (si la hay). Vive fuera de zustand/persist a
 * propósito: un `Room` envuelve un canal de Supabase Realtime, que no tiene
 * sentido serializar ni resucitar tras recargar la página.
 */
export const useNetworkStore = create<NetworkStore>((set) => ({
  scenario: undefined,
  setScenario: (scenario) => set({ scenario }),
  room: undefined,
  role: undefined,
  setRoom: (room, role) => set({ room, role }),
  clear: () => set({ room: undefined, role: undefined, scenario: undefined }),
}))
