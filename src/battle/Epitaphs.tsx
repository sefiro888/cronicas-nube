import { Html } from '@react-three/drei'
import { memo, useEffect } from 'react'
import { CARD_BY_ID, type AnimationEvent } from '../game'
import { gridToWorldX, gridToWorldZ } from './grid/gridCoordinates'
import { useTransientEntries } from './useTransientEntries'
import styles from './Epitaphs.module.css'

interface Epitaph {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly name: string
  readonly text: string
  readonly mythic: boolean
}

/** Debe casar con la animación de Epitaphs.module.css. */
const EPITAPH_MS = 3600

/**
 * Muerte con epitafio: cuando cae una unidad importante (rara o mítica), su
 * frase de ambientación sale en pequeño sobre la casilla donde cayó y se
 * desvanece hacia arriba. Las comunes no, para que no se vuelva rutina.
 */
export const Epitaphs = memo(function Epitaphs({ event, reducedMotion = false }: { event?: AnimationEvent; reducedMotion?: boolean }) {
  const { entries, append } = useTransientEntries<Epitaph>(EPITAPH_MS)
  useEffect(() => {
    if (event?.type !== 'destroy' || !event.to || !event.cardId) return
    const card = CARD_BY_ID[event.cardId]
    if (!card || card.type !== 'unit' || (card.rarity !== 'rare' && card.rarity !== 'mythic') || !card.flavor?.trim()) return
    append({
      id: `epitafio-${event.id}`,
      x: gridToWorldX(event.to.x),
      z: gridToWorldZ(event.to.y),
      name: card.name,
      text: card.flavor.trim(),
      mythic: card.rarity === 'mythic',
    })
  }, [event, append])
  return (
    <group>
      {entries.map((entry) => (
        <Html key={entry.id} center position={[entry.x, 1.25, entry.z]} distanceFactor={8} zIndexRange={[13, 0]}>
          <div className={styles.epitaph} data-mythic={entry.mythic || undefined} data-reduced-motion={reducedMotion || undefined}>
            <strong>✝ {entry.name}</strong>
            <span>«{entry.text}»</span>
          </div>
        </Html>
      ))}
    </group>
  )
})
