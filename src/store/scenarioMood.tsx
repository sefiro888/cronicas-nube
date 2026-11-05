import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const SCENARIO_MOODS = ['native', 'dawn', 'dusk', 'moonlight'] as const
export type ScenarioMood = typeof SCENARIO_MOODS[number]
export const SCENARIO_MOOD_LABELS: Readonly<Record<ScenarioMood, string>> = {
  native: 'Luz del mundo', dawn: 'Amanecer', dusk: 'Última luz', moonlight: 'Luna y brasas',
}

export const MOOD_LIGHT = {
  native: { key: 1, fill: 1, ambient: 1, keyColor: undefined, fillColor: undefined },
  dawn: { key: .88, fill: .92, ambient: 1.02, keyColor: '#ffdbb0', fillColor: '#a4c2dc' },
  dusk: { key: .68, fill: .87, ambient: .9, keyColor: '#edb38a', fillColor: '#a9a5d4' },
  moonlight: { key: .42, fill: .97, ambient: .88, keyColor: '#b7d4ed', fillColor: '#8eb0d5' },
} satisfies Record<ScenarioMood, { key: number; fill: number; ambient: number; keyColor: string | undefined; fillColor: string | undefined }>

export const useScenarioMood = create<{ mood: ScenarioMood; setMood: (mood: ScenarioMood) => void }>()(
  persist((set) => ({ mood: 'native', setMood: (mood) => set({ mood }) }), {
    name: 'cronicas-nexo-luz-escenario', version: 1,
    merge: (saved, current) => {
      const candidate = saved && typeof saved === 'object' && 'mood' in saved ? saved.mood : undefined
      return { ...current, mood: SCENARIO_MOODS.includes(candidate as ScenarioMood) ? candidate as ScenarioMood : 'native' }
    },
  }),
)

const PreviewMood = createContext<ScenarioMood | undefined>(undefined)
/** El atlas no debe alterar la partida guardada al explorar una variante. */
export function ScenarioMoodPreview({ mood, children }: { mood: ScenarioMood; children: ReactNode }) {
  return <PreviewMood.Provider value={mood}>{children}</PreviewMood.Provider>
}

export function useScenarioLight() {
  const preview = useContext(PreviewMood)
  const saved = useScenarioMood((state) => state.mood)
  const mood = preview ?? saved
  return useMemo(() => {
    const profile = MOOD_LIGHT[mood]
    return {
      mood,
      key: (native: number) => native * profile.key,
      fill: (native: number) => native * profile.fill,
      ambient: (native: number) => native * profile.ambient,
      keyColor: (native: string) => profile.keyColor ?? native,
      fillColor: (native: string) => profile.fillColor ?? native,
    }
  }, [mood])
}
