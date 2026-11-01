import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Line, LineBasicMaterial, QuadraticBezierCurve3, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial, PointLight, Sprite } from 'three'
import { glowTexture } from './textures'

/**
 * Efectos propios de cada tipo de ataque (ver attackStyle.ts). Todos se
 * mueven con el mismo reloj que la embestida física del ataque, para que el
 * impacto caiga cuando la ficha llega, y se limpian solos al terminar.
 *
 * Las mallas son muy simples (planos, conos, anillos y sprites) a propósito:
 * en un turno puede haber varios ataques seguidos y en calidad baja no puede
 * costar más que el arco de siempre.
 */
export interface StyleProps {
  readonly from: readonly [number, number]
  readonly to: readonly [number, number]
  readonly tone: string
  readonly durationMs: number
  /** 0–1: cuánto pesa el golpe (más flechas, más cascotes). */
  readonly weight: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
/** Tramo [a, b] del progreso total, normalizado a 0–1. */
const phase = (progress: number, a: number, b: number) => clamp01((progress - a) / (b - a))
const bell = (t: number) => Math.sin(Math.PI * clamp01(t))

function useAttackClock(durationMs: number) {
  const start = useRef<number | null>(null)
  return () => {
    if (start.current === null) start.current = performance.now()
    return clamp01((performance.now() - start.current) / Math.max(1, durationMs))
  }
}

const angleOf = (from: readonly [number, number], to: readonly [number, number]) => Math.atan2(to[1] - from[1], to[0] - from[0])

/** Chispas que saltan del punto de impacto; reutilizadas por varios estilos. */
function ImpactSparks({ at, tone, count, start, reach = 0.9, height = 0.8, getProgress }: {
  at: readonly [number, number]; tone: string; count: number; start: number; reach?: number; height?: number
  getProgress: () => number
}) {
  const group = useRef<Group>(null)
  const dirs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + i * 0.37
    return [Math.cos(a), 0.4 + (i % 4) * 0.25, Math.sin(a)] as const
  }), [count])
  useFrame(() => {
    const t = phase(getProgress(), start, Math.min(1, start + 0.32))
    group.current?.children.forEach((child, i) => {
      const d = dirs[i]!
      child.visible = t > 0 && t < 1
      child.position.set(d[0] * reach * t, d[1] * height * t - 0.9 * t * t, d[2] * reach * t)
      ;(child as Sprite).material.opacity = (1 - t) * 0.95
      child.scale.setScalar(0.07 + (1 - t) * 0.07)
    })
  })
  return (
    <group ref={group} position={[at[0], 0.75, at[1]]}>
      {dirs.map((_, i) => (
        <sprite key={i} visible={false}>
          <spriteMaterial map={glowTexture('ember')} color={tone} transparent blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

/** Tajos: dos arcos de luz que se cruzan en X sobre el objetivo. */
export function SlashStrike({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const a = useRef<Mesh>(null)
  const b = useRef<Mesh>(null)
  const yaw = angleOf(from, to)
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    const sweep = (mesh: Mesh | null, start: number, flip: number) => {
      if (!mesh) return
      const t = phase(p, start, start + 0.28)
      mesh.visible = t > 0 && t < 1
      mesh.rotation.z = flip * (-1.1 + t * 2.4)
      ;(mesh.material as MeshBasicMaterial).opacity = bell(t) * 0.95
      mesh.scale.setScalar(0.85 + t * 0.4 + weight * 0.3)
    }
    sweep(a.current, 0.36, 1)
    sweep(b.current, 0.5, -1)
  })
  return (
    <group position={[to[0], 0.78, to[1]]} rotation={[0, -yaw + Math.PI / 2, 0]}>
      <mesh ref={a} visible={false}>
        <torusGeometry args={[0.42, 0.028, 3, 40, Math.PI * 0.9]} />
        <meshBasicMaterial color="#fff6e0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={b} visible={false}>
        <torusGeometry args={[0.42, 0.028, 3, 40, Math.PI * 0.9]} />
        <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <ImpactSparks at={[0, 0]} tone={tone} count={8 + Math.round(weight * 8)} start={0.42} getProgress={() => progress.current} />
    </group>
  )
}

/** Zarpazos: tres desgarros paralelos que rasgan en diagonal, uno tras otro. */
export function ClawStrike({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const rakes = useRef<Group>(null)
  const yaw = angleOf(from, to)
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    rakes.current?.children.forEach((child, i) => {
      const t = phase(p, 0.38 + i * 0.05, 0.62 + i * 0.05)
      child.visible = t > 0 && t < 1
      const mesh = child as Mesh
      // Crece de un extremo al otro: se lee como algo que rasga, no un parpadeo.
      mesh.scale.set(1, clamp01(t * 2.2), 1)
      ;(mesh.material as MeshBasicMaterial).opacity = (t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55) * 0.95
    })
  })
  return (
    <group position={[to[0], 0.8, to[1]]} rotation={[0, -yaw + Math.PI / 2, 0.55]}>
      <group ref={rakes}>
        {[-0.14, 0, 0.14].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} visible={false}>
            <planeGeometry args={[0.045 + weight * 0.02, 0.9]} />
            <meshBasicMaterial color={i === 1 ? '#ffe4d6' : tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      <ImpactSparks at={[0, 0]} tone="#ff5a3c" count={10 + Math.round(weight * 6)} start={0.45} getProgress={() => progress.current} />
    </group>
  )
}

/** Mazazo: destello hacia abajo, onda en el suelo y cascotes que saltan. */
export function CrushStrike({ to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const ring = useRef<Mesh>(null)
  const ring2 = useRef<Mesh>(null)
  const debris = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const chunks = useMemo(() => Array.from({ length: 10 + Math.round(weight * 8) }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + i * 0.7
    return { x: Math.cos(a), z: Math.sin(a), up: 1.2 + (i % 3) * 0.5, spin: 3 + (i % 5) }
  }), [weight])
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    const t = phase(p, 0.44, 0.95)
    const wave = (mesh: Mesh | null, delay: number, size: number) => {
      if (!mesh) return
      const k = phase(t, delay, 1)
      mesh.visible = k > 0 && k < 1
      mesh.scale.setScalar(0.2 + k * (size + weight * 1.4))
      ;(mesh.material as MeshBasicMaterial).opacity = (1 - k) * 0.9
    }
    wave(ring.current, 0, 2.2)
    wave(ring2.current, 0.18, 1.5)
    if (light.current) light.current.intensity = t > 0 ? Math.pow(1 - t, 3) * (6 + weight * 6) : 0
    debris.current?.children.forEach((child, i) => {
      const c = chunks[i]!
      child.visible = t > 0 && t < 1
      const r = 0.25 + t * (0.9 + weight * 0.5)
      child.position.set(c.x * r, Math.max(0, c.up * t - 2.6 * t * t), c.z * r)
      child.rotation.set(t * c.spin, t * c.spin * 0.7, 0)
    })
  })
  return (
    <group position={[to[0], 0.08, to[1]]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.42, 48]} />
        <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.42, 48]} />
        <meshBasicMaterial color="#fff1d0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={debris}>
        {chunks.map((_, i) => (
          <mesh key={i} visible={false} scale={0.06 + (i % 3) * 0.025}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#6b5a48" roughness={0.9} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.6, 0]} color={tone} intensity={0} distance={3.5} decay={2} />
    </group>
  )
}

/** Curva baja entre dos casillas; `peak` es la altura del vértice. */
const arcPath = (from: readonly [number, number], to: readonly [number, number], peak: number, sideways = 0) => {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.max(0.001, Math.hypot(dx, dz))
  return new QuadraticBezierCurve3(
    new Vector3(from[0], 0.95, from[1]),
    new Vector3((from[0] + to[0]) / 2 - (dz / length) * sideways, peak, (from[1] + to[1]) / 2 + (dx / length) * sideways),
    new Vector3(to[0], 0.85, to[1]),
  )
}

/** Andanada de flechas: varias, en arco bajo y algo desfasadas. */
export function ArrowVolley({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const count = 1 + Math.round(weight * 3)
  const paths = useMemo(() => Array.from({ length: count }, (_, i) => arcPath(from, to, 1.7 + (i % 2) * 0.25, (i - (count - 1) / 2) * 0.28)), [from, to, count])
  const arrows = useRef<Group>(null)
  const pos = useMemo(() => new Vector3(), [])
  const tan = useMemo(() => new Vector3(), [])
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    arrows.current?.children.forEach((child, i) => {
      const t = phase(p, 0.2 + i * 0.06, 0.62 + i * 0.06)
      child.visible = t > 0 && t < 1
      paths[i]!.getPoint(t, pos)
      paths[i]!.getTangent(t, tan)
      child.position.copy(pos)
      child.lookAt(tan.add(pos))
    })
  })
  return (
    <>
      <group ref={arrows}>
        {paths.map((_, i) => (
          <group key={i} visible={false}>
            {/* Astil, punta y plumas: una flecha de verdad, no una bola. */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.5, 5]} />
              <meshStandardMaterial color="#8a6a44" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.03, 0.09, 4]} />
              <meshStandardMaterial color="#d8d2c4" metalness={0.8} roughness={0.25} emissive={tone} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0, -0.22]}>
              <planeGeometry args={[0.07, 0.1]} />
              <meshBasicMaterial color="#f0ece2" side={DoubleSide} />
            </mesh>
            <sprite scale={[0.18, 0.18, 1]} position={[0, 0, -0.3]}>
              <spriteMaterial map={glowTexture('gold')} color={tone} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
            </sprite>
          </group>
        ))}
      </group>
      <ImpactSparks at={to} tone="#fff0c8" count={6 + count * 2} start={0.62} reach={0.5} getProgress={() => progress.current} />
    </>
  )
}

