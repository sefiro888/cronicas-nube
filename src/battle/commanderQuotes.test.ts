import { describe, expect, it } from 'vitest'
import { FACTION_IDS } from '../game'
import { FACTION_QUOTES, quoteFor } from './commanderQuotes'

describe('frases de los comandantes', () => {
  it('cada facción tiene al menos dos frases por momento', () => {
    for (const faction of FACTION_IDS) {
      for (const moment of ['power', 'hurt', 'win'] as const) {
        expect(FACTION_QUOTES[faction][moment].length, `${faction} ${moment}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('el mismo evento elige siempre la misma frase', () => {
    expect(quoteFor('goblins', 'power', 'event-12')).toBe(quoteFor('goblins', 'power', 'event-12'))
  })
})
