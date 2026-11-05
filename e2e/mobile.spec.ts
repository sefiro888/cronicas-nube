import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch } from '../src/game'
import type { BoardPiece, MatchState, PlayerId, Position } from '../src/game'

/**
 * Ninguna pantalla puede desbordar a lo ancho en un móvil pequeño.
 *
 * Es una regresión que se cuela sola: al añadir «Torre» al menú, la barra de
 * navegación pasó a medir más que la pantalla y arrastraba TODA la página de
 * lado (se leía «CIO» en vez de «INICIO»). Nadie lo nota desde el escritorio.
 */
const PANTALLAS = ['/', '/play', '/tower', '/gallery', '/decks', '/multiplayer', '/settings'] as const

for (const ruta of PANTALLAS) {
  test(`sin desborde horizontal en móvil: ${ruta}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ruta)
    await page.waitForTimeout(600)
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(desborde, `${ruta} se sale ${desborde}px a lo ancho`).toBeLessThanOrEqual(0)
  })
}

test('el menú se puede recorrer entero en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  // Todas las secciones siguen ahí aunque no quepan a la vez: la barra se
  // desplaza sola en vez de empujar la página.
  for (const nombre of ['Inicio', 'Jugar', 'Torre', 'Multijugador', 'Galería', 'Mazos']) {
    await expect(page.getByRole('link', { name: nombre, exact: true })).toBeAttached()
  }
  const nav = page.getByLabel('Navegación principal')
  const desplazable = await nav.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(desplazable).toBe(true)
})

/**
 * Nada que se pulse puede quedarse por debajo de la medida de un pulgar.
 *
 * Medido en un móvil de 390 px, el constructor de mazos tenía 35 objetivos por
 * debajo del umbral —los −/+ de ajustar copias salían a 28×28, y son los que
 * más se tocan de toda la pantalla— y los deslizadores de volumen respondían
 * solo en los 4 px de grosor del carril.
 *
 * El umbral es 32 px porque los interruptores de Ajustes conservan su dibujo
 * de 56×32 y amplían la zona sensible con un pseudo-elemento, que no aparece
 * en las medidas del elemento.
 */
const RUTAS_TACTILES = ['/play', '/tower', '/gallery', '/decks', '/multiplayer', '/settings'] as const

for (const ruta of RUTAS_TACTILES) {
  test(`objetivos táctiles suficientes en ${ruta}`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(ruta)
    await page.waitForTimeout(900)
    const pequenos = await page.evaluate(() => {
      const MIN = 32
      const salida: string[] = []
      for (const el of Array.from(document.querySelectorAll('button, select, input[type="range"], input[type="text"]'))) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        if (rect.width < MIN || rect.height < MIN) {
          const texto = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)
          salida.push(`${Math.round(rect.width)}x${Math.round(rect.height)} · ${texto}`)
        }
      }
      return salida
    })
    expect(pequenos, `objetivos demasiado pequeños en ${ruta}`).toEqual([])
  })
}

/**
 * Las chapas de las unidades no pueden pisarse en un móvil.
 *
 * Con media docena de unidades en juego a 390 px, los nombres se superponían
 * en la misma franja y no se leía ninguno. En pantalla estrecha la chapa
 * enseña solo Ataque y Vida, y el nombre aparece únicamente en la unidad
 * elegida — que es cuando de verdad hace falta.
 */
const piezaDePrueba = (instanceId: string, cardId: string, owner: PlayerId, position: Position): BoardPiece => {
  const card = CARD_BY_ID[cardId]!
  return {
    instanceId, cardId, owner, position,
    currentHealth: card.health ?? card.resistance ?? 1,
    attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
  }
}

const partidaPoblada = (): MatchState => {
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 1311657807)
  return {
    ...base, turn: 8, phase: 'main', activePlayer: 'player',
    board: [
      piezaDePrueba('a1', 'ariete-volcanico', 'player', { x: 2, y: 5 }),
      piezaDePrueba('a2', 'sabueso-brasa', 'player', { x: 4, y: 4 }),
      piezaDePrueba('a3', 'lancera-magma', 'player', { x: 5, y: 6 }),
      piezaDePrueba('e1', 'centinela-cristal', 'ai', { x: 3, y: 3 }),
      piezaDePrueba('e2', 'golem-azur', 'ai', { x: 4, y: 2 }),
      piezaDePrueba('e3', 'tejedora-escarcha', 'ai', { x: 1, y: 2 }),
    ],
  }
}

test('las chapas de las unidades no se pisan en móvil', async ({ page }) => {
  test.setTimeout(120_000)
  const fixture = partidaPoblada()
  await page.addInitScript((match) => {
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({
      state: { match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 },
      version: 2,
    }))
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
      state: { muted: true, confirmEndTurn: false }, version: 7,
    }))
  }, fixture)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/battle')
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
  await expect(page.locator('[class*="cardLabel"]')).toHaveCount(fixture.board.length, { timeout: 25000 })
  await page.waitForTimeout(3000)

  const solapes = await page.evaluate(() => {
    const chapas = Array.from(document.querySelectorAll('[class*="cardLabel"]')).map((el) => el.getBoundingClientRect())
    const cruces: string[] = []
    for (let i = 0; i < chapas.length; i += 1) {
      for (let j = i + 1; j < chapas.length; j += 1) {
        const a = chapas[i]!
        const b = chapas[j]!
        const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (ancho > 6 && alto > 6) cruces.push(`${Math.round(ancho)}x${Math.round(alto)}`)
      }
    }
    return cruces
  })
  expect(solapes, 'chapas de unidad superpuestas en móvil').toEqual([])

  // El rediseño conserva nombre y estadísticas en reposo y sigue seleccionable por teclado.
  const nombresVisibles = () => page.evaluate(() => Array.from(document.querySelectorAll('[class*="cardName"]'))
    .filter((el) => (el as HTMLElement).offsetParent !== null).length)
  expect(await nombresVisibles()).toBe(await page.locator('[class*="cardLabel"]').count())
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  await expect(page.locator('[class*="labelInner"][data-selected] [class*="cardName"]').first()).toBeVisible()
})

/**
 * En móvil la barra de secciones no cabe y se desplaza de lado. Al entrar en
 * una del final (Mazos es la última) se quedaba al principio: ni el nombre ni
 * el subrayado de la sección activa se veían, así que no había forma de saber
 * dónde estabas.
 */
test('en móvil, la sección activa de la barra se ve sin desplazarla a mano', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/decks')
  const activo = page.locator('nav [data-active="true"]')
  await expect(activo).toHaveText('Mazos')
  await expect(activo).toBeInViewport({ ratio: 0.9 })
})

/**
 * Y lo mismo DENTRO de la batalla, que es donde más se toca y donde estaban
 * los peores: el botón de salir a 55×29, el de recoger la mano a 100×24 y los
 * cuatro botones flotantes a 30×30.
 *
 * Este caso necesita `hasTouch`: sin él Playwright deja el puntero fino y las
 * reglas `@media (hover: none) and (pointer: coarse)` del proyecto —que son
 * varias— no llegan a aplicarse, así que se estaría midiendo una ventana
 * estrecha con ratón en vez de un móvil.
 */
test.describe('en la batalla', () => {
  test.use({ hasTouch: true, isMobile: true })

  /**
   * Elegir una carta no puede esconder el botón de terminar el turno.
   *
   * Pasaba: el abanico levanta la carta seleccionada, y esas cartas se
   * pintaban por encima del botón. El z-index del dock (46) se compara dentro
   * del contexto de apilamiento de su padre `.rightPanel`, que valía 20, por
   * debajo del carril de la mano (25) — así que el 46 no servía de nada.
   */
  test('el botón de finalizar turno no queda debajo de la mano', async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
        state: { muted: true, confirmEndTurn: false }, version: 7,
      }))
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/battle?seed=1311657807')
    await page.getByRole('button', { name: /Conservar las diez/i }).click()
    await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 4000 }).catch(() => {})
    await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(2500)
    await page.locator('[class*="fanCard"]').nth(3).click()
    await page.waitForTimeout(1200)

    const estado = await page.evaluate(() => {
      const boton = document.querySelector('[class*="endTurn"]') as HTMLElement | null
      if (!boton) return 'no existe'
      const caja = boton.getBoundingClientRect()
      const encima = document.elementFromPoint(caja.x + caja.width / 2, caja.y + caja.height / 2)
      return encima === boton || boton.contains(encima) ? 'libre' : `tapado por ${encima?.className}`
    })
    expect(estado).toBe('libre')
  })

  test('nada de lo que se pulsa en el tablero baja de la medida del pulgar', async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
        state: { muted: true, confirmEndTurn: false }, version: 7,
      }))
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/battle?seed=1311657807')
    await page.getByRole('button', { name: /Conservar las diez/i }).click()
    await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 4000 }).catch(() => {})
    await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(2500)

    const pequenos = await page.evaluate(() => {
      const MIN = 34
      // La estrella de «fijar carta» dibuja 34 px y estira su zona sensible
      // con un pseudo-elemento; el abanico la escala, así que su caja mide
      // menos de lo que responde al dedo.
      const salida: string[] = []
      for (const el of Array.from(document.querySelectorAll('button'))) {
        if (el.className.includes('favoriteToggle')) continue
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        if (rect.width < MIN || rect.height < MIN) {
          const texto = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)
          salida.push(`${Math.round(rect.width)}x${Math.round(rect.height)} · ${texto}`)
        }
      }
      return salida
    })
    expect(pequenos, 'objetivos demasiado pequeños en la batalla').toEqual([])
  })
})

/**
 * La galería tiene que poder explorarse con el pulgar.
 *
 * Con 145 cartas a una por fila medía 51.600 px de scroll —más de sesenta
 * pantallas seguidas— y encontrar una carta concreta era imposible. A dos
 * columnas baja a menos de la mitad.
 */
test('en móvil la galería va a dos columnas, no a una tira infinita', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/gallery')
  await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 20_000 })

  // Las dos primeras cartas comparten fila: misma altura, distinta columna.
  const primera = (await page.locator('[data-card-id]').nth(0).boundingBox())!
  const segunda = (await page.locator('[data-card-id]').nth(1).boundingBox())!
  expect(Math.abs(primera.y - segunda.y)).toBeLessThan(8)
  expect(segunda.x).toBeGreaterThan(primera.x + primera.width - 1)

  // El catálogo crece con cada facción: el límite fijo para 145 cartas
  // fallaba con 424 aunque siguieran en dos columnas y con el mismo tamaño.
  // Se limita la altura por fila para detectar huecos o cartas desmesuradas.
  const alto = await page.evaluate(() => document.documentElement.scrollHeight)
  const filas = Math.ceil(await page.locator('[data-card-id]').count() / 2)
  expect(alto, 'la galería se ha vuelto a estirar por fila').toBeLessThan(filas * 300 + 2000)
})

/**
 * El coste tiene que verse al montar un mazo, también en el móvil.
 *
 * «Coste 3» no cabía a la derecha de cada fila en una pantalla estrecha, así
 * que estaba oculto — justo el dato que se mira para decidir qué entra y qué
 * sale. Ahora se muestra como una chapa con el número.
 */
test('en móvil, el constructor de mazos sigue enseñando el coste de cada carta', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/decks')
  const filas = page.locator('article[class*="entry"]')
  await expect(filas.first()).toBeVisible({ timeout: 20_000 })

  // Toda fila del mazo enseña su coste, y la chapa se ve de verdad.
  const chapas = page.locator('article[class*="entry"] [class*="costShort"]')
  expect(await chapas.count()).toBe(await filas.count())
  const caja = (await chapas.first().boundingBox())!
  expect(caja.width).toBeGreaterThan(18)
  expect(caja.height).toBeGreaterThan(18)
})

/**
 * El mulligan es la primera pantalla de cada partida y en el móvil salía rota.
 *
 * Diez tarjetas de 132 px no caben en una fila de 375, así que flex las
 * encogía a 62 y el nombre se partía en tres líneas que se salían de la
 * tarjeta y se pisaban con la etiqueta de estado. Con tres columnas cada una
 * recupera ancho.
 */
for (const ancho of [375, 390]) {
  test(`el mulligan cabe y se lee en un móvil de ${ancho}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
        state: { muted: true, confirmEndTurn: false }, version: 7,
      }))
    })
    await page.setViewportSize({ width: ancho, height: ancho === 375 ? 812 : 844 })
    await page.goto('/battle?seed=1311657807')
    await expect(page.getByRole('button', { name: /Conservar las diez/i })).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1200)

    const cartas = await page.evaluate(() => {
      // Ojo: `[class*="mulliganCard"]` casa también con el contenedor
      // `mulliganCards`. Las tarjetas son los <button>.
      const nodos = Array.from(document.querySelectorAll('button[class*="mulliganCard"]')) as HTMLElement[]
      return nodos
        .filter((nodo) => nodo.querySelector('strong'))
        .map((nodo) => {
          const nombre = nodo.querySelector('strong') as HTMLElement
          return {
            ancho: Math.round(nodo.getBoundingClientRect().width),
            desborda: nombre.scrollWidth > nombre.clientWidth + 1,
          }
        })
    })
    expect(cartas).toHaveLength(10)
    for (const carta of cartas) {
      expect(carta.ancho, 'tarjeta demasiado estrecha').toBeGreaterThan(70)
      expect(carta.desborda, 'el nombre se sale de la tarjeta').toBe(false)
    }
  })
}