/** Disparo de pólvora: fogonazo, trazadora recta y humo que se queda. */
export function GunShot({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const tracer = useRef<Mesh>(null)
  const flash = useRef<Sprite>(null)
  const smoke = useRef<Group>(null)
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    const fire = phase(p, 0.3, 0.42)
    if (flash.current) {
      flash.current.visible = fire > 0 && fire < 1
      flash.current.scale.setScalar(0.5 + bell(fire) * (0.6 + weight * 0.4))
    }
    if (tracer.current) {
      const t = phase(p, 0.32, 0.48)
      tracer.current.visible = t > 0 && t < 1
      ;(tracer.current.material as MeshBasicMaterial).opacity = (1 - t) * 0.95
    }
    smoke.current?.children.forEach((child, i) => {
      const t = phase(p, 0.32 + i * 0.04, 1)
      child.visible = t > 0 && t < 1
      child.position.set(Math.sin(i * 2.1) * 0.12 * t, 0.95 + t * 0.5, 0.12 + t * 0.15 * i)
      child.scale.setScalar(0.18 + t * 0.5)
      ;(child as Sprite).material.opacity = (1 - t) * 0.45
    })
  })
  return (
    <group position={[from[0], 0, from[1]]} rotation={[0, yaw, 0]}>
      <mesh ref={tracer} position={[0, 0.9, length / 2]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <cylinderGeometry args={[0.014, 0.014, length, 4]} />
        <meshBasicMaterial color="#fff2c0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <sprite ref={flash} position={[0, 0.95, 0.25]} visible={false}>
        <spriteMaterial map={glowTexture('ember')} color="#ffd27a" transparent blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      <group ref={smoke}>
        {Array.from({ length: 5 }, (_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={glowTexture('shadow')} color="#b9b2a6" transparent depthWrite={false} />
          </sprite>
        ))}
      </group>
      <group position={[0, 0, length]}>
        <ImpactSparks at={[0, 0]} tone={tone} count={10} start={0.45} reach={0.55} getProgress={() => progress.current} />
      </group>
    </group>
  )
}

