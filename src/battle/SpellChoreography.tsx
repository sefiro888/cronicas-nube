import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, Vector2, type ShaderMaterial } from 'three'
import type { AnimationEvent, FactionId } from '../game'
import type { CastImpact } from './castImpact'
import { spellKindFor } from './spellStyle'
import { SPELL_INSCRIPTIONS, spellChoreography } from './spellScene'

const planeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`

const sealFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float progress, spokes, materialKind, house, warning, delay, still;
  uniform vec3 ink, gold;
  float stroke(float d, float width) {
    return 1. - smoothstep(width, width + .009, abs(d));
  }
  void main() {
    vec2 p = (vUv - .5) * 2.;
    float r = length(p);
    float a = atan(p.y, p.x) + 3.141593;
    float t = progress - delay;
    float sector = a * spokes / 6.283185;
    float teeth = abs(fract(sector) - .5);
    float flutes = sin(a * spokes);
    float edge = mix(r, max(abs(p.x), abs(p.y)), step(.5, materialKind) * (1. - step(1.5, materialKind)));
    float ring = stroke(edge - .81, .008) + stroke(edge - .72, .008);
    float weave = stroke(r - (.54 + .09 * flutes + .025 * sin(a * house)), .009);
    float alphabet = stroke(teeth - (.18 + .12 * sin(floor(sector) * house)), .015) * smoothstep(.60,.63,r) * (1. - smoothstep(.71,.74,r));
    float crystal = stroke(teeth, .024) * smoothstep(.39,.44,r) * (1. - smoothstep(.67,.69,r));
    float petals = stroke(r - (.31 + .15 * abs(flutes)), .008);
    float trim = mix(crystal, petals, step(1.5, materialKind));
    float center = stroke(abs(p.x) + abs(p.y) - .22, .01);
    if (house == 10.) {
      vec2 q = abs(p);
      center = stroke(max(q.x, q.y) - .33, .012) * step(.06, abs(q.x - q.y) + q.x * q.y)
        + stroke(max(abs(p.x + .08), abs(p.y - .055)) - .20, .012) + stroke(max(q.x, q.y) - .092, .012);
    } else if (house == 8.) {
      center = stroke(teeth, .022) * (1. - smoothstep(.40, .44, r))
        + stroke(teeth - .21 * abs(sin(r * 19.)), .020) * smoothstep(.17,.22,r) * (1. - smoothstep(.41,.46,r));
    } else if (house == 15.) {
      center = stroke(abs(sin(a * 1.5 + r * 12.)) - .22, .029) * smoothstep(.05,.11,r) * (1. - smoothstep(.4,.48,r));
    }
    float scan = still > .5 ? 1. : smoothstep(0., .2, t - edge * .10 + .08);
    float trace = (ring + weave + alphabet + trim + center) * scan;
    float swell = still > .5 ? 0. : exp(-144. * (t - .66) * (t - .66));
    float ripple = stroke(r - clamp((t - .55) * 3.7, 0., 1.), .016) * swell;
    float aura = (1. - smoothstep(.17,.94,r)) * (.12 + .24 * swell);
    float life = still > .5 ? .9 : smoothstep(0., .11, t) * (1. - smoothstep(.76, .98, progress));
    vec3 metal = mix(ink, vec3(1., .23, .08), warning * .32);
    vec3 color = mix(metal, gold, clamp(trace * .7 + ripple * .5, 0., 1.));
    gl_FragColor = vec4(color, min(1., (trace * .87 + ripple * .8 + aura) * life));
    #include <colorspace_fragment>
  }
`

const wakeFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float progress, still;
  uniform vec3 ink, gold;
  void main() {
    float x = vUv.x * 2. - 1.;
    float y = vUv.y;
    float wave = sin(y * 29. - progress * 22.);
    float curl = abs(x + .12 * wave);
    float head = smoothstep(.02, .7, progress) * 1.2;
    float foam = exp(-abs(curl - .56 - wave * .12) * 23.);
    float bend = y - head + x*x*.17;
    float crest = exp(-196. * bend * bend);
    float ripples = pow(.5 + .5 * sin(y * 52. - progress * 27. + x * x * 8.), 12.);
    float water = (1. - smoothstep(.46, 1., curl)) * (.17 + ripples * .26 + crest * .48);
    float gate = still > .5 ? 1. : smoothstep(.01, .13, head - y + .16) * (1. - smoothstep(.76, 1., progress));
    gl_FragColor = vec4(mix(ink, gold, max(foam * .9, crest)), (water + foam * .56) * gate * smoothstep(0.,.09,y) * (1. - smoothstep(.93,1.,y)));
    #include <colorspace_fragment>
  }
