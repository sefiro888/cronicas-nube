import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, QuadraticBezierCurve3, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial, PointLight, Sprite } from 'three'
import { glowTexture } from './textures'

/**
 * Efectos propios de cada tipo de hechizo (ver spellStyle.ts). Cada uno usa
 * el reloj del evento de lanzamiento; los daños, curaciones y estados ya
 * resueltos llegan después en sus propios eventos con sus propios efectos.
 */
export interface SpellProps {
  /** De dónde sale: el Nexo de quien lanza. */
  readonly from: readonly [number, number]
  /** Objetivos (casillas en coordenadas de mundo). Vacío = sobre el lanzador. */
  readonly targets: readonly (readonly [number, number])[]
  readonly tone: string
  readonly durationMs: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const bell = (t: number) => Math.sin(Math.PI * clamp01(t))

function useClock(durationMs: number) {
  const start = useRef<number | null>(null)
  return () => {
    if (start.current === null) start.current = performance.now()
    return clamp01((performance.now() - start.current) / Math.max(1, durationMs))
  }
}

/** Bola de fuego: crece en el Nexo, vuela en arco dejando brasas y revienta. */
export function Fireball({ from, targets, tone, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const to = targets[0] ?? from
  const curve = useMemo(() => new QuadraticBezierCurve3(
    new Vector3(from[0], 1.1, from[1]),
    new Vector3((from[0] + to[0]) / 2, 3.2, (from[1] + to[1]) / 2),
    new Vector3(to[0], 0.8, to[1]),
  ), [from, to])
  const ball = useRef<Group>(null)
  const trail = useRef<Group>(null)
  const blast = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const point = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const t = clock()
    const travel = phase(t, 0.12, 0.78)
    curve.getPoint(travel, point)
    if (ball.current) {
      ball.current.visible = t < 0.8
      ball.current.position.copy(point)
      ball.current.scale.setScalar((t < 0.12 ? t / 0.12 : 1) * (0.9 + Math.sin(t * 60) * 0.08))
    }
    trail.current?.children.forEach((child, index) => {
      const k = clamp01(travel - index * 0.035)
      curve.getPoint(k, point)
      child.position.copy(point)
      child.visible = travel > index * 0.035 && t < 0.85
      ;(child as Sprite).material.opacity = (1 - index / 10) * 0.7
      child.scale.setScalar(0.42 - index * 0.03)
    })
    const boom = phase(t, 0.78, 1)
    if (blast.current) {
      blast.current.visible = boom > 0 && boom < 1
      blast.current.scale.setScalar(0.3 + boom * 2.2)
      ;(blast.current.material as MeshBasicMaterial).opacity = (1 - boom) * 0.9
    }
    if (light.current) {
      light.current.position.copy(boom > 0 ? new Vector3(to[0], 1, to[1]) : ball.current?.position ?? point)
      light.current.intensity = boom > 0 ? (1 - boom) * 16 : 4
    }
  })
  return (
    <>
      <group ref={ball}>
        <sprite scale={[0.75, 0.75, 1]}>
          <spriteMaterial map={glowTexture('ember')} color="#fff0a0" transparent blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        <sprite scale={[1.2, 1.2, 1]}>
          <spriteMaterial map={glowTexture('ember')} color={tone} transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
      <group ref={trail}>
        {Array.from({ length: 10 }, (_, index) => (
          <sprite key={index} visible={false}>
            <spriteMaterial map={glowTexture('ember')} color={index % 2 ? '#ff6a1f' : tone} transparent blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <mesh ref={blast} position={[to[0], 0.8, to[1]]} visible={false}>
        <sphereGeometry args={[0.5, 20, 14]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={light} color="#ff8a3a" intensity={0} distance={5} decay={2} />
    </>
  )
}

/**
 * Aviso de zona: antes de que caiga un hechizo de área, cada casilla que va
 * a golpear se ilumina con un círculo de runas que late y se cierra hasta el
 * impacto. Así se ve DÓNDE va a caer antes de que caiga.
 */
export function TargetZone({ targets, tone, durationMs, until = 0.42 }: { targets: readonly (readonly [number, number])[]; tone: string; durationMs: number; until?: number }) {
  const clock = useClock(durationMs)
  const group = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    const k = phase(t, 0, until)
    group.current?.children.forEach((child, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 40 + index)
      child.visible = t < until + 0.06
      const [fill, ring] = child.children as [Mesh, Mesh]
      ;(fill.material as MeshBasicMaterial).opacity = (0.18 + pulse * 0.2) * (t > until ? 1 - (t - until) / 0.06 : 1)
      // El anillo se cierra sobre la casilla: el impacto llega cuando toca el centro.
      ring.scale.setScalar(1.6 - k * 1.1)
      ;(ring.material as MeshBasicMaterial).opacity = 0.4 + k * 0.5
    })
  })
  return (
    <group ref={group}>
      {targets.map((target, index) => (
        <group key={index} position={[target[0], 0.19, target[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.94, 0.94]} />
            <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.36, 0.44, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Curación: columna de luz verde sobre cada objetivo y destellos que suben. */
export function HealingLight({ from, targets, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const points = targets.length > 0 ? targets : [from]
  const columns = useRef<Group>(null)
  const motes = useRef<Group>(null)
  const seeds = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ a: i * 2.4, r: 0.15 + (i % 3) * 0.12, d: i / 10 })), [])
  useFrame(() => {
    const t = clock()
    columns.current?.children.forEach((child) => {
      ;((child as Mesh).material as MeshBasicMaterial).opacity = bell(t) * 0.5
      child.scale.set(1 + bell(t) * 0.3, 1, 1 + bell(t) * 0.3)
    })
    motes.current?.children.forEach((child, index) => {
      const s = seeds[index % seeds.length]!
      const target = points[Math.floor(index / seeds.length)]!
      const k = (t * 1.4 + s.d) % 1
      child.position.set(target[0] + Math.cos(s.a + t * 4) * s.r, 0.3 + k * 2.2, target[1] + Math.sin(s.a + t * 4) * s.r)
      ;(child as Sprite).material.opacity = (1 - k) * bell(t)
    })
  })
  return (
    <>
      <group ref={columns}>
        {points.map((target, index) => (
          <mesh key={index} position={[target[0], 1.6, target[1]]}>
            <cylinderGeometry args={[0.35, 0.45, 3.2, 20, 1, true]} />
            <meshBasicMaterial color="#7dffb0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      <group ref={motes}>
        {points.flatMap((_, p) => seeds.map((__, index) => (
          <sprite key={`${p}-${index}`} scale={[0.14, 0.14, 1]}>
            <spriteMaterial map={glowTexture('nature')} color="#d8ffe0" transparent blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        )))}
      </group>
      <pointLight position={[points[0]![0], 1.2, points[0]![1]]} color="#7dffb0" intensity={4} distance={4} decay={2} />
    </>
  )
}

/** Robo: cartas que salen del Nexo girando y vuelan hacia la cámara (la mano). */
export function DrawCards({ from, tone, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const cards = useRef<Group>(null)
  useFrame(({ camera }) => {
    const t = clock()
    cards.current?.children.forEach((child, index) => {
      const k = phase(t, index * 0.12, 0.6 + index * 0.12)
      child.visible = k > 0 && k < 1
      // Suben del Nexo y se abren en abanico antes de salir hacia la mano.
      const spread = (index - 1) * 0.6
      const start = new Vector3(from[0], 1, from[1])
      const top = new Vector3(from[0] + spread, 2.6, from[1] - 0.5)
      const end = camera.position.clone().lerp(new Vector3(spread, 0, 3), 0.55)
      const position = k < 0.45 ? start.lerp(top, k / 0.45) : top.lerp(end, (k - 0.45) / 0.55)
      child.position.copy(position)
      child.rotation.set(-0.4, k * 6 + index, spread * 0.3)
    })
  })
  return (
    <group ref={cards}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} visible={false}>
          <planeGeometry args={[0.42, 0.6]} />
          <meshBasicMaterial color={index === 1 ? '#fff4d6' : tone} transparent opacity={0.9} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/** Escarcha: una ola de hielo que se abre desde el Nexo y cristales sobre cada objetivo. */
export function FrostWave({ from, targets, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const wave = useRef<Mesh>(null)
  const shards = useRef<Group>(null)
  const points = targets.length > 0 ? targets : [from]
  useFrame(() => {
    const t = clock()
    if (wave.current) {
      const k = phase(t, 0.05, 0.7)
      wave.current.visible = k > 0 && k < 1
      wave.current.scale.setScalar(0.5 + k * 9)
      ;(wave.current.material as MeshBasicMaterial).opacity = (1 - k) * 0.6
    }
    shards.current?.children.forEach((child, index) => {
      const k = phase(t, 0.35 + (index % 4) * 0.04, 0.6 + (index % 4) * 0.04)
      child.visible = t > 0.35
      child.scale.set(0.07, 0.07 + k * 0.32, 0.07)
      ;((child as Mesh).material as MeshBasicMaterial).opacity = t > 0.85 ? (1 - t) / 0.15 : 0.85
    })
  })
  return (
    <>
      {points.length > 1 && <TargetZone targets={points} tone="#7fd8ff" durationMs={durationMs} until={0.32} />}
      <mesh ref={wave} position={[from[0], 0.2, from[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.4, 0.55, 64]} />
        <meshBasicMaterial color="#bff0ff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={shards}>
        {points.flatMap((target, p) => [0, 1, 2, 3].map((index) => {
          const angle = index * 1.57 + p
          return (
            <mesh key={`${p}-${index}`} position={[target[0] + Math.cos(angle) * 0.3, 0.3, target[1] + Math.sin(angle) * 0.3]} rotation={[Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4]} visible={false}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#dff6ff" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          )
        }))}
      </group>
    </>
  )
}

/** Bendición: anillos dorados que suben por cada aliado mejorado. */
export function Blessing({ from, targets, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const points = targets.length > 0 ? targets : [from]
  const rings = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    rings.current?.children.forEach((child, index) => {
      const k = phase(t, (index % 3) * 0.12, 0.6 + (index % 3) * 0.12)
      child.visible = k > 0 && k < 1
      child.position.y = 0.2 + k * 1.6
      child.scale.setScalar(1 - k * 0.4)
      ;((child as Mesh).material as MeshBasicMaterial).opacity = bell(k) * 0.85
    })
  })
  return (
    <group ref={rings}>
      {points.flatMap((target, p) => [0, 1, 2].map((index) => (
        <mesh key={`${p}-${index}`} position={[target[0], 0.2, target[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.38, 0.46, 40]} />
          <meshBasicMaterial color="#ffd76a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      )))}
    </group>
  )
}

/** Juicio: un rayo de luz cae del cielo sobre el objetivo y lo envuelve. */
export function SkyJudgement({ from, targets, tone, durationMs }: SpellProps) {
  const clock = useClock(durationMs)
  const points = targets.length > 0 ? targets : [from]
  const beams = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame(() => {
    const t = clock()
    const k = phase(t, 0.2, 0.9)
    beams.current?.children.forEach((child) => {
      ;((child as Mesh).material as MeshBasicMaterial).opacity = bell(k) * 0.85
      child.scale.set(0.3 + bell(k) * 0.9, 1, 0.3 + bell(k) * 0.9)
    })
    if (light.current) light.current.intensity = bell(k) * 14
  })
  return (
    <>
      <group ref={beams}>
        {points.map((target, index) => (
          <mesh key={index} position={[target[0], 4.5, target[1]]}>
            <cylinderGeometry args={[0.32, 0.4, 9, 20, 1, true]} />
            <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[points[0]![0], 1.5, points[0]![1]]} color={tone} intensity={0} distance={5} decay={2} />
    </>
  )
}

/** Empuje: onda de choque que sale del lanzador hacia los objetivos. */
export function PushWave({ from, durationMs, tone }: SpellProps) {
  const clock = useClock(durationMs)
  const rings = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    rings.current?.children.forEach((child, index) => {
      const k = phase(t, index * 0.15, 0.7 + index * 0.15)
      child.visible = k > 0 && k < 1
      child.scale.setScalar(0.5 + k * 7)
      ;((child as Mesh).material as MeshBasicMaterial).opacity = (1 - k) * 0.7
    })
  })
  return (
    <group ref={rings} position={[from[0], 0.3, from[1]]}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.45, 0.6, 64]} />
          <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