/** Rayo: una línea quebrada que se redibuja cada pocos fotogramas, con destello en los dos extremos. */
export function LightningBolt({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const segments = 14
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array((segments + 1) * 3), 3))
    return g
  }, [])
  const color = useMemo(() => new Color(tone).lerp(new Color('#ffffff'), 0.45), [tone])
  // Dos líneas sobre la misma geometría: núcleo casi blanco y halo del color
  // de la facción algo desplazado. WebGL ignora el grosor de línea, así que
  // el halo es lo que le da cuerpo. Con <line> en JSX TypeScript lo tomaba
  // por el elemento SVG; por eso van como objetos de three.
  const core = useMemo(() => new Line(geometry, new LineBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })), [geometry, color])
  const halo = useMemo(() => {
    const line = new Line(geometry, new LineBasicMaterial({ color: tone, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }))
    line.position.y = 0.03
    return line
  }, [geometry, tone])
  const endFlash = useRef<Sprite>(null)
  const coreRef = useRef<Line>(null)
  const haloRef = useRef<Line>(null)
  const frame = useRef(0)
  useFrame(() => {
    const p = clock()
    const t = phase(p, 0.28, 0.82)
    const on = t > 0 && t < 1
    // Cada 3 fotogramas cambia la forma: así parpadea como una descarga.
    if (on && frame.current++ % 3 === 0) {
      const attr = geometry.getAttribute('position') as Float32BufferAttribute
      for (let i = 0; i <= segments; i += 1) {
        const k = i / segments
        const jitter = i === 0 || i === segments ? 0 : 0.28 * (1 - Math.abs(k - 0.5))
        attr.setXYZ(i,
          from[0] + (to[0] - from[0]) * k + (Math.random() - 0.5) * jitter,
          1.05 + Math.sin(k * Math.PI) * 0.9 + (Math.random() - 0.5) * jitter,
          from[1] + (to[1] - from[1]) * k + (Math.random() - 0.5) * jitter)
      }
      attr.needsUpdate = true
    }
    const flicker = on ? 0.55 + Math.random() * 0.45 : 0
    if (coreRef.current) (coreRef.current.material as LineBasicMaterial).opacity = flicker
    if (haloRef.current) (haloRef.current.material as LineBasicMaterial).opacity = flicker * 0.5
    if (endFlash.current) {
      endFlash.current.visible = on
      endFlash.current.scale.setScalar(0.5 + flicker * (0.5 + weight * 0.5))
    }
  })
  return (
    <>
      <primitive ref={haloRef} object={halo} />
      <primitive ref={coreRef} object={core} />
      <sprite ref={endFlash} position={[to[0], 0.9, to[1]]} visible={false}>
        <spriteMaterial map={glowTexture('arcane')} color={tone} transparent blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      <pointLight position={[to[0], 1, to[1]]} color={tone} intensity={2.5} distance={2.5} decay={2} />
    </>
  )
}