`

const crestVertex = /* glsl */ `
  varying vec2 vUv;
  uniform float progress, routeLength;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += (smoothstep(.05, .77, progress) - .5) * routeLength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`

const crestFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float progress;
  uniform vec3 ink, gold;
  void main() {
    vec2 p = vec2(vUv.x * 2. - 1., vUv.y);
    float arc = .72 - p.x*p.x*.58 + sin(p.x * 14. - progress * 13.) * .055;
    float d = p.y - arc;
    float foam = exp(-d*d*520.);
    float lip = exp(-(d+.09)*(d+.09)*46.);
    float filaments = pow(.5 + .5 * sin(p.x * 72. + p.y * 17.), 5.);
    float spray = smoothstep(.8,.98, sin(p.x * 149. + p.y*52.) * sin(p.y * 123. - p.x*31.));
    float life = smoothstep(.07,.24,progress) * (1. - smoothstep(.7,.94,progress));
    float mask = 1. - smoothstep(.57, 1., abs(p.x));
    gl_FragColor = vec4(mix(ink, gold, clamp(foam + lip * filaments, 0., 1.)),
      min(1., foam*.85 + lip*.68 + lip*filaments*.55 + spray*.74*exp(-abs(d)*9.)) * life * mask);
    #include <colorspace_fragment>
  }
`

const descentFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float progress, delay, materialKind, house;
  uniform vec3 ink, gold;
  void main() {
    float t = progress - delay;
    float y = vUv.y;
    float x = vUv.x * 2. - 1.;
    float plunge = smoothstep(.33, .68, t);
    float tip = 1. - plunge;
    float lengthwise = smoothstep(-.045, .03, y - tip) * (1. - smoothstep(.21,.49,y-tip));
    float braid = sin(y * (10. + house) + progress * 16.);
    float fork = .08 + .29 * abs(sin(y * 19. + house));
    float jagged = exp(-31. * abs(abs(x) - fork)) + exp(-39. * abs(x - braid * .09));
    float scripture = exp(-26. * abs(abs(x) - .28)) * (.4 + .6 * step(.44, fract(y * (9. + house * .3))));
    float tendrils = exp(-26. * abs(x - braid * .34)) + exp(-28. * abs(x + braid * .25));
    float filaments = materialKind < .5 ? jagged : materialKind < 1.5 ? scripture : tendrils;
    float heart = exp(-21. * abs(x));
    float mist = exp(-4.5 * x*x) * (.15 + .08 * sin(y * 57. + progress * 14.));
    float veil = (filaments * .76 + heart * .83 + mist) * lengthwise;
    float life = smoothstep(.33,.43,t) * (1. - smoothstep(.68,.86,t));
    gl_FragColor = vec4(mix(ink, gold, clamp(filaments*.43 + heart*.66, 0., 1.)), veil * life);
    #include <colorspace_fragment>
  }
`

const sparkVertex = /* glsl */ `
  attribute vec3 aSpark;
  uniform vec2 startAt, endAt;
  uniform float progress, pixelRatio;
  varying float shine, heat;
  void main() {
    float i = aSpark.x, tail = aSpark.y, branch = aSpark.z;
    float time = progress - tail * .018 - branch * .022;
    float travel = smoothstep(.06, .55, time);
    float spread = sin(travel * 3.141593);
    vec2 at = mix(startAt, endAt, travel);
    float lift = mix(.74, 1.82, travel) + spread * (2.35 + branch * .26);
    at.x += spread * (branch - 1.) * .44;
    float burst = max(0., (time - .55) / .45);
    float angle = i * 2.399963 + branch;
    float radius = sqrt(burst) * (.68 + fract(i * .618) * 1.38);
    at += vec2(cos(angle), sin(angle)) * radius;
    lift += radius * sin(i * 4.31) * .58 - burst * burst * .6;
    heat = fract(i * .37 + branch * .41);
    float lead = step(.55, time);
    shine = smoothstep(.05,.18,time) * mix(step(i, 4.), 1., lead)
      * (1. - smoothstep(.73, .99, progress)) * (1. - tail * .18);
    vec4 view = modelViewMatrix * vec4(at.x, lift, at.y, 1.);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(pixelRatio * (34. + heat * 51.) * (1. - tail * .12) / -view.z, 3., 23.);
  }
`

const sparkFragment = /* glsl */ `
  varying float shine, heat;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    float glow = exp(-d * d * 4.3) * (1. - smoothstep(.65, 1., d));
    vec3 ember = mix(vec3(1.,.07,.025), vec3(1.,.65,.18), heat);
    gl_FragColor = vec4(mix(ember, vec3(1.,.94,.63), exp(-d*d*18.)), glow * shine);
  }
