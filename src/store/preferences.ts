import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PresentationPace } from '../battle/presentation'

export type GraphicsQuality = 'low' | 'medium' | 'high'
/**
 * 'auto' no es un escenario: es «el que le pegue a mi facción», y lo resuelve
 * `resolveScenario`. Vive aquí y no como un ajuste aparte para que el selector
 * siga siendo una sola lista.
 */
export type ScenarioId = 'auto' | 'aether-citadel' | 'sanctuary' | 'caldera' | 'duna' | 'fimbul' | 'grove' | 'shore' | 'foundry' | 'jade-court' | 'wheel-ghat' | 'solar-court' | 'bestiary-ravine'
  | 'bastion-alba' | 'acropolis-olimpo' | 'baluarte-tercios' | 'umbral-vacio' | 'cripta-plaga' | 'desguace-goblin' | 'lago-kalevala'
export type AiDifficulty = 'easy' | 'normal' | 'hard'

export interface PreferencesState {
  masterVolume: number
  musicVolume: number
  effectsVolume: number
  muted: boolean
  reducedMotion: boolean
  aiDelayMs: number
  aiDifficulty: AiDifficulty
  selectedDeckId: string
  /**
   * Mazo del rival en las escaramuzas contra la IA. 'random' conserva el
   * comportamiento de siempre (lo elige la semilla entre las otras cinco
   * facciones); cualquier otro valor fija contra quién quieres pelear.
   */
  opponentDeckId: string
  /**
   * Comandante elegido para cada mazo, por id de mazo. Cada facción tiene dos
   * líderes y la pasiva cambia cómo se juega la misma lista de cartas; sin
   * esto no habría forma de usar los alternativos. Los mazos que no aparezcan
   * usan el comandante de siempre.
   */
  commanderByDeck: Readonly<Record<string, string>>
  graphicsQuality: GraphicsQuality
  /** Escenario 3D de la batalla. */
  scenario: ScenarioId
  /** Multiplicador de velocidad de las animaciones de partida (1 = normal). */
  animationSpeed: 1 | 1.5 | 2
  /**
   * Cuánto se detiene la partida para enseñar lo que ocurre: cartas lanzadas
   * en grande y golpes a cámara lenta. Va aparte de `animationSpeed` porque
   * decide QUÉ se presenta, no solo a qué velocidad corre.
   */
  presentationPace: PresentationPace
  /**
   * Sustituye el verde de "casilla de despliegue" por ámbar. El rojo de
   * "casilla amenazada" (una unidad rival ya la alcanza) puede aparecer en
   * el tablero a la vez que el verde de despliegue, en casillas distintas
   * pero visibles juntas — justo el par rojo/verde más difícil de
   * distinguir para el daltonismo más común (deuteranopia/protanopia). El
   * resto de colores del tablero (azul de mover, dorado de objetivo) ya no
   * chocan entre sí.
   */
  colorblindMode: boolean
  /** Escala del texto sobre las cartas del tablero (nombre, ATQ/VID, estados). 1 = tamaño original. */
  boardTextScale: 1 | 1.2 | 1.4
  /**
   * Avisar al ceder el turno si quedan acciones sin usar (unidades sin mover,
   * cartas jugables, la fuente de Esencia del turno sin jugar). Pide una
   * segunda pulsación; quien juega rápido y sabe lo que hace puede apagarlo.
   */
  confirmEndTurn: boolean
  setVolume: (channel: 'masterVolume' | 'musicVolume' | 'effectsVolume', value: number) => void
  setMuted: (muted: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  setAiDelay: (delay: number) => void
  setAiDifficulty: (difficulty: AiDifficulty) => void
  setSelectedDeck: (deckId: string) => void
  setOpponentDeck: (deckId: string) => void
  setCommander: (deckId: string, commanderId: string) => void
  setGraphicsQuality: (quality: GraphicsQuality) => void
  setScenario: (scenario: ScenarioId) => void
  setAnimationSpeed: (speed: 1 | 1.5 | 2) => void
  setPresentationPace: (pace: PresentationPace) => void
  setColorblindMode: (enabled: boolean) => void
  setBoardTextScale: (scale: 1 | 1.2 | 1.4) => void
  setConfirmEndTurn: (enabled: boolean) => void
  reset: () => void
}

const defaults = {
  masterVolume: 0.75,
  musicVolume: 0.35,
  effectsVolume: 0.7,
  muted: false,
  reducedMotion: false,
  aiDelayMs: 520,
  aiDifficulty: 'normal' as AiDifficulty,
  selectedDeckId: 'furia-caldera',
  opponentDeckId: 'random',
  commanderByDeck: {} as Readonly<Record<string, string>>,
  graphicsQuality: 'medium' as GraphicsQuality,
  scenario: 'auto' as ScenarioId,
  animationSpeed: 1 as const,
  presentationPace: 'cinematic' as PresentationPace,
  colorblindMode: false,
  boardTextScale: 1 as const,
  confirmEndTurn: true,
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      setVolume: (channel, value) => set({ [channel]: Math.max(0, Math.min(1, value)) }),
      setMuted: (muted) => set({ muted }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setAiDelay: (aiDelayMs) => set({ aiDelayMs }),
      setAiDifficulty: (aiDifficulty) => set({ aiDifficulty }),
      setSelectedDeck: (selectedDeckId) => set({ selectedDeckId }),
      setOpponentDeck: (opponentDeckId) => set({ opponentDeckId }),
      setCommander: (deckId, commanderId) =>
        set((state) => ({ commanderByDeck: { ...state.commanderByDeck, [deckId]: commanderId } })),
      setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
      setScenario: (scenario) => set({ scenario }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      setPresentationPace: (presentationPace) => set({ presentationPace }),
      setColorblindMode: (colorblindMode) => set({ colorblindMode }),
      setBoardTextScale: (boardTextScale) => set({ boardTextScale }),
      setConfirmEndTurn: (confirmEndTurn) => set({ confirmEndTurn }),
      reset: () => set(defaults),
    }),
    {
      name: 'cronicas-nexo-preferences',
      version: 7,
      migrate: (persisted) => ({ ...defaults, ...(persisted as Partial<PreferencesState>) }),
    },
  ),
)
