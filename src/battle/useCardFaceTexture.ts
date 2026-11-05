import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'
import type { CardDefinition } from '../game'
import { cardFrameFor } from '../presentation/cardFrames'
import { withBase } from '../utils/assets'
import { drawCardFace } from './cardFaceTexture'

export function useCardFaceTexture(card: CardDefinition | undefined, artworkPath: string, attack?: number, health?: number): Texture {
  const artworkUrl = withBase(artworkPath)
  const artwork = useTexture(artworkUrl)
  const layout = cardFrameFor(card?.faction)
  const frame = useTexture(layout ? withBase(layout.asset) : artworkUrl)
  const face = useMemo(() => {
    if (!card || !layout) return undefined
    const art: unknown = artwork.image
    const chassis: unknown = frame.image
    if (!(art instanceof HTMLImageElement) || !(chassis instanceof HTMLImageElement)) return undefined
    const canvas = document.createElement('canvas')
    drawCardFace(canvas, chassis, art, layout, card, attack, health)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }, [card, artwork, frame, layout, attack, health])
  // Cada copia conserva sus cifras; al cambiar Vida se libera su mapa anterior
  // para no acumular una textura nueva por cada golpe de una partida larga.
  useEffect(() => () => face?.dispose(), [face])
  return face ?? artwork
}