`

const sparkData = new Float32Array(3 * 4 * 34 * 3)
for (let i = 0; i < sparkData.length / 3; i++) {
  sparkData[i * 3] = i % 34
  sparkData[i * 3 + 1] = Math.floor(i / 34) % 4
  sparkData[i * 3 + 2] = Math.floor(i / (34 * 4))
}

export function SpellChoreography({ event, impact, faction, reducedMotion }: {
  event: AnimationEvent
  impact?: CastImpact
  faction: FactionId
  reducedMotion: boolean
}) {
  const scene = useMemo(() => spellChoreography(event, impact), [event, impact])
  const clock = useRef<number | null>(null)
  const sigils = useRef<(ShaderMaterial | null)[]>([])
  const wakes = useRef<(ShaderMaterial | null)[]>([])
  const descents = useRef<(ShaderMaterial | null)[]>([])
  const sparks = useRef<ShaderMaterial>(null)
  const [ink, gold, spokes, materialKind, house] = SPELL_INSCRIPTIONS[faction]
  const palette = useMemo(() => ({ ink: { value: new Color(ink) }, gold: { value: new Color(gold) } }), [ink, gold])
  const fireworks = event.cast?.sourceId === 'fuegos-de-artificio' && !reducedMotion
  const area = Boolean(event.cast && spellKindFor(event.cast.sourceId, event.cast.kind) === 'storm')
  const sites = useMemo(() => scene ? [
    { at: scene.origin, tone: 'neutral', nexus: true },
    ...scene.sites.filter(({ at }) => at.join(',') !== scene.origin.join(',')),
  ].map((site, index) => ({
    ...site,
    uniforms: {
      ...palette, progress: { value: reducedMotion ? .55 : 0 }, still: { value: Number(reducedMotion) },
      spokes: { value: spokes }, materialKind: { value: materialKind }, house: { value: house },
      warning: { value: Number(site.tone === 'harm') }, delay: { value: index === 0 ? 0 : .08 + .12 * index / scene.sites.length },
    },
  })) : [], [scene, palette, reducedMotion, spokes, materialKind, house])
  const routes = useMemo(() => scene?.routes.map(({ from, to }) => ({
    from, to, length: Math.hypot(to[0] - from[0], to[1] - from[1]),
    angle: Math.atan2(to[0] - from[0], to[1] - from[1]),
    uniforms: { ...palette, progress: { value: reducedMotion ? .55 : 0 }, still: { value: Number(reducedMotion) },
      routeLength: { value: Math.hypot(to[0] - from[0], to[1] - from[1]) } },
  })) ?? [], [scene, palette, reducedMotion])
  const fireUniforms = useMemo(() => scene?.primary ? {
    startAt: { value: new Vector2(...scene.origin) }, endAt: { value: new Vector2(...scene.primary) },
    progress: { value: 0 }, pixelRatio: { value: 1 },
  } : undefined, [scene])

  useFrame(({ clock: frame, gl }) => {
    if (reducedMotion) return
    clock.current ??= frame.elapsedTime
    const t = Math.min(1, (frame.elapsedTime - clock.current) * 1000 / event.durationMs)
    for (const material of sigils.current) if (material) material.uniforms.progress!.value = t
    for (const material of descents.current) if (material) material.uniforms.progress!.value = t
    for (const material of wakes.current) if (material) material.uniforms.progress!.value = t
    if (sparks.current) {
      sparks.current.uniforms.progress!.value = t
      sparks.current.uniforms.pixelRatio!.value = gl.getPixelRatio()
    }
  })
  if (!scene) return null

  return (
    <group name="coreografia-hechizo" userData={{ faction, targets: scene.sites.length, routes: routes.length, fireworks }}>
      {sites.map(({ at, nexus, uniforms }, index) => (
        <mesh key={at.join(',')} position={[at[0], .17, at[1]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={nexus ? [1.7, 1.7] : [1.05, 1.05]} />
          <shaderMaterial ref={(material) => { sigils.current[index] = material }} uniforms={uniforms} vertexShader={planeVertex} fragmentShader={sealFragment}
            side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
      {area && !reducedMotion && sites.slice(1).filter(({ tone }) => tone === 'harm' || tone === 'control').map(({ at, uniforms }, index) => (
        <group key={at.join(',')} position={[at[0], 1.43, at[1]]}>
          {[0, Math.PI / 2].map((angle, plane) => (
            <mesh key={angle} rotation={[0, angle, 0]} raycast={() => null}>
              <planeGeometry args={[.86, 2.56]} />
              <shaderMaterial ref={(material) => { descents.current[index * 2 + plane] = material }} uniforms={uniforms}
                vertexShader={planeVertex} fragmentShader={descentFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
      {routes.map(({ from, to, length, angle, uniforms }, index) => (
        <group key={from.join(',')} position={[(from[0] + to[0]) / 2, .18, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[.83, length + .58]} />
            <shaderMaterial ref={(material) => { wakes.current[index * 2] = material }} uniforms={uniforms} vertexShader={planeVertex} fragmentShader={wakeFragment}
              side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
          </mesh>
          {!reducedMotion && <mesh position={[0, .38, 0]} raycast={() => null}>
            <planeGeometry args={[1.26, .76]} />
            <shaderMaterial ref={(material) => { wakes.current[index * 2 + 1] = material }} uniforms={uniforms}
              vertexShader={crestVertex} fragmentShader={crestFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
          </mesh>}
        </group>
      ))}
      {fireworks && fireUniforms && <points frustumCulled={false} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkData, 3]} />
          <bufferAttribute attach="attributes-aSpark" args={[sparkData, 3]} />
        </bufferGeometry>
        <shaderMaterial ref={sparks} uniforms={fireUniforms} vertexShader={sparkVertex} fragmentShader={sparkFragment}
          transparent depthWrite={false} blending={AdditiveBlending} />
      </points>}
    </group>
  )
}
