# Guía de trabajo del repositorio

**Si acabas de llegar, empieza por «Traspaso vigente» en `docs/ESTADO-Y-SIGUIENTE.md`.**
Ahí está el estado real del proyecto, las trampas que ya han costado tiempo y
una lista de ideas de mejora de la que puedes tirar. Este archivo son las
reglas; aquel es el mapa.

## Qué es esto

«Crónicas del Nexo»: juego táctico de cartas 1v1 contra la IA, tablero 8×8 en
3D. React 19 + TypeScript estricto + Vite + Three.js/React Three Fiber +
Zustand + Zod. Se despliega solo a GitHub Pages en cada push a `main`.

El idioma del proyecto es el **español**: nombres de cartas, textos de interfaz,
comentarios de código y mensajes de commit. El código (identificadores, tipos)
va en inglés como es costumbre.

## Principios

- Mantén TypeScript estricto y evita `any`.
- El motor de reglas vive en `src/game` y no puede depender de React, Three.js
  ni del DOM.
- Los datos de cartas se validan mediante Zod al cargarse.
- Las animaciones consumen eventos ya resueltos: nunca deciden resultados del
  juego.
- Conserva la carta como representación de cada unidad y estructura sobre el
  tablero.
- No introduzcas arte, audio, marcas o textos de terceros sin licencia
  verificable.

## Contenido

- Los mazos iniciales deben seguir teniendo 50 cartas: 20 de maná y 30 no maná.
- Una carta normal admite como máximo cuatro copias; una única, una copia.
- Todo `card.id` necesita un SVG en `public/assets/cards/art/<card-id>.svg`.
- El WebP definitivo usa el mismo nombre y tiene prioridad automática sobre el
  SVG.
- Actualiza `docs/art-direction.md` y las pruebas cuando añadas cartas.
- Antes de escribir prompts de arte, lee `docs/GUIA-PROMPTS-ARTE.md`.

## Verificación mínima

Antes de entregar cambios ejecuta:

```bash
npm run test
npm run build
npm run lint
```

Si el cambio toca navegación o batalla, ejecuta también `npm run test:e2e` y
revisa a 1920 × 1080 y 1366 × 768.

**Hay recuentos codificados a mano que el CI comprueba** (número de cartas, de
facciones, de comandantes, de mazos). Si añades contenido, `npm run test` te
dirá cuáles hay que subir. Están listados en `docs/ESTADO-Y-SIGUIENTE.md`.

## Cómo se escribe aquí

Los comentarios del código de este repositorio explican **por qué**, no qué.
Si una constante vale 0,42 y no 0,8, el comentario dice qué se rompía con 0,8.
Mantén ese estilo: hay mucha física de render y mucho equilibrio de juego donde
el valor concreto es el resultado de una prueba fallida, y sin esa nota el
siguiente que pase lo «arregla» y vuelve a romperlo.

Lo mismo en los mensajes de commit: cuentan el problema y el porqué de la
solución, no la lista de archivos tocados.