/** Aliento de dragón: un chorro de llamas que se abre en cono hasta el objetivo. */
export function DragonBreath({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const flames = useRef<Group>(null)
  const count = 26 + Math.round(weight * 14)
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    offset: (i / count) * 0.55,
    spread: (((i * 53) % 100) / 100 - 0.5) * 2,
    lift: (((i * 31) % 100) / 100 - 0.5),
    size: 0.18 + (i % 4) * 0.06,
  })), [count])
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  const progress = useRef(0)
  useFrame(() => {
    const p = clock()
    progress.current = p
    flames.current?.children.forEach((child, i) => {
      const s = seeds[i]!
      const t = phase(p, 0.2 + s.offset, 0.55 + s.offset)
      child.visible = t > 0 && t < 1
      const z = t * (length + 0.2)
      child.position.set(s.spread * 0.38 * t, 1 - t * 0.15 + s.lift * 0.3 * t, z)
      child.scale.setScalar(s.size * (0.6 + t * 1.6))
      ;(child as Sprite).material.opacity = bell(t) * 0.9
    })
  })
  return (
    <group position={[from[0], 0, from[1]]} rotation={[0, yaw, 0]}>
      <group ref={flames}>
        {seeds.map((_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={glowTexture('ember')} color={i % 3 === 0 ? '#fff0a0' : tone} transparent blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <pointLight position={[0, 1, length * 0.6]} color="#ff8a3a" intensity={3 + weight * 3} distance={4} decay={2} />
    </group>
  )
}

/** Púas: un abanico de espinas que sale abierto y converge en el objetivo. */
export function BarbVolley({ from, to, tone, durationMs, weight }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const count = 5 + Math.round(weight * 4)
  const paths = useMemo(() => Array.from({ length: count }, (_, i) => arcPath(from, to, 1.4 + (i % 3) * 0.2, (i - (count - 1) / 2) * 0.55)), [from, to, count])
  const barbs = useRef<Group>(null)
  const pos = useMemo(() => new Vector3(), [])
  const tan = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const p = clock()
    barbs.current?.children.forEach((child, i) => {
      const t = phase(p, 0.22 + (i % 3) * 0.04, 0.66 + (i % 3) * 0.04)
      child.visible = t > 0 && t < 1
      paths[i]!.getPoint(t, pos)
      paths[i]!.getTangent(t, tan)
      child.position.copy(pos)
      child.lookAt(tan.add(pos))
    })
  })
  return (
    <group ref={barbs}>
      {paths.map((_, i) => (
        <mesh key={i} visible={false}>
          <coneGeometry args={[0.035, 0.22, 4]} />
          <meshStandardMaterial color="#2c2418" emissive={tone} emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** Espíritus: tres almas que giran en espiral hasta atravesar al objetivo. */
export function SpectralStrike({ from, to, tone, durationMs }: StyleProps) {
  const clock = useAttackClock(durationMs)
  const path = useMemo(() => arcPath(from, to, 1.6), [from, to])
  const wisps = useRef<Group>(null)
  const pos = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const p = clock()
    wisps.current?.children.forEach((child, i) => {
      const t = phase(p, 0.18 + i * 0.07, 0.7 + i * 0.07)
      child.visible = t > 0 && t < 1
      path.getPoint(t, pos)
      const swirl = t * Math.PI * 6 + (i * Math.PI * 2) / 3
      child.position.set(pos.x + Math.cos(swirl) * 0.22 * (1 - t), pos.y + Math.sin(swirl) * 0.22 * (1 - t), pos.z)
      ;(child as Sprite).material.opacity = bell(t) * 0.9
      child.scale.setScalar(0.3 + bell(t) * 0.2)
    })
  })
  return (
    <group ref={wisps}>
      {[0, 1, 2].map((i) => (
        <sprite key={i} visible={false}>
          <spriteMaterial map={glowTexture('shadow')} color={i === 1 ? '#e6f4ff' : tone} transparent blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}