/**
 * El resumen de fin de partida es lo último que ve el jugador y en un móvil va
 * justo de alto: con gráfica, racha, reto diario y dos logros llega casi al
 * borde. Aquí se comprueba que cabe entero, que los botones quedan dentro de
 * la pantalla y que nada de lo que se pulsa baja de la medida del pulgar.
 */
for (const ancho of [375, 390]) {
  test(`el resumen de fin de partida cabe en un móvil de ${ancho}`, async ({ page }) => {
    test.setTimeout(90_000)
    const historial = Array.from({ length: 20 }, (_, index) => ({
      turn: index + 1,
      player: Math.max(6, 35 - index * 1.4),
      ai: Math.max(0, 35 - index * 1.7),
    }))
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
        state: { muted: true, confirmEndTurn: false }, version: 7,
      }))
    })

    // Jugar veinte turnos de verdad sería lento y frágil: la partida terminada
    // se siembra ya resuelta.
    const { STARTER_DECKS, createMatch } = await import('../src/game')
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 99)
    const match = {
      ...base,
      turn: 20,
      phase: 'finished' as const,
      winner: 'player' as const,
      players: {
        ...base.players,
        player: {
          ...base.players.player, mulliganTaken: true, nexusHealth: 6,
          stats: { cardsPlayed: 22, damageDealt: 58 },
        },
        ai: { ...base.players.ai, mulliganTaken: true, nexusHealth: 0 },
      },
    }
    await page.addInitScript(([m, h]) => {
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({
        state: {
          match: m, history: [], matchLog: [], healthHistory: h,
          startedAtMs: Date.now() - 900000, elapsedSeconds: 912,
        },
        version: 2,
      }))
    }, [match, historial] as const)

    await page.setViewportSize({ width: ancho, height: ancho === 375 ? 812 : 844 })
    await page.goto('/battle')
    await expect(page.getByRole('button', { name: /Volver al inicio/i })).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    const medida = await page.evaluate(() => {
      const acciones = document.querySelector('[class*="resultActions"]') as HTMLElement | null
      const descarga = document.querySelector('[class*="downloadLog"]') as HTMLElement | null
      const caja = acciones?.getBoundingClientRect()
      const cajaDescarga = descarga?.getBoundingClientRect()
      return {
        botonesDentro: caja ? caja.top >= 0 && caja.bottom <= window.innerHeight : false,
        descargaAlto: cajaDescarga ? Math.round(cajaDescarga.height) : 0,
        // El aviso flotante de logros no puede solaparse con el resumen: lo
        // duplica y le quita alto a una pantalla que va justa.
        avisoFlotante: document.querySelectorAll('[class*="toast"]').length,
      }
    })
    expect(medida.botonesDentro, 'los botones del resumen se salen de la pantalla').toBe(true)
    expect(medida.descargaAlto, 'descargar el registro es un botón y se pulsa').toBeGreaterThanOrEqual(38)
    expect(medida.avisoFlotante, 'el aviso de logros duplica el resumen').toBe(0)

    // Y la gráfica dice con cuánta Vida acabó cada uno, no solo que bajaban.
    await expect(page.getByText(/Tu Nexo · \d+/)).toBeVisible()
  })
}
