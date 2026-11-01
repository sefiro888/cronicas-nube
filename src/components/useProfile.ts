import { useMemo } from 'react'
import { STARTER_DECKS, commanderForDeck, type CommanderDefinition } from '../game'
import { evaluateAchievements } from '../store/achievements'
import { useCollection } from '../store/collection'
import { usePreferences } from '../store/preferences'
import { activeFrame, activeTitle } from '../store/profile'
import { currentStreak, useRecords } from '../store/records'

/** Perfil visible del jugador: comandante del mazo elegido, título, marco y racha. */
export const useProfile = (): {
  readonly commander?: CommanderDefinition
  readonly title: ReturnType<typeof activeTitle>
  readonly frame: ReturnType<typeof activeFrame>
  readonly streak: number
  readonly achievements: ReturnType<typeof evaluateAchievements>
} => {
  const records = useRecords((state) => state.records)
  const titleId = useCollection((state) => state.titleId)
  const frameId = useCollection((state) => state.frameId)
  const deckId = usePreferences((state) => state.selectedDeckId)
  const commanderByDeck = usePreferences((state) => state.commanderByDeck)
  return useMemo(() => {
    const achievements = evaluateAchievements(records)
    const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId)
    return {
      commander: deck ? commanderForDeck(deck, commanderByDeck[deck.id]) : undefined,
      title: activeTitle(titleId, achievements),
      frame: activeFrame(frameId, achievements),
      streak: Math.max(0, currentStreak(records)),
      achievements,
    }
  }, [records, titleId, frameId, deckId, commanderByDeck])
}
