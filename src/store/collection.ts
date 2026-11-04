import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CARD_BY_ID, nextRandom, type CardDefinition, type Rarity } from '../game'

/**
 * Colección de cartas y perfil del jugador.
 *
 * Los sobres son una recompensa de COLECCIÓN: se gana uno por victoria y lo
 * que sale va al álbum (con sus copias doradas), pero no cambia qué cartas se
 * pueden jugar ni los mazos. Así se añade progresión sin tocar el
 * equilibrio, que el propietario pidió no cambiar.
 *
 * El perfil guarda el título y el marco que el jugador luce (ver profile.ts);
 * se desbloquean con los logros que ya existían.
 */
export interface OwnedCard {
  readonly count: number
  readonly foils: number
}

export interface PackCard {
  readonly cardId: string
  readonly foil: boolean
  /** Primera copia de esa carta en el álbum. */
  readonly isNew: boolean
}

interface CollectionState {
  /** Sobres ganados y aún sin abrir. */
  packs: number
  /** Sobres abiertos en total (para el álbum y futuras recompensas). */
  opened: number
  owned: Readonly<Record<string, OwnedCard>>
  titleId?: string
  frameId?: string
  grantPack: (amount?: number) => void
  /** Abre un sobre: lo descuenta, añade las cartas al álbum y las devuelve en orden de revelado. */
  openPack: (seed: number) => readonly PackCard[] | undefined
  setTitle: (titleId?: string) => void
  setFrame: (frameId?: string) => void
}

/** Cartas que pueden salir: las que se pueden coleccionar (no fuentes de Esencia). */
const POOL = (): readonly CardDefinition[] => Object.values(CARD_BY_ID).filter((card) => card.type !== 'mana' && card.unlocked !== false)

const byRarity = (rarity: Rarity) => POOL().filter((card) => card.rarity === rarity)

/** Probabilidad de que una carta salga dorada. */
export const FOIL_CHANCE = 0.08
/** Probabilidad de que la última carta, la rara, sea mítica. */
export const MYTHIC_CHANCE = 0.22
export const PACK_SIZE = 5

/**
 * Las cinco cartas de un sobre, de menos a más rara para que el revelado
 * vaya a más: tres comunes o poco comunes, una poco común o rara y una rara
 * que puede ser mítica. Determinista con la semilla, para poder probarlo.
 */
export const rollPack = (seed: number): readonly { readonly cardId: string; readonly foil: boolean }[] => {
  let state = seed >>> 0 || 1
  const roll = () => {
    const next = nextRandom(state)
    state = next.state
    return next.value
  }
  const pick = (list: readonly CardDefinition[]) => list[Math.floor(roll() * list.length)] ?? POOL()[0]!
  const slots: Rarity[] = [
    roll() < 0.75 ? 'common' : 'uncommon',
    roll() < 0.7 ? 'common' : 'uncommon',
    roll() < 0.6 ? 'common' : 'uncommon',
    roll() < 0.65 ? 'uncommon' : 'rare',
    roll() < MYTHIC_CHANCE ? 'mythic' : 'rare',
  ]
  return slots.map((rarity) => {
    const options = byRarity(rarity)
    const card = pick(options.length > 0 ? options : POOL())
    return { cardId: card.id, foil: roll() < FOIL_CHANCE }
  })
}

export const useCollection = create<CollectionState>()(
  persist(
    (set, get) => ({
      packs: 0,
      opened: 0,
      owned: {},
      titleId: undefined,
      frameId: undefined,
      grantPack: (amount = 1) => set((current) => ({ packs: current.packs + amount })),
      openPack: (seed) => {
        if (get().packs <= 0) return undefined
        const rolled = rollPack(seed)
        const owned: Record<string, OwnedCard> = { ...get().owned }
        const result = rolled.map((entry) => {
          const before = owned[entry.cardId]
          owned[entry.cardId] = { count: (before?.count ?? 0) + 1, foils: (before?.foils ?? 0) + (entry.foil ? 1 : 0) }
          return { ...entry, isNew: !before }
        })
        set((current) => ({ packs: current.packs - 1, opened: current.opened + 1, owned }))
        return result
      },
      setTitle: (titleId) => set({ titleId }),
      setFrame: (frameId) => set({ frameId }),
    }),
    { name: 'cronicas-nexo-coleccion', version: 1 },
  ),
)

/** Cuántas cartas distintas hay en el álbum frente a las que se pueden coleccionar. */
export const collectionProgress = (owned: Readonly<Record<string, OwnedCard>>) => {
  const pool = POOL()
  const have = pool.filter((card) => owned[card.id]).length
  return { have, total: pool.length }
}
