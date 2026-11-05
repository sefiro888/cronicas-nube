import { useLayoutEffect, useRef } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { timberMaps } from '../../materials/timberMaterial'

let spray: BufferGeometry | undefined
function needleSpray() {
  if (spray) return spray
  const vertices: number[] = []
  for (let row = 0; row < 8; row += 1) {
    const z = row * .055
    const width = .16 * (1 - row / 9)
    for (const side of [-1, 1]) {
      vertices.push(0, 0, z, side * width, .018, z + .09, 0, .012, z + .055)
    }
  }
  spray = new BufferGeometry()
  spray.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  spray.computeVertexNormals()
  return spray
}

/** Las ramas independientes rompen la silueta de cono y dejan ver el tronco
 * a contraluz. Se agrupan en una llamada por árbol para conservar el coste. */
export function ShorePine({ seed }: { readonly seed: number }) {
  const foliage = useRef<InstancedMesh>(null)
  const count = 240
  useLayoutEffect(() => {
    const mesh = foliage.current
    if (!mesh) return
    const transform = new Object3D()
    const tint = new Color()
    for (let index = 0; index < count; index += 1) {
      const tier = Math.floor(index / 16)
      const fraction = tier / 15
      const angle = index * 2.39996 + seed
      const radius = (.48 * (1 - fraction) + .06) * (.35 + (index % 4) * .19)
      transform.position.set(Math.cos(angle) * radius,
        .5 + fraction * 1.72 + Math.sin(index * 4.1) * .04, Math.sin(angle) * radius)
      transform.rotation.set(-.1 + fraction * .6, Math.PI / 2 - angle, Math.sin(index) * .18)
      transform.scale.set(.75 - fraction * .4, 1, .9 - fraction * .5)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
      tint.setHSL(.39 + Math.sin(index * 3.7 + seed) * .025, .23, .21 + (index % 5) * .016)
      mesh.setColorAt(index, tint)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [seed])
  return <group>
    <mesh position={[0, 1.03, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[.026, .11, 2.12, 9]} />
      <meshStandardMaterial {...timberMaps()} color="#706052" roughness={1} bumpScale={.045} />
    </mesh>
    <instancedMesh ref={foliage} args={[undefined, undefined, count]} castShadow receiveShadow>
      <primitive attach="geometry" object={needleSpray()} />
      <meshStandardMaterial color="#d9e0d6" roughness={1} side={DoubleSide} />
    </instancedMesh>
  </group>
}
