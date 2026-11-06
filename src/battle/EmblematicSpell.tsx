import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, Vector2, type ShaderMaterial } from 'three'
import type { AnimationEvent, FactionId } from '../game'
import { emblematicSpell } from './emblematicSpells'
import { SPELL_INSCRIPTIONS, type spellChoreography } from './spellScene'

const fragment = /* glsl */ `
  uniform vec3 ink, gold;
  uniform float shape;
  varying float light, heat;
  void main() {
    vec2 uv = (gl_PointCoord-.5)*2.;
    float d = length(uv);
    if (shape == 1.) d = length(vec2(uv.x, uv.y*1.8));
    if (shape == 2.) d = abs(uv.x)*.8+abs(uv.y)*.95;
    if (shape == 3.) d = length(vec2(uv.x*2.7, uv.y));
    if (shape == 4.) d = max(abs(uv.x),abs(uv.y));
    float glow = exp(-4.*d*d)*(1.-smoothstep(.57,1.,d));
    vec3 tint = mix(ink,gold,.36+.45*heat+.19*(1.-d));
    gl_FragColor = vec4(tint,glow*light);
    #include <colorspace_fragment>
  }
`

const vertexFor = (path: string) => /* glsl */ `
  attribute vec3 particle;
  uniform vec2 origin;
  uniform float time, dpr, spark, shape;
  varying float light, heat;
  const float PI = 3.141593;
  vec3 gesture(vec3 site, float p, float r, float a, float q) { return ${path}; }
  void main() {
    vec3 site = position;
    float q = particle.x;
    float tail = particle.y;
    float a = q * 203.19;
    float r = .21 + fract(q*17.37)*.72;
    float delay = .075 + fract(q*9.17)*.16 + tail*.027 + particle.z*.12;
    float phase = (time-delay)/.57;
    float p = clamp(phase,0.,1.);
    heat = fract(q*23.31);
    vec4 view = modelViewMatrix * vec4(site+gesture(site,p,r,a,q),1.);
    gl_Position = projectionMatrix * view;
    float grainSize = shape == 1. ? 1.8 : 1.;
    gl_PointSize = clamp(dpr*grainSize*(40.+heat*60.)*(1.-tail*.2)/max(1.,-view.z),2.,30.);
    light = smoothstep(0.,.12,phase)*(1.-smoothstep(.72,1.,phase))*(1.-tail*.21);
  }
`

const boltVertex = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`
const boltFragment = /* glsl */ `
  uniform float time;
  void main() {
    float flash = smoothstep(.27,.39,time) * (1. - smoothstep(.54,.79,time));
    gl_FragColor = vec4(.72,.83,1., flash * (.68 + .32*sin(time*87.)*sin(time*87.)));
  }
`

export function EmblematicSpell({ event, scene, faction }: {
  event: AnimationEvent
  scene: NonNullable<ReturnType<typeof spellChoreography>>
  faction: FactionId
}) {
  const design = emblematicSpell(event.cast?.sourceId)
  const material = useRef<ShaderMaterial>(null)
  const boltMaterial = useRef<ShaderMaterial>(null)
  const start = useRef<number | null>(null)
  const [ink, gold] = SPELL_INSCRIPTIONS[faction]
  const buffers = useMemo(() => {
    const locations = scene.sites.length ? scene.sites.map(({ at }) => at) : [scene.origin]
    const perSite = locations.length > 12 ? 16 : 34
    const positions = new Float32Array(locations.length * perSite * 4 * 3)
    const particles = new Float32Array(positions.length)
    let offset = 0
    locations.forEach(([x, z], site) => {
      for (let seed = 0; seed < perSite; seed++) {
        for (let tail = 0; tail < 4; tail++) {
          positions.set([x, .05, z], offset)
          particles.set([(seed + .5) / perSite, tail, site / locations.length], offset)
          offset += 3
        }
      }
    })
    return { positions, particles }
  }, [scene])
  const bolts = useMemo(() => {
    if (event.cast?.sourceId !== 'rayo-del-olimpo') return undefined
    const vertices: number[] = []
    for (const { at: [x, z] } of scene.sites) {
      for (let branch = -1; branch <= 1; branch++) {
        const point = (i: number) => {
          const t = i / 12
          return [x + (1 - t) * (branch * .43 + Math.sin(i * 2.3 + branch) * .19),
            3.65 - t * 3.35, z + (1 - t) * Math.cos(i * 2.8 + branch) * .18]
        }
        for (let i = 0; i < 12; i++) vertices.push(...point(i), ...point(i + 1))
      }
    }
    return new Float32Array(vertices)
  }, [event.cast?.sourceId, scene])
  const shape = faction === 'duna' || faction === 'bestiario' ? 1
    : faction === 'arcane' || faction === 'void' || faction === 'sol' ? 2
      : faction === 'olimpo' || faction === 'tercios' ? 3
        : faction === 'order' || faction === 'forja' || faction === 'kalevala' ? 4 : 0
  const uniforms = useMemo(() => ({
    time: { value: 0 }, dpr: { value: 1 }, origin: { value: new Vector2(...scene.origin) },
    shape: { value: shape }, spark: { value: event.sparkFace === 'cruz' ? 1 : 0 },
    ink: { value: new Color(event.sparkFace === 'cruz' ? '#ff653e' : ink) }, gold: { value: new Color(gold) },
  }), [scene.origin, event.sparkFace, ink, gold, shape])
  useFrame(({ clock, gl }) => {
    start.current ??= clock.elapsedTime
    if (!material.current) return
    const progress = Math.min(1, (clock.elapsedTime - start.current) * 1000 / event.durationMs)
    material.current.uniforms.time!.value = progress
    material.current.uniforms.dpr!.value = gl.getPixelRatio()
    if (boltMaterial.current) boltMaterial.current.uniforms.time!.value = progress
  })
  if (!design) return null
  return <>
    <points name="conjuro-emblematico" userData={{ name: design.name, faction, face: event.sparkFace }}
    frustumCulled={false} raycast={() => null}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
      <bufferAttribute attach="attributes-particle" args={[buffers.particles, 3]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexFor(design.path)} fragmentShader={fragment}
      transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
    {bolts && bolts.length > 0 && <lineSegments raycast={() => null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[bolts, 3]} /></bufferGeometry>
      <shaderMaterial ref={boltMaterial} uniforms={uniforms} vertexShader={boltVertex} fragmentShader={boltFragment}
        transparent depthWrite={false} blending={AdditiveBlending} />
    </lineSegments>}
  </>
}
