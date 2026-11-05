import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { iceBodyMap, iceField, windSnowMask } from '../materials/iceField'
import { ReflectiveWater } from '../materials/ReflectiveWater'
import { packedSnowTexture, contactShadowTexture } from '../textures'
import { DistantVista } from './architecture/DistantVista'
import { floeGeometry } from './architecture/floeGeometry'
import { FrozenLongship } from './architecture/FrozenLongship'
import { GlacierFlanks } from './architecture/GlacierFlanks'

interface FimbulProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

const MIST: readonly PlumeVent[] = [
  { position: [-7.7, -0.5, -5.6], spread: 4.6, height: 1.1, density: 0.16, color: '#8fa6b9', seed: 2 },
  { position: [7.3, -0.5, -6.4], spread: 4, height: 1.3, density: 0.14, color: '#92a8b5', seed: 5 },
  { position: [0, -0.7, -11], spread: 6.8, height: 1.2, density: 0.13, color: '#8ea3b3', seed: 8 },
]

/** Nieve en la orla y hielo profundo en el centro. Una sola captura refleja
 * los objetos cercanos sobre la placa; el lago exterior mate no añade otra.
 * El casco encallado en el hielo conserva el oficio naval propio de Fimbul. */
export function FimbulFjord({ quality, reducedMotion }: FimbulProps) {
  return <>


    <ScenarioAmbientLight intensity={0.25} color="#a7bccb" />
    <ScenarioHemisphereLight intensity={0.32} color="#b5ced7" groundColor="#4c6173" />
    <ScenarioDirectionalLight position={[-8, 12, 6]} intensity={1.75} color="#d4e2e9" castShadow={quality !== 'low'}
      shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[6, 7, -10]} intensity={0.42} color="#8eb9ad" />
    <DistantVista image={`/assets/scenarios/fimbul-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <ReflectiveWater quality="low" reducedMotion frozen level={-0.76} radius={16} color="#152735" />
    <mesh receiveShadow={quality !== 'low'}>
      <primitive object={floeGeometry('body')} attach="geometry" />
      <meshPhysicalMaterial color="#b0c4d0" map={iceBodyMap()} roughness={0.3} metalness={0} clearcoat={0.35}
        clearcoatRoughness={0.22} bumpMap={iceField()} bumpScale={0.016} envMapIntensity={0.5} />
    </mesh>
    <ReflectiveWater quality={quality} reducedMotion={reducedMotion} frozen level={-0.115}
      geometry={floeGeometry('surface')} radius={15} color="#42647b" />
    <mesh receiveShadow={quality !== 'low'}>
      <primitive object={floeGeometry('snow')} attach="geometry" />
      <meshStandardMaterial color="#b9cbd5" map={packedSnowTexture()} roughness={0.98} bumpMap={iceField()} bumpScale={0.014}
        alphaMap={windSnowMask()} transparent depthWrite={false} />
    </mesh>
    <GlacierFlanks quality={quality} />
    <FrozenLongship quality={quality} />
    <mesh position={[0, -0.745, -8.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7.2, 2.25]} />
      <meshBasicMaterial map={contactShadowTexture()} color="#08121b" transparent opacity={0.35} depthWrite={false} />
    </mesh>
    <AtmosphericPlumes vents={MIST} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 70 : 32} scale={[17, 4, 16]}
      position={[0, 1.4, 0]} size={1.4} color="#d0dfe7" opacity={0.48} speed={reducedMotion ? 0 : 0.16} />}
  </>
}
