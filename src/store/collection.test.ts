import { beforeEach, describe, expect, it } from 'vitest'
import { CARD_BY_ID } from '../game'
import { PACK_SIZE, rollPack, useCollection } from './collection'
import { activeTitle, streakLevel, unlockedFrames } from './profile'
import type { Achievement } from './achievements'

describe('sobres', () => {
  beforeEach(() => useCollection.setState({ packs: 0, opened: 0, owned: {} }))

  it('un sobre tiene cinco cartas, sin fuentes, y la mítica solo puede ir al final', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      const pack = rollPack(seed)
      expect(pack).toHaveLength(PACK_SIZE)
      pack.forEach((entry, index) => {
        const card = CARD_BY_ID[entry.cardId]!
        expect(card.type).not.toBe('mana')
        if (index < PACK_SIZE - 1) expect(card.rarity).not.toBe('mythic')
      })
    }
  })

  it('la misma semilla da el mismo sobre', () => {
    expect(rollPack(42)).toEqual(rollPack(42))
  })

  it('abrir un sobre lo gasta y llena el álbum; sin sobres no se abre', () => {
    expect(useCollection.getState().openPack(7)).toBeUndefined()
    useCollection.getState().grantPack()
    const cards = useCollection.getState().openPack(7)!
    expect(cards).toHaveLength(PACK_SIZE)
    expect(useCollection.getState().packs).toBe(0)
    expect(cards[0]!.isNew).toBe(true)
    expect(Object.values(useCollection.getState().owned).reduce((sum, entry) => sum + entry.count, 0)).toBe(PACK_SIZE)
  })
})

describe('perfil', () => {
  const achievement = (id: string, unlocked: boolean): Achievement => ({ id, name: id, description: '', icon: '', unlocked, progress: unlocked ? 1 : 0 })

  it('un título bloqueado cae al de siempre y los marcos siguen a los logros', () => {
    expect(activeTitle('leyenda', [achievement('racha-legendaria', false)]).id).toBe('aspirante')
    expect(activeTitle('leyenda', [achievement('racha-legendaria', true)]).id).toBe('leyenda')
    expect(unlockedFrames([achievement('racha', true)]).map((frame) => frame.id)).toEqual(['bronce', 'llamas'])
  })

  it('el emblema de racha crece a las 1, 3, 5 y 10 victorias', () => {
    expect([0, 1, 3, 5, 10].map(streakLevel)).toEqual([0, 1, 2, 3, 4])
  })
})
