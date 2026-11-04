import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, COMMANDERS } from '../game'
import { CARD_GLOSSARY } from './GlossaryText'
import { glossaryEntriesIn, glossaryIdsWithoutIdentity } from './keywordIdentity'

describe('identidad de términos', () => {
  it('todo término del glosario tiene icono y color propios', () => {
    expect(glossaryIdsWithoutIdentity()).toEqual([])
  })

  it('encuentra los términos de un texto en orden y sin repetir', () => {
    const ids = glossaryEntriesIn('Petardazo. Cuando es destruido, inflige 4 de daño a las unidades adyacentes. Petardazo.').map((entry) => entry.id)
    expect(ids).toEqual(['petardazo', 'adyacencia'])
  })

  /**
   * Las palabras clave que abren una regla («Petardazo.», «Formación:») son
   * las que el jugador necesita entender. Antes Petardazo salía en cinco
   * cartas y en un poder de comandante sin explicación en ningún sitio.
   */
  it('las palabras clave de facción que usan las cartas están en el glosario', () => {
    const texts = [...Object.values(CARD_BY_ID).map((card) => card.rules), ...COMMANDERS.map((commander) => commander.power.description)].join('\n')
    const known = new Set(CARD_GLOSSARY.map((entry) => entry.id))
    for (const term of ['Petardazo', 'Formación', 'Descarga', 'Canto', 'Golpe veloz', 'Chispa']) {
      if (!texts.includes(term)) continue
      const found = glossaryEntriesIn(term).map((entry) => entry.id)
      expect(found.length, term).toBeGreaterThan(0)
      expect(known.has(found[0]!), term).toBe(true)
    }
  })
})
