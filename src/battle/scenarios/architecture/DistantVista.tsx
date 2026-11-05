import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, MirroredRepeatWrapping, SRGBColorSpace } from 'three'
import type { Mesh } from 'three'
import { panoramaBandGeometry, panoramaBandMask } from './panoramaBandGeometry'
import { centerPanoramaAtCamera } from './panoramaPosition'
import { withBase } from '../../../utils/assets'
import { useScenarioLight } from '../../../store/scenarioMood'

/** Cinturón panorámico con orientación mundial. La banda sigue solo la
 * traslación de cámara, como un cielo infinito; nunca su giro. Un plano
 * distante revelaba su borde al orbitar y parecía un cartel inclinado. */
export function DistantVista({ image }: {
  readonly image: string
}) {
  const dome = useRef<Mesh>(null)
  const { mood } = useScenarioLight()
  const loaded = useTexture(withBase(image))
  const texture = useMemo(() => {
    const color = loaded.clone()
    color.colorSpace = SRGBColorSpace
    // El cilindro mantiene las verticales de la pintura rectas; su centro
    // acompaña los37° de cámara. La esfera curvaba las torres en modo foto.
    // Los extremos reflejados comparten píxel y no abren juntas.
    color.wrapS = MirroredRepeatWrapping
    color.repeat.set(4, 1)
    color.offset.set(0.5, 0)
    color.needsUpdate = true
    return color
  }, [loaded])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame(({ camera }) => {
    if (dome.current) centerPanoramaAtCamera(dome.current, camera)
  })
  return <mesh ref={dome} name="scenario-distant-vista" renderOrder={-20}>
    <primitive object={panoramaBandGeometry()} attach="geometry" />
    <meshBasicMaterial map={texture} color={mood === 'moonlight' ? '#819dbd' : mood === 'dusk' ? '#c9b6c9' : mood === 'dawn' ? '#fff4e4' : '#ffffff'} alphaMap={panoramaBandMask()} side={BackSide} transparent depthWrite={false} fog={false} toneMapped={false} />
  </mesh>
}
