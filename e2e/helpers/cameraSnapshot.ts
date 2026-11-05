import type { Page } from '@playwright/test'
import type { RootState } from '@react-three/fiber'
import type { Color, Mesh, MeshStandardMaterial, Object3D } from 'three'

/** Usar el módulo optimizado que cargó la página evita consultar otro mapa
 * de raíces tras una recarga de Vite. Registrar la espera antes de goto. */
export async function fiberModuleUrl(page: Page): Promise<string> {
  const response = await page.waitForResponse((entry) => {
    const path = new URL(entry.url()).pathname
    return path.includes('/node_modules/.vite/deps/') && path.endsWith('/@react-three_fiber.js')
  }, { timeout: 25000 })
  return response.url()
}

export async function cameraSnapshot(page: Page, moduleUrl: string) {
  return page.evaluate(async (url) => {
    const module = await import(url) as {
      _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
    }
    const safe = document.querySelector('[data-testid="battle-board"]')
    const canvas = safe?.querySelector('canvas')
    if (!safe || !canvas) throw new Error('No hay un tablero listo para medir la cámara.')
    const state = module._roots.get(canvas)?.store.getState()
    if (!state) throw new Error('La raíz de Three no pertenece al módulo observado.')
    state.camera.updateMatrixWorld()
    const context = state.gl.getContext()
    const debug = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER))
    const rect = (element: Element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    }
    return {
      canvas: rect(canvas), safe: rect(safe), position: state.camera.position.toArray(),
      matrixWorld: [...state.camera.matrixWorld.elements],
      projection: [...state.camera.projectionMatrix.elements],
      background: (state.scene.background as Color | null)?.getHexString?.() ?? null,
      fog: state.scene.fog?.color.getHexString() ?? null,
      rendering: { renderer, calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles,
        geometries: state.gl.info.memory.geometries, textures: state.gl.info.memory.textures },
    }
  }, moduleUrl)
}

/** Proyecta la cara real: una placa de información puede cambiar de sitio sin mover la ficha. */
export async function pieceScreenSpot(page: Page, moduleUrl: string, pieceId: string) {
  return page.evaluate(async ({ url, pieceId }) => {
    const module = await import(url) as {
      _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
    }
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
    const state = module._roots.get(canvas)?.store.getState()
    if (!state) throw new Error('El tablero no está listo para proyectar la ficha.')
    const found: { group?: Object3D; face?: Object3D } = {}
    state.scene.traverse((object) => { if (object.userData.pieceId === pieceId) found.group = object })
    found.group?.traverse((object) => {
      const image: unknown = (object as Mesh<Mesh['geometry'], MeshStandardMaterial>).material?.map?.image
      if (!found.face && image instanceof HTMLCanvasElement && image.width === 512 && image.height === 768) found.face = object
    })
    if (!found.face) throw new Error(`No se encontró la cara renderizada de ${pieceId}.`)
    state.camera.updateMatrixWorld()
    const point = found.face.getWorldPosition(found.face.position.clone()).project(state.camera)
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 }
  }, { url: moduleUrl, pieceId })
}

/** Las sondas artísticas necesitan vistas repetibles. Los gestos reales ya
 * se comprueban en calidad de vida; aquí fijar la pose evita que el número
 * de frames por software determine el ángulo que acaba fotografiándose. */
export async function poseCamera(page: Page, moduleUrl: string, position: readonly [number, number, number]) {
  await page.evaluate(async ({ url, position }) => {
    const module = await import(url) as {
      _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
    }
    const canvas = document.querySelector('[data-testid="battle-board"] canvas') as HTMLCanvasElement | null
    const state = canvas ? module._roots.get(canvas)?.store.getState() : undefined
    const controls = state?.controls as unknown as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | undefined
    if (!state || !controls) throw new Error('No hay cámara con controles para preparar la vista.')
    state.camera.position.set(...position)
    controls.target.set(0, 0, 0)
    controls.update()
    state.invalidate()
  }, { url: moduleUrl, position })
  return cameraSnapshot(page, moduleUrl)
}
