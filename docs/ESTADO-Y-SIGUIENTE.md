# Estado del proyecto y por dónde seguir

## TRASPASO A CODEX — 4 de noviembre de 2026 (léelo primero)

El propietario pasa el proyecto a Codex (también para generar imágenes).
Resumen de dónde está todo; el detalle de cada bloque va en las notas de
debajo, de la más reciente a la más antigua.

**Dónde está el trabajo**
- **Integrado en `main` de `sefiro888/cronicas-nube`** (PR #1 fusionado el
  4 de noviembre de 2026 a petición del propietario). Trabajar desde `main`
  en ramas nuevas con PR. Nada de esto está en `sefiro888/magicfable` (el
  juego oficial): **el propietario pidió no tocar `magicfable` de momento**.
- Vista previa pública: https://sefiro888.github.io/cronicas-nube/ — se
  publica sola con cada push a `main` o a una rama `claude/**`
  (`.github/workflows/vista-previa.yml`, rama `gh-pages`): enseña lo último
  que se haya subido de cualquiera de ellas.
- Si algún día se lleva a `magicfable`: rama con PR, comprobando antes si
  `magicfable` cambió desde la copia (`a8f9c72`). Solo cuando él lo pida.

**Qué se hizo (todo presentación; reglas y equilibrio intactos)**
Glosario con identidad e iconos, panel «Qué hace», escena del poder del
comandante, duelo por rareza, ataques por tipo de criatura, Nexo de cristal
con corona 3D, golpe final, combos, reacciones y muertes por criatura,
clima y luz de tensión, cartas vivas, cámara, música y sonidos por ataque,
cara a cara inicial, final épico, repetir jugada, previsión al apuntar,
flechas de amenaza, habilidades animadas, cadena, animación por hechizo,
firma y marco por facción, frases de comandantes, sobres y Álbum, títulos,
marcos y racha, epitafios, botón «Rematar», suelo de lava de la Caldera,
página de Mazos y menú nuevos. 747 pruebas unitarias.

**Decisiones del propietario que hay que respetar**
- Todo el texto en español, también los mensajes de trabajo.
- Sin figuras 3D en lugar de fichas (descartado).
- Quitado el mapa rojo de casillas en peligro: no lo quiere (el juego debe
  ser menos predecible). Sí quiere las flechas de amenaza.
- No hay contrahechizos en las reglas y no se inventan sin su permiso.
- Los sobres son solo de colección: no limitan mazos (cambiarlo es de reglas).
- Arte nuevo: el suyo hecho con Gemini vale (procedencia confirmada).

**Pendiente, por prioridad**
1. Rendimiento: control de intensidad de efectos en Ajustes y calidad
   automática si va lento. La e2e «las chapas de las unidades no se pisan en
   móvil» es intermitente en la Caldera (pasa en `main`): las fichas tardan
   en salir. Revisar con GPU.
2. Repaso en móvil de lo nuevo (sobres, álbum, cara a cara, bocadillos,
   sellos, Mazos).
3. Ritmo: una partida del propietario duró 111 min en 21 turnos; medir y
   ajustar el ritmo «Normal».
4. IA de Goblins y Tercios (ver `docs/EQUILIBRIO-2026-10-31.md`).
5. Suelos propios por facción como el de lava (ver abajo).

**Encargos de imagen (para Codex)**
- Suelos por facción: textura cenital de terreno, 2048 × 2048, sin marco,
  sin río/elemento dominante en el centro (o separado aparte, como el río
  de lava). Cómo se montó la lava: nota «Suelo de lava de la Caldera» y
  `NATURAL_TILE_MAPS` / `LavaTileMaterial` / `LavaRiver.tsx` en
  `src/battle/Board3D.tsx`. Mapas actuales en `public/assets/terrain/`.
- Antes de generar arte, leer `docs/GUIA-PROMPTS-ARTE.md` y
  `docs/INTERFAZ-MUNDOS-2026-11-01.md` (inventario: los WebP se versionan,
  los maestros PNG no están en Git).

**Pruebas en la nube**: sin GPU varias e2e fallan por tiempo igual que en
`main` (lista en notas de abajo). Para capturas fiables: congelar reloj y
animaciones (`e2e/battle-spectacle-shots.spec.ts`).

---

## Sesión nocturna — 5 de noviembre de 2026 (Codex)

Corte acordado a las 10:00, hora de Madrid. Solo `cronicas-nube`, en ramas
locales por bloque. Conservar el punto de retoma al cerrar cada bloque.

- **Coste y mano jugable, terminado en `codex/coste-y-mano`.** El motor
  comparte el coste por copia con mano, inspector y despliegue. La señal
  LISTA usa turno, pago, objetivo, despliegue y sacrificio. Las pruebas
  cubren Renacer + Mandato y hechizos con Esencia sin objetivo. Pasaron 749
  unitarias, compilación, lint y la prueba de mano en 1920, 1366 y 390 px.
- **Escenarios exclusivos, terminados en `316cfed`.** Cada facción tiene
  un mapa distinto. Se crearon siete panoramas originales con ImageGen y
  arquitectura 3D propia. Maestros en `tools/art-inbox/panoramas-facciones/`.
- **Suelos, terminados en `fb48d9d`.** El escenario determina el suelo
  también en selección manual. Se incorporaron los PNG aprobados de Samsara
  y Quinto Sol. Duna conserva su diseño. Pasó la revisión 38/38 de las 19
  facciones a 1920 × 1080 en Automático y a 1366 × 768 con mapa manual.
- **Nexo en duelo, implementado.** Relicario con pedestal, cristal facetado,
  brazos y medallones laterales, emblema de facción y Vida accesible. Prueba
  real de ataque y capturas a 1366 y 1920 px en `tools/captures/nexo-duelo*`.
- **Interfaz de batalla, terminada en `codex/interfaz-batalla`.** Los
  controles de cámara, ayuda y glosario están en el flujo de la cabecera y
  separados de la Vida rival. La mano tiene atriles laterales de reserva y
  contexto. La Esencia usa el emblema de cada facción dentro de cristales
  facetados, con estados de gasto. En móvil queda encima del botón de turno.
  Pasaron 13 e2e de interfaz y la comprobación adicional de reserva visible
  y controles sin solapamientos a 1920, 1366 y 390 px. Compilación y lint verdes.
- **Marco de Olimpo, terminado.** Original aprobado conservado en
  `tools/art-inbox/cartas-faccion/marco-olimpo-aprobado.png`, WebP propio y
  coordenadas medidas para los títulos, reglas y medallones. Pasaron las
  dos vistas de batalla y la prueba de encaje del texto de la galería.
- **Siguiente:** validación global y repaso de regresiones.
- **En cola:** marco de Olimpo elegido. Los otros tres chasis generados
  siguen como propuestas pendientes de valoración.

---

## Chasis y suelos de facción — 4 de noviembre de 2026 (Codex)

- La rama local `codex/arte-de-facciones` incorpora la prueba de Fimbul y
  extiende su composición a los 15 chasis entregados. Las coordenadas del
  título, coste, ilustración, reglas y medallones se miden por plantilla en
  `src/presentation/cardFrames.ts`. La carta HTML y la ficha de batalla
  comparten esa configuración. Los originales se conservan en `tools/art-inbox/`.
- Los 18 suelos propios disponibles se aplican en el escenario natal del
  comandante local. Las facciones que comparten escenario conservan cada una
  su suelo. Furia mantiene la roca, el brillo y el río ya adaptados en la
  Caldera. Los grabados completos se reparten entre las 64 losas.
- Pendientes de archivo original: chasis de Orden, Olimpo, Sombra y Vacío,
  y suelo de Samsara. Los PNG etiquetados Samsara y Quinto Sol son idénticos.
  El motivo de calendario solar se usa en Quinto Sol, pendiente de
  confirmación. Samsara conserva la arenisca del ghat.
- Capturas por facción en `tools/captures/facciones/`. Para reproducirlas,
  ejecutar `npm run test:e2e -- e2e/faction-art-shots.spec.ts` con
  `RUN_FACTION_SHOTS=1`.

---

## Prueba de carta y suelo de Fimbul — 4 de noviembre de 2026 (Codex)

- Primera facción elegida por el propietario. Originales en
  `tools/art-inbox/cartas-faccion/` y `tools/art-inbox/suelos-faccion/`.
  El juego carga los WebP derivados `fimbul-hielo-v1.webp` y
  `suelo-fimbul-v1.webp` en las carpetas públicas de marcos y terreno.
- Referencia del chasis: Furia, commit `bbdf2c0` de la copia de consulta.
  El recorte de la ventana de Fimbul se comparte entre la carta HTML y las
  dos caras de la ficha 3D. Se reutiliza la ilustración de cada carta.
- El grabado del fiordo se reparte entre las 64 losas. Las juntas físicas
  separan las casillas y la veladura de la Caldera da contraste a los destinos.
- Tras probar el Escudero del Thing, se centró el título, se ajustaron el
  pergamino y el medallón de Vida y se corrigió el glosario en carta completa.
  El inspector muestra las cifras actuales al abrir una ficha de Fimbul.
- Revisión local a 1920 × 1080 y 1366 × 768 en
  `tools/captures/fimbul/`. Pendiente de valoración antes de aplicar el
  criterio a otra facción.

---

## Mazos, menú y carga del tablero — 2 de noviembre de 2026 (Claude Code, nube) · PUNTO DE RETOMA

**Sesión cerrada por saldo de la nube (quedaban ~5 $).** Todo está subido a
`claude/sweet-clarke-76ugku` y publicado en la vista previa.

- **Mazos** (`DecksPage`): galería de 19 estandartes con retrato del
  comandante, sello y color de facción (antes, pestañas de texto partidas
  en cinco líneas); estandarte del comandante en el panel; curva de coste;
  al elegir mazo baja sola a la lista. La galería es `div role=group` (con
  `<nav>` el e2e del menú encontraba dos «activos»).
- **Menú** (`AppShell`): icono propio por sección en vez de 01–08, gema en
  la activa y «Jugar» como botón dorado principal.
- **Resumen final en móvil:** textos cortos para que los botones quepan.
- **Carga del tablero:** la decoración (clima, corona del Nexo, marco) se
  monta 1,2 s después (`useDeferredDecor`) y la lava de la Caldera carga en
  su propio `Suspense` (antes retrasaba todo el tablero).

**Abierto:** `e2e/mobile.spec.ts` «las chapas de las unidades no se pisan
en móvil» es intermitente aquí (1 de 2 pasa; en `main` pasa): espera 3 s a
que aparezcan las fichas y en la Caldera, sin GPU, tardan más. Revisar con
GPU; si sigue, medir el primer fotograma de la escena.

**Siguiente recomendado:** control de intensidad de efectos y calidad
automática; repaso en móvil; IA de Goblins y Tercios; suelos por facción
con imágenes del propietario (Gemini, 2048 px, vista cenital, sin marco).

---

## Epitafios y golpe de gracia — 2 de noviembre de 2026 (Claude Code, nube)

Elegidas por el propietario de una lista de 51 ideas.

- **Epitafio** (`battle/Epitaphs.tsx`): al destruirse una unidad rara o
  mítica, su `flavor` sale en cursiva sobre la casilla y sube despacio.
- **Rematar** (`pages/battle/FinishingBlow.tsx`): si una unidad propia
  puede derribar ya el Nexo rival (`getValidAttacks.canAttackNexus` +
  `previewAttackNexus.lethal`), sale un botón dorado «Rematar». Lanza una
  escena de 2,2 s con el comandante y después el `attack-nexus` normal.
  Probado en navegador hasta la pantalla de Victoria.

---

## Suelo de lava de la Caldera — 2 de noviembre de 2026 (Claude Code, nube)

Imagen **creada por el propietario con Gemini** (procedencia confirmada por
él; sin licencia de terceros). Original de 1024 px en el chat, no en Git.
Se eligió la opción A propuesta: losas de roca + río en la costura.

- `public/assets/terrain/lava-caldera-roca-v1.webp`: recorte de la roca sin
  el río (esquina superior derecha, sin el filete dorado del borde),
  ampliado a 1024. Sustituye a `basalto-caldera-v1.webp` en
  `NATURAL_TILE_MAPS.basalt` (el antiguo sigue en el repositorio).
- `lava-caldera-brillo-v1.webp`: solo las grietas naranjas; en reposo es el
  `emissiveMap` de las losas de la Caldera. Al resaltar una losa vuelve el
  brillo de siempre para que el resaltado se lea igual.
- `lava-caldera-rio-v1.webp`: el río girado 50° y recortado con bordes
  suaves; `LavaRiver.tsx` lo pone en la costura central de la Caldera
  (sustituye a `Midline` solo ahí), fluye y su resplandor late.

Pendiente: que el propietario confirme si las cartas se leen bien sobre la
lava; si quiere, misma técnica para el suelo de otras facciones.

---

## Fichas pegadas: seleccionar y atacar — 1 de noviembre de 2026 (Claude Code, nube)

El propietario: con cartas en casillas pegadas costaba mucho seleccionar la
propia, el aviso de ataque solo salía en un punto y el clic no atacaba.
**Regresión causada por cambios de esta misma rama**, corregida:

1. El aura de motas (`Sparkles`) de raras y míticas estaba dentro del grupo
   con manejadores de la ficha; three toca los puntos con margen de 1 unidad
   y se tragaba clics y hover de lo que había alrededor. Ahora `raycast={() => null}`.
2. Se quitó el «clic que atraviesa» la mitad alta de la carta al mover
   (quedaba solo al desplegar desde la mano).
3. La rival justo detrás de la propia quedaba tapada desde la cámara:
   `preferredPiece` da prioridad al objetivo válido entre todo lo que hay
   bajo el puntero (clic y aviso), y la losa de un objetivo cuenta como el
   objetivo (`hoveredOccupantId` y `onCell`).

Prueba nueva permanente `e2e/stacked-pieces.spec.ts` (ratón real:
seleccionar junto a otra, sello al apuntar, atacar): pasa. `battle-ui`
falla por tiempo en esta máquina también sin estos cambios (comprobado con
`git stash`).

---

## Selección de carta y casilla más fiable — 1 de noviembre de 2026 (Claude Code, nube)

El propietario: «a veces le doy clic y no coge la carta que quiero o no va
al lugar que quiero». Causas encontradas y arreglos:

1. **Clics ignorados durante animaciones:** `onHandSelect` salía si la cola
   estaba ocupada; con las animaciones nuevas pasaba a menudo. Elegir carta
   ya no espera a la cola (las acciones sobre casillas ya se permitían).
2. **Carta que «huía» al pasar el ratón** (`HandFan`): se levantaba el hueco
   entero y el puntero quedaba sobre la vecina. Ahora el hueco (`.fanCard`)
   no se mueve; solo la capa `.lift`. El hueco también selecciona.
3. **La elegida tapaba la fila de despliegue** y pulsar ahí la soltaba:
   sube 16 px en vez de 44.
4. **Clics convertidos en arrastre** (`useCardDrag`): umbral 14 px y además
   tiene que ir hacia arriba (10 px).
5. **Casillas tapadas por cartas de pie al mover:** pulsar la parte alta de
   una carta (y > 0,62) que tapa una casilla válida llega a la casilla.
6. **Clic en casilla no válida con unidad elegida:** mensaje explicando por qué.

Pruebas: 747 unitarias, lint y build; e2e de mano y tablero (`battle-ui`,
`home`, `card-faces`, `game-flow`) correctas. `drag-and-drop` sigue fallando
por tiempo igual que en `main` (máquina sin GPU).

---

## Ajustes tras probar el propietario — 1 de noviembre de 2026 (Claude Code, nube)

- **Quitado el mapa rojo de peligro** (punto 3 de las once mejoras). Decisión
  del propietario: no hace falta saber dónde te pueden atacar; el juego es
  mejor menos predecible. Se borró `dangerCells` y `DangerHeat`. **Se
  conservan las flechas de amenaza**, que le gustaron (alcance y si hay
  contragolpe).
- **Despliegue entre dos fichas:** desde el ángulo de cámara, las cartas de
  pie tapaban parte de la casilla de detrás y se quedaban el clic, así que
  no se podía desplegar en una casilla válida rodeada de fichas. Ahora, al
  colocar una carta, si la ficha no es objetivo y detrás hay una casilla
  válida (`userData.validCell`), el clic sigue hasta la casilla.
- Recordatorio para quien retome: las casillas verdes brillantes son las de
  despliegue válidas (fila propia y alrededor de unidades propias que ya
  llevan un turno o han actuado). El verde apagado del fondo es el terreno.

---

## Sobres, álbum, perfil y racha — 1 de noviembre de 2026, noche (Claude Code, nube)

**Misma rama y PR.** El propietario pidió los puntos 12, 14 y 15.

- **Sobres** (`store/collection.ts`, `components/PackOpening.tsx`): uno por
  victoria (`useMatchRecorder`). Cinco cartas de menos a más raras
  (`rollPack`, determinista por semilla, la última puede ser mítica, 8 %
  doradas). **Decisión:** es colección para lucir; no limita qué se puede
  jugar ni toca mazos ni equilibrio.
- **Álbum** (`pages/AlbumPage.tsx`, ruta `/album`, nueva pestaña en el
  menú): progreso, copias, doradas, siluetas y filtro por facción.
- **Títulos y marcos** (`store/profile.ts`, `ProfileShowcase`,
  `ProfileBadges`): ligados a los logros existentes; se eligen en el álbum
  y se ven en el panel del comandante y en el cara a cara.
- **Racha** (`StreakEmblem`): niveles a 1, 3, 5 y 10 victorias seguidas;
  portada, partida y pantalla final.

Persistencia nueva en `localStorage`: `cronicas-nexo-coleccion` (v1).
**Pruebas:** 747 unitarias correctas, lint y build correctos; captura en
navegador del álbum y de la apertura completa sin errores.

---

## Once mejoras de claridad y facciones — 1 de noviembre de 2026, noche (Claude Code, nube)

**Misma rama y PR** (`claude/sweet-clarke-76ugku`, vista previa en
https://sefiro888.github.io/cronicas-nube/). El propietario eligió y pidió
hacerlas «punto por punto de manera impresionante». Todo es presentación.

1. **Previsión al apuntar** (`attackPieceVerdicts` en `battleHints.ts`):
   sello en cada ficha («Muere», «Sobrevive con N», «Devuelve N», «Muere en
   el contragolpe», «+N al Nexo», «¡Golpe letal!»).
2. y 3. **Flechas de amenaza y mapa de peligro** (`threats.ts`,
   `ThreatOverlay.tsx`): estado hipotético en el que le toca al dueño y se
   pregunta al motor; el mapa sale al decidir dónde mover o desplegar.
4. **Habilidades que hablan** (`TraitFlourish.tsx`): lanza de Perforar,
   corazón de Vínculo vital, estrellas de Aturdir, muro de Guardia, placas
   de Escudo; se disparan desde el duelo.
5. **Reacción en cadena** (director, `CHAIN_EFFECT`): «×N» con cada muerte
   que llega detrás de un daño de explosión.
6. **Animación por hechizo** (`spellStyle.ts`, `SpellStyles.tsx`): bola de
   fuego, rayo, tormenta, curación, robo, escarcha, bendición, juicio y
   empuje; el lanzamiento dura ×1,8 (`SPELL_CAST_STRETCH`).
7. **Zona marcada** (`TargetZone`) antes de los hechizos de área.
8. **Respuesta**: en las reglas NO hay contrahechizos (comprobado); se
   rotulan las reacciones que sí existen: Escudo, Petardazo y silencio.
9. **Firma por facción** (`FactionSignature.tsx`) al invocar, golpear y morir.
10. **Marco del tablero** (`FactionFrame.tsx`): bordes, estandartes y
    costura con el color de cada facción.
11. **Frases de comandantes** (`commanderQuotes.ts`, `CommanderQuote.tsx`):
    textos originales por facción al usar el poder, al recibir 3+ en el
    Nexo y al ganar.

**Pruebas:** 742 unitarias correctas (5 omitidas), lint y build correctos;
prueba de humo en navegador sin errores de consola. Se rebajó la columna de
luz del Nexo en reposo porque la del propio cruzaba el tablero.

**Pendiente:** que el propietario lo pruebe con GPU y diga qué ajustar.
Si quiere contrahechizos de verdad, es un cambio de reglas: pedir permiso.

---

## Batería de mejoras visuales — 1 de noviembre de 2026, tarde (Claude Code, nube)

**Misma rama y PR que la nota siguiente** (`sefiro888/cronicas-nube`, rama
`claude/sweet-clarke-76ugku`). El propietario hizo público el repositorio y
activó GitHub Pages: cada push a una rama `claude/**` se publica en
https://sefiro888.github.io/cronicas-nube/ (`.github/workflows/vista-previa.yml`,
rama `gh-pages`). No es el juego oficial ni toca `magicfable`.

**Decisiones del propietario:** quiere todo el texto en español, también los
mensajes de trabajo. Pidió hacer TODAS las mejoras de la batería salvo la 19
(figuras 3D en lugar de fichas). No se cambia el equilibrio.

- **Ataques distintos** (`attackStyle.ts`, `AttackStyles.tsx`): tajos,
  zarpazos, mazazo, espíritus, flechas, disparo, rayo, aliento de dragón y
  púas según tipo, alcance, facción y fuerza de la carta.
- **Nexo**: monolito de cristal en el duelo (`CombatDuel`) y corona 3D
  (`NexusCrown.tsx`): cristal flotante, satélites, columna de luz, cúpula de
  escudo, desgaste (humo, esquirlas, satélites que caen), fase de peligro
  con un cuarto de Vida (también viñeta roja en pantalla) e implosión al caer.
- **Combate**: golpe final a cámara lenta (`isFinisher` mira la cola ya
  resuelta), contraataque, combos, reacción por criatura y muertes propias
  (`creatureFx.ts`, `CreatureReactions.tsx`), números de daño por tipo y
  crítico desde 5.
- **Escenario** (`BattleSkies.tsx`): clima por escenario que arrecia con la
  tensión y reacciona a golpes, luz de tensión, cicatrices que duran cuatro
  turnos, polvo al pisar, aves o dragones lejanos que se espantan.
- **Cartas**: ilustración viva en raras y míticas, holográfico ampliado,
  reposo vivo de las fichas, aura de rareza e invocación por rareza
  (`RarityArrival.tsx`). El evento `summon` lleva ahora `cardId` (solo
  presentación; las 490 pruebas del motor siguen correctas).
- **Interfaz**: cámara que acompaña con `setViewOffset`, capa de tensión en
  la música (`setBattleTension`), un sonido por tipo de ataque, barrido del
  comandante en el cambio de turno, vitrina de la mejor jugada y «Ver el
  golpe decisivo», botón «↺ Repetir jugada» (eventos copiados con el sufijo
  `REPLAY_MARK`, a cámara lenta y sin tocar el estado) y presentación cara a
  cara al empezar (`BattleIntro`).

**Pruebas:** 734 unitarias correctas (5 omitidas), `lint` y `build`
correctos en cada bloque. Prueba de humo en navegador: la batalla carga sin
errores de consola y se ven las coronas del Nexo. La batería e2e completa
dio 101 correctas y 7 fallos que **también fallan en `main`** sin estos
cambios (máquina de la nube sin GPU: animaciones 3D que no acaban a tiempo).

**Pendiente:** que el propietario lo pruebe en la web de vista previa con un
equipo con GPU, sobre todo el rendimiento del clima y la corona en calidad
alta; ajustar intensidades según lo que diga. La presentación cara a cara
dura 3,6 s y se puede saltar.

---

## Espectáculo de batalla — 1 de noviembre de 2026 (Claude Code, nube)

**Hecho en el repositorio de pruebas `sefiro888/cronicas-nube`, rama
`claude/sweet-clarke-76ugku`, con PR para que el propietario lo revise. NO
está en `magicfable` ni publicado.** Si gusta, se trae a mano al proyecto
principal (ver `NUBE.md`).

Petición del propietario, con capturas: que el combate, el poder del
comandante y la carta en grande sean mucho más claros y espectaculares, que
cada término del glosario tenga identidad propia y que la rareza se note en
cualquier acción. Dejó la ejecución a criterio del agente («de la mejor
manera que tú veas»). No se ha tocado el motor ni el equilibrio.

- **Identidad de términos** (`src/components/keywordIdentity.tsx`): cada
  término del glosario tiene icono SVG propio, color y familia (ataque,
  defensa, control, recurso, mecánica de facción, regla). El texto de las
  cartas pinta cada término con su color y el tooltip lleva icono y familia.
  Prueba nueva: todo término del glosario necesita identidad.
- **Glosario ampliado**: Petardazo, Golpe veloz, Chispa, Formación, Descarga,
  Canto (y Hunde) y Vuelo salían en cartas sin explicación en ningún sitio.
- **A quién afecta cada carta** (`src/battle/castImpact.ts`): al despachar
  una acción con carta o poder, el almacén compara el tablero de antes y
  después y guarda el resultado por id de evento (`castImpacts`). Así se
  sabe, por ejemplo, que «¿Y si…?» dio Petardazo a 3 unidades, aunque el
  motor no emita ningún evento por ello. Las partidas en red
  (`replaceMatch`) no lo calculan: la carta se ve igual, sin la lista.
- **Carta en grande** (`CastSpotlight`): panel «Qué hace» con a quién afecta
  (retrato y cambios de cada unidad), duración leída del texto y cada término
  con su icono, definición y animación por familia. Rara y mítica aterrizan
  con onda; la común ya no lleva rayos, para que la rareza se note.
- **Poder de comandante**: escena propia antes de la carta. El retrato entra
  en un círculo de runas con ondas de choque, destello y el nombre del poder
  en grande. Después, en el tablero, cada unidad afectada muestra su cambio
  (`src/battle/ImpactMarks.tsx`), una tras otra como una onda.
- **Combate** (`CombatDuel`): carga, embestida con «hit-stop», destello y
  sacudida según el daño; tajo y chispas del color de la rareza de quien
  golpea; grietas según el daño; la carta destruida estalla en fragmentos de
  su ilustración; rótulos «¡Golpe!», «¡Brutal!» y «¡Letal!». Marcos por
  rareza (filo verde, zafiro animado con brasas, corona prismática dorada y
  algo más grande en la mítica). Las habilidades del duelo llevan su icono.
  En el tablero 3D, el estallido del impacto crece también con la rareza.
- Movimiento reducido: se mantiene toda la información y se quitan vuelos,
  fragmentos, chispas y destellos.

**Pruebas:** 731 unitarias correctas (5 omitidas), `build` y `lint`
correctos. Capturas con `e2e/battle-spectacle-shots.spec.ts` (fuera del
gate, `RUN_SHOTS=1`) a 1366 × 768: poder de Bromuro con 3 goblins y duelo de
una mítica que destruye a una común. Ese guion congela el reloj y las
animaciones porque en la nube no hay GPU y cada captura tarda más de un
segundo. La batería e2e completa: ver el resultado anotado debajo.

**Pendiente / ideas siguientes:** revisar a 1920 × 1080 y en móvil en un
equipo con GPU; sonidos propios por rareza y por término (hoy se reutilizan
los existentes); golpe final a cámara lenta; previsión del resultado en el
duelo; reacción del retrato del comandante. El ritmo no se ha cambiado
(`presentation.ts`): la escena del poder cabe en los 5 s ya pedidos.

---

## Portada, navegación y Torre — 1 de noviembre de 2026 (Codex)

**PUBLICADO Y COMPROBADO EN LA WEB.** Implementación en `5817113` y nota de
publicación en `c482c72`, ambos subidos a `origin/main`. El flujo
[41294375177](https://github.com/sefiro888/magicfable/actions/runs/41294375177)
terminó con compilación y despliegue correctos. Se abrieron la portada pública
y la Torre desde su navegación y se comprobó que aparece el arte nuevo.
No queda pendiente subir este rediseño ni repetir pruebas por esa publicación.

**Punto de retoma:** el propietario va a probar el resultado. Esperar sus
observaciones para el siguiente cambio; esta entrega no cierra las 39 tareas
parciales de renovación visual de batalla ni autoriza a cambiar el equilibrio.
El arreglo móvil del duelo también está publicado; no volver a tratarlo como
un commit local pendiente.

**Continuidad entre Claude y Codex:** ambos usan este registro y `AGENTS.md`.
`CLAUDE.md` remite a estos mismos documentos. Al cerrar un bloque, anotar aquí
fecha, cambios, decisiones, pruebas, publicación y siguiente paso, conservando
el historial del otro agente. Un clon incluye el código y los WebP; los maestros
PNG y capturas requieren la copia local y no se deben dar por perdidos ni
regenerar sin comprobar antes sus carpetas.

Nueva petición del propietario: rediseño conjunto inspirado en sus capturas
de pruebas de otra carpeta, con dirección artística propia y todas las
facciones presentes. Implementación en el proyecto principal, guardada en
`5817113`. El propietario solicitó después publicar todo para probarlo en
la web; la publicación quedó cerrada como se indica arriba. No se ha
modificado `Cronicasargon`. Los maestros privados siguen ignorados: se suben
los doce WebP optimizados necesarios para las seis escenas.

- Seis escenas originales de ImageGen: convergencia del Nexo, asedio de una
  Torre colosal y cuatro paisajes que agrupan las 19 facciones. Cada facción
  conserva además una ilustración propia y un acceso que selecciona su mazo.
- Portada a todo el ancho, atlas de territorios, progreso/continuación de
  partida conservados y acceso ilustrado a la Torre. Navegación de bronce y
  piedra, pestaña activa y barra móvil desplazable.
- Torre con criaturas escalando, dragón, hechizos y ruta visual de 19 pisos.
  Selección ilustrada de expedición, Vida real del comandante, progreso y
  bendiciones con arte existente; no se cambian las reglas ni los mazos.
- Niebla, partículas y efectos de magia mediante CSS, detenidos por movimiento
  reducido o calidad baja. WebP grandes y pequeños, carga diferida de escenas
  inferiores, maestros en `tools/art-inbox/interface-2026-11/` (ignorado).
- Procedencia, inventario y prompts completos:
  [INTERFAZ-MUNDOS-2026-11-01](INTERFAZ-MUNDOS-2026-11-01.md).
- Verificación cerrada: 722 unitarias correctas, 5 omitidas, build y lint
  correctos. Batería e2e general: 107 correctas y 43 sondas opcionales omitidas;
  una expectativa de texto detectó la numeración decorativa unida a «Mazos».
  Corregido pasando los números a CSS, sin cambiar la prueba. Pasada posterior
  de portada, navegación móvil, flujo de Torre y cuatro e2e nuevos: 10/10
  correctas. Las 108 pruebas activas quedan comprobadas. Capturas revisadas a
  1920 × 1080, 1366 × 768 y 390 × 844. La entrada a Torre cabe en la primera
  vista del portátil; las escenas nuevas participan en la caché de arte PWA.
- Servidor de revisión en `http://127.0.0.1:4175/`: 4173 lo ocupa la carpeta
  independiente del propietario. Playwright admite `E2E_PORT` para verificar
  el proyecto correcto sin cerrar ni confundir servidores.

El arreglo móvil del duelo del punto 7 siguiente ya está publicado, como
confirmó el propietario; no es una tarea pendiente de esta sesión.

---

## Sesión autónoma del 31 de octubre de 2026, 13:15–16:00 (Claude Code)

**Si llegas ahora (Codex o Claude), empieza por aquí.** El propietario se fue
y pidió trabajo continuo por bloques: cada bloque se publicó en `main` solo
tras pasar `test`, `build`, `lint` y `test:e2e` completos (104 correctas y 43
omitidas en cada pasada) y tras revisarlo en el navegador.

### Publicado hoy, en orden

1. `8375876` — **Las unidades caen al tablero.** `arrivalMotion.ts`: caída
   con gravedad desde 2,6 m, aterrizaje en `ARRIVAL_LANDING` (0,58 del
   evento), aplastamiento y dos rebotes. En `EventEffects.tsx`,
   `LandingShock` añade onda en el suelo, polvo, columna de luz de facción y
   sacudida, sincronizados con el aterrizaje. Las facciones de crecimiento
   brotan de la losa y las de velo bajan girando. La invocación dura ×2,4 en
   cinemático.
   **Aviso de turno** nuevo (`TurnBanner`): franja de facción con el retrato
   del comandante. La sombra de contacto ya reaccionaba a la altura; no hubo
   que tocarla.
2. `6e4abe4` — **Historial de jugadas** (`RecentPlays`): tira a la izquierda
   del tablero con las 7 últimas cartas, poderes, invocaciones y ataques;
   ficha al pasar el ratón y clic para inspeccionar. **Sonidos nuevos**
   `spotlight`, `land` y `trait` en `audio.ts`. **Informe de equilibrio**
   en [EQUILIBRIO-2026-10-31](EQUILIBRIO-2026-10-31.md).
3. `a9914f3` — **Revisados los 8 suelos de Codex** que faltaban. Duna, Jade,
   Escalinata, Gremio y el Claro, bien. En Santuario, Bestiario y Rompiente
   no se distinguían las dos mitades: se reforzaron los tintes de bando
   (`moss`, `tide`, `forest`), sin tocar el material.
4. **El tablero señala quién pelea** (anillos de selección y objetivo en las
   dos fichas mientras se presenta el duelo, y en el objetivo de un hechizo
   cuando llega su efecto), y **acercamiento de cámara** del 7 % en cada
   ataque (`CombatPunch` en `Board3D.tsx`, con `camera.zoom` para no pelear
   con el encuadre ni con la sacudida). Publicado en `d168ea4`.
5. `03e742b` — **Pantalla final con el comandante que gana**
   (`ResultHero.module.css`): rayos, brasas y título en oro si ganas; el
   retrato del rival agrietado y título en rojo si pierdes. Sonda de Tercios
   añadida al informe de equilibrio.
6. **Botón de ritmo en la propia partida** (esquina superior izquierda del
   tablero, sobre el historial): cambia entre Cinemático, Normal y Rápido sin
   ir a Ajustes. **Vida del Nexo en el duelo** cuando el objetivo es un
   Nexo: se muestra la vida antes del golpe, sumando los daños al Nexo que
   aún esperan en la cola (el motor ya los ha restado cuando el duelo se
   presenta). Publicado en `92a9a74`.
7. **Revisión en móvil (390 × 844). PUBLICADA.**
   La carta en grande cabe entera. El duelo se salía de la pantalla (las
   cartas iban de −52 a 440 px) porque el marco del tablero sangra por los
   lados; en móvil el duelo pasa a `fixed` (`CombatDuel.module.css`).
   Comprobado midiendo las cajas en el navegador (de 8 a 120 px y de 270 a
   382 px). Unitarias, lint y build correctos. La batería e2e de aquella
   sesión quedó interrumpida por suspensión del ordenador y carga lenta.
   **Actualización del 1 de noviembre de 2026:** el propietario confirma que
   el arreglo ya está publicado; no hay que repetir los e2e ni hacer push
   para cerrar este punto.

### Trampas aprendidas hoy

- **Un panel de navegador oculto congela las animaciones CSS** (y con ellas
  la opacidad de entrada): la carta en grande queda invisible. Para revisar,
  activar «Reducir movimiento» o medir con `getBoundingClientRect`.
- **El estado de la partida va por delante de la animación.** El motor
  resuelve la jugada entera y la interfaz la reproduce después: piezas
  muertas, vida del Nexo y escudos ya están actualizados cuando el duelo se
  presenta. Cualquier cifra que se enseñe durante la presentación tiene que
  reconstruirse con la cola pendiente (ver `displayedNexusHealth`).
- `game-flow.spec.ts` puede fallar por tiempo de carga de la página de mazos
  cuando la batería va lenta (14 min en vez de 9). En solitario pasa;
  repetirlo antes de buscar un fallo.

### Pendiente, por prioridad

- **Que el propietario pruebe el ritmo.** Cinco segundos por carta (pedido
  por él) y 1,8 s de presentación por ataque pueden pesar en partidas de 50
  turnos. Todo se ajusta en `presentation.ts` (`SPOTLIGHT_MS`,
  `DUEL_INTRO_MS`, `PACE_SCALE`).
- **Goblins al 2 %**: la sonda apunta a la IA (Petardazo daña a los aliados
  que coloca juntos y no llega a golpear el Nexo). El propietario pidió
  **no tocar cartas**; corregir la IA está permitido solo si él lo pide.
  Detalle en el informe de equilibrio.
- **Tercios al 15 %**: la sonda muestra el mismo patrón que Goblins (mano
  vacía antes del turno 15 y ningún daño al Nexo rival en 44 turnos).
  Probablemente sea la IA, igual que con Goblins.
- La carta en grande no marca el objetivo en el tablero 3D mientras se
  muestra (el fondo se oscurece); se descartó porque la propia carta ya
  enseña el objetivo como carta unida por un haz.
- Las 50 tareas de la renovación visual de Codex siguen como estaban
  (`docs/RENOVACION-VISUAL.md`).

## Presentación de jugadas — 31 de octubre de 2026 (Claude Code)

El propietario pidió que hechizos, estructuras y poderes se vieran en grande
para los dos bandos y que los golpes fueran más lentos y legibles. Hecho sin
tocar reglas:

- El motor marca con `cast` el evento que abre una jugada presentable
  (hechizo inmediato, estructura, poder de comandante). Las unidades no lo
  llevan: ya se presentan solas al aparecer. Los `spell` secundarios
  (escrutinio, Canto, botín, tirada de Chispa) tampoco.
- `useEventDirector` detiene la cola ante un `cast` y muestra
  `CastSpotlight`: carta, objetivo como carta unida por un haz, brillo según
  rareza y franjas de cine para los poderes. Dura 5 s en cinemático, propia
  y rival por igual (petición expresa del propietario). El resultado de la
  crónica se anuncia después, con la cola vacía, para no adelantarlo. La IA
  no actúa mientras dura. Se cierra con clic, Espacio, Intro o Escape.
- `CombatDuel` presenta antes de cada ataque las dos cartas a los costados
  del tablero (1,8 s en cinemático) y deja caer el golpe después. Marca daño,
  escudo absorbido y «Destruida», y enciende en dorado las habilidades que
  actúan: Perforar (daño al Nexo), Vínculo vital y Aturdir (al entrar el
  golpe) y Escudo (evento `shield`). Se omite con movimiento reducido. El
  marco del tablero tiembla en los golpes.
- Ajuste nuevo «Ritmo de la partida» (`presentationPace`): Cinemático (por
  defecto), Normal y Rápido. La lógica pura está en
  `src/battle/presentation.ts`, con pruebas.
- Un panel de navegador oculto no avanza las animaciones CSS: la carta queda
  en su fotograma inicial, con opacidad 0. Para revisarla así, activar
  «Reducir movimiento», que la muestra quieta.

**Publicado el 31 de octubre a petición del propietario, junto con el
prototipo de texturas del tablero** (`1e959b3`). Codex había dejado ese
prototipo en local, y el propietario decidió subirlo para probarlo. Está en la
web. Los 8 suelos que faltaban se revisaron después, el mismo día (ver la
sesión autónoma de arriba, punto 3).

## Revisión de continuidad — 30 de octubre de 2026

**Empieza por el [README actualizado](../README.md).** Las cifras y prioridades
del traspaso del 22 de octubre conservado debajo son históricas. El catálogo
actual integra **19 facciones, 517 cartas, 25 comandantes, 19 mazos y 12
escenarios**. Goblins, Tercios y Kalevala ya son jugables; no deben tratarse
como diseños pendientes de integrar.

La última entrega de juego subida a `main` antes de esta revisión es `5dd7e15`:
incorpora también correcciones de las nuevas mecánicas y avisos de pérdida de
Vida y muerte por romper Formación al mover. El registro de esa entrega está
en [ESTADO-INTEGRACION-FACCIONES](../tools/ESTADO-INTEGRACION-FACCIONES.md).
Su última validación registrada fue de 697 unitarias correctas y 5 omitidas,
compilación y lint correctos, más comprobaciones de la interfaz afectada.

El desarrollo quedó **en pausa por petición del propietario**; actualizar esta
documentación no lo reanuda. La renovación visual mantiene 11 tareas terminadas
y 39 con avances pendientes de revisión global. Hay cambios y recursos locales
de tablero sin publicar: comprobar `git status` y
[RENOVACION-VISUAL](RENOVACION-VISUAL.md) antes de continuar. No confundir esos
prototipos con contenido disponible en un clon limpio.

Este documento sigue siendo útil por sus advertencias técnicas. Las propuestas
antiguas que piden crear escenarios ya integrados o añadir Goblins, Tercios y
Kalevala están superadas. Para resolver contradicciones, consultar el código,
el README y las notas posteriores de cada registro; no borrar trabajo ajeno ni
alterar los dosieres del propietario.

---

Documento de traspaso. Está escrito para que un agente que llega de cero pueda
continuar sin preguntar nada. Última actualización: **22 de octubre de 2026**.

---

## 1. Dónde está el proyecto ahora

**Bloque automático cerrado el22oct a las20:00 Europe/Madrid.**
Automatización eliminada; avances y pendientes guardados localmente.
No reanudar ni publicar sin nuevas instrucciones. Código jugable publicado
en481a373; el checkpoint posterior solo contiene revisión y cierre.

**Prioridad humana del22oct a las19:00:** mano inicial10, conservar robo
normal y reciclar/barajar el cementerio al agotarse el mazo; sin autorrellenar
mano ni recuperar piezas/fuentes en juego. Implementado en3f7b88d:588 unitarias,85 e2e/37 omitidas, build/lint
y simulaciones de40 semillas verdes. Matriz panorámica48/48 verde. PUBLICADO en2a028a5: Actions39825636655 y
deployment7259414952 success. Web real verificada con10 cartas iniciales;
pedido del mazo cumplido, no repetirlo ni publicar más juego sin nueva petición.
Consultar bloque activo del registro antes de abrir otro proceso.
Revisión de cierre local: `docs/REVISION-VISUAL-2026-10-22.md`. Prioridad
concreta al retomar: esfera del cielo de Ciudadela recorta el panorama en
modo foto; sonda reversible confirma radio105, sin parche aplicado. No
confundir48 pruebas de escenarios con50 mejoras terminadas (11 V/39 A).

| | |
| --- | --- |
| Facciones jugables | **16** |
| Cartas | **424** (90 de NEX-01, 24 de NEX-02 y 31 por cada set de NEX-03 a NEX-12) |
| Comandantes | 22 |
| Escenarios 3D | **12** |
| Estilos de suelo del tablero | **10** (Sol comparte piedra; Bestiario, bosque) |
| Tests | 588 en verde, 5 omitidos |

El gate local (`npm run test`, `npm run build`, `npm run lint`) pasa limpio.
La mejora de reposicionamiento de la IA descrita en el punto 10 está guardada
en `2134dc9`, publicada junto al avance `7a7b74f` por petición del usuario el22oct.
Verificación de navegador:
85 pruebas activas en verde y 37 omitidas (capturas bajo demanda), con los hechizos
dirigidos probados a 1920 × 1080 y 1366 × 768. Se actualizaron dos expectativas
antiguas de la galería para que su recuento y altura acompañen al catálogo actual.
Última pasada completa `49114`: 85 e2e verdes, 37 omitidas en7,2min
(22 oct,19:36; variables de capturas opcionales limpias).
Después,4 capturas de mano/preparación y48/48 escenarios verdes en alta/baja
a1920×1080 y1366×768. Todas las imágenes de batalla revisadas; fotos amplias
generadas por la misma matriz.
Playwright usa un worker y `channel: chromium`: el shell
antiguo imponía SwiftShader aunque había una AMD Radeon disponible. El nuevo
headless aprovecha Direct3D11, mantiene calidad, tiempos y trazas completas.
No compilar ni modificar fuentes importadas mientras se verifica WebGL.
El campo renderiza bajo demanda con movimiento reducido o tras un modal
opaco, conservando reloj de reglas y actualizaciones de React/OrbitControls.
La pose reducida se aplica directamente: no depende de fotogramas futuros.
El mulligan presenta ambos comandantes y el escenario sin otra pantalla.
Su foco y teclado están contenidos. La guía inicial no se superpone a él;
el coach posterior mide con un getter estable y no reinicia su anclaje por
cada render (hacía saltar el botón «Saltar guía» bajo el cursor).
Ciudadela renovada: arquitectura de dovelas/columnas acanaladas en cotas
inferiores, plaza que sostiene las cuatro esquinas del tablero, mármol con
bisel físico y Nexo de caliza. Revisión de calidad alta/baja y mano visible/
recogida a ambas resoluciones en `e2e/scenery-renewal.spec.ts` (opcional).
Vista distante original integrada y documentada en `docs/arte-escenarios.md`.
Caldera renovada: meseta fracturada que sostiene las esquinas, roca
instanciada asimétrica, yunque continuo de cuerno horizontal, lava con canales
entre costras, vapor por capas, paisaje original y luz cálida/fría localizada.
Losas de basalto con bisel físico y normales suaves; Nexo conserva color de
piedra. Matriz visual alta/baja y mano visible/recogida a ambas resoluciones,
con poses amplias de foto. 557 unitarias, build/lint y suite completa 78/37
verdes. Caldera/Ciudadela son avances validados pendientes del pulido global.
Santuario renovado: granito erosionado con mapas minerales y grabados que
siguen la cara, dintel partido en un patio hundido, isla de esquinas cortadas,
pavimento, cuencos de luz fría, bruma por planos y paisaje original. Agua con
reflejo planar real único en alta/media (512/256 px, 24/12 Hz), baja sin captura;
movimiento reducido inmoviliza las ondas. Una sonda cambia una piedra y exige
cambio/restauración de píxeles en el reflejo. Revisado a ambas resoluciones,
alta/media/baja y alta reducida, mano visible/recogida y modo foto. Gate completo
558 unitarias, build/lint y 78/37 e2e verdes. Estos escenarios son avances
validados pendientes de pulido global; las 50 mejoras no están terminadas.
Duna integrada: pilono en talud y gola, relieves propios, fustes en haces y
capiteles papiriformes, lino plegado, obeliscos y patio rectangular excavado.
Panorama original y arena granular. Casillas de arenisca con relieve fino,
bisel y juntas estrechas; la ondulación exterior ya no parece madera en ellas.
Alta/baja y alta reducida a ambas resoluciones revisadas, mano visible/oculta
y dos poses de foto. Unitarias 558/5, build/lint y suite completa 78/37 verdes.
Media y alta reducida también verdes a ambas resoluciones. Queda pulido global.
Fiordo integrado: placa irregular con nieve periférica, hielo profundo con
fracturas finas y reflejo planar único, orillas continuas, casco naval abierto
con tablas y costillas, panorama original y bruma baja. Alta/media/baja y
movimiento reducido comprobados; matriz alta/baja también revisada en GPU.
Se corrigió un fallo compartido: background/fog estaban unidos al Group
giratorio en vez de Scene. `ScenarioAtmosphere` debe seguir fuera de ese grupo.
La guía inicial ya no intercepta el campo y se suspende en foto conservando
su paso. Las seis pruebas originales de guía siguen presentes, más una nueva.
Claro integrado: roble de superficie continua con contrafuertes y hueco real,
copa de hojas lobuladas, helechos instanciados con viento, hojarasca y mantillo.
Se rechazó el primer montaje de raíces por uniones de tubos cortadas y se
rehízo antes de validar. Luz moteada con proyección y oclusión real en
media/alta; baja mantiene una clave sencilla. Matriz alta/media/baja y alta
reducida verde a ambas resoluciones; fotos amplias revisadas. Unitarias563/5,
build/lint y suite completa78 activas verdes. Falta pulido global.
Rompiente integrado: estratos de pizarra, arco marino erosionado y faro
próximo de costillas de hueso con linterna de bronce. Mar con oleaje real,
normales irregulares y reflejo planar único512/256/0; espuma fragmentada,
sin aro blanco. Alta/media/baja y alta reducida a ambas resoluciones
revisadas. Sondas reales de reflejo de costa, Santuario y Fiordo verdes.
Gate565/5, build/lint y78/37 e2e verdes. Falta pulido global entre escenarios.
Gremio integrado: paisaje original, materiales de hierro/bronce/ladrillo,
horno profundo con abertura real, engranajes24/12 acoplados, patio y colada.
Alta/media/baja y alta reducida revisadas a ambas resoluciones. Transmisión2:1
y colada comprobadas;567/5, build/lint y78/37 e2e verdes. Falta pulido global.
Jade integrado después de publicar: aleros curvos con tejas y dougong, puerta
lunar circular con dovelas, bronce ritual hueco, terraza y patio de caliza.
Alta/media/baja y alta reducida revisadas en ambas resoluciones,569/5,
build/lint y78/37 e2e verdes. Falta pulido global de piedra/bronce y composición.
Escalinata integrada: rueda continua con vanos, peldaños hacia el río, cúpula
perfilada sobre columnas y lámparas flotantes. Se rechazó el primer río
rectangular y se rehízo con desvanecido antes del borde; cimientos sumergidos.
Alta/media/baja y alta reducida revisadas a ambas resoluciones. Reflejo real
0→693→0,512px;571/5, build/lint y78/37 e2e verdes. Falta pulido global.
Sol y Bestiario integrados: templos gemelos con puertas reales, calendario
inciso y mosaicos; garganta estratificada con costillas minerales cerradas.
Alta/baja, media y alta reducida revisadas a ambas resoluciones. Catálogo único
de 12 escenarios en Jugar/Ajustes, asignación automática y persistencia probadas.
574/5 unitarias, build/lint y 80/37 e2e verdes. Falta pulido global.
Revisión compartida: panorama centrado en coordenadas mundiales; decorado y
luces permanecen fuera del grupo táctico del invitado, evitando que Jade tape
el Nexo. Patios Jade/Sol con juntas de mampostería. Matriz16/16 de invitado,
24/24 estados en12 escenarios y8/8 proyectiles/impactos claro/oscuro verdes,
ambas resoluciones;575/5 unitarias, build/lint y80/37 e2e verdes.
Oficio solar integrado: molduras, relieves físicos y cuenco de pared real;
calendario claro con incisiones discretas. Clima derivado de turnos/vida real
de Nexos: presión persistente en humo, lava y horno, reversible al curar y
estática en reducido. Dos pruebas causales curan realmente con un hechizo y
comprueban que el horno se calma sin moverse. Números de daño a2,0 unidades:
golpes3/8 separados de chapas a ambas resoluciones.578/5, build/lint y82/37
e2e verdes; Solar4/4 y tensión Gremio/Caldera/Fiordo12/12, imágenes revisadas.
Banda panorámica cilíndrica integrada para reducir distorsión; verticales,
radio y extremos abiertos tienen regresión. Prototipo8/8 Sol/Jade y revisión
Gremio/Solar8/8 verdes. Matriz global49114 cerrada48/48 antes de publicar; no
queda helper experimental panoramaBandProbe.
Conservar sin añadir el PNG ajeno sin extensión «ç» aparecido en la raíz.
Bronce del Nexo Gremio aclarado sin tinte doble ni relieve excesivo; fisuras
con cobertura estable. Pendientes protagonistas y composición global. Las50 mejoras todavía no están todas terminadas.
Ver registro para evitar duplicar procesos.
Leer el registro para sesiones activas; no duplicar verificaciones.


**Renovación visual en curso hasta el 22 oct 2026 a las 20:00 Europe/Madrid.**
Leer también `docs/RENOVACION-VISUAL.md`: contiene las 50 tareas autorizadas,
el estado individual, capturas, verificaciones y el siguiente bloque. Primero
cartas/tablero, combate e interfaz; escenarios después. El usuario pidió publicar
el avance verificado el22oct a las16:41; después continuar localmente hasta20:00.

### Las 16 facciones

`fury` `arcane` `nature` `order` `shadow` `void` — las seis originales
`duna` `fimbul` `samsara` `jade` `olimpo` `sol` `bestiario` `plaga` `marea` `forja`

Cada una tiene su dosier en `docs/FACCION_*.md`: identidad visual, mecánica,
comandante y las 31 cartas con su descripción. **Son la fuente de la verdad
para el arte y el tono**; si algo del código contradice al dosier, suele ser
que el código tomó un atajo, y está anotado en el comentario.

### Segunda oleada: cinco facciones diseñadas, sin integrar (29 oct 2026)

Dosier completo con las 31 cartas y los prompts de arte, **pero nada de esto
está en el motor todavía** y no hay que integrarlo sin que el usuario lo pida.
Van en el orden que él fijó:

| Facción | Dosier | Mecánicas propias | Arte |
| --- | --- | --- | --- |
| Inmortales | `FACCION_INMORTALES.md` | **Relevo**: al morir vuelve ya, misma casilla, stats base, una vez | 3 de 32 |
| Goblins | `FACCION_GOBLINS.md` | **Chispa** (moneda donde las dos caras sirven) y **Petardazo** | — |
| Tercios | `FACCION_TERCIOS.md` | **Formación** (+1/+2 con 2 aliadas adyacentes) y **Descarga** | — |
| Circo | `FACCION_CIRCO.md` | **Acrobacia** (atraviesa casillas ocupadas) y **Público** | — |
| Kalevala | `FACCION_KALEVALA.md` | **Runo** (contadores que no se gastan) y **Canto** (hunde, no mata) | — |

Dos cosas que afectan al equilibrio general y conviene tener presentes antes de
implementarlas:

- **Canto, de Kalevala, es el primer antídoto de Relevo y de Samsara.** Hundir
  no es matar, así que no dispara nada de lo que se activa al morir. Si se
  implementa, hay que revisar el banco de pruebas: Samsara está arriba del 70 %
  en parte porque nadie la castiga.
- **Formación, de Tercios, premia apelotonarse**, que es lo contrario de lo que
  enseña el resto del juego. Cualquier daño de área la castiga mucho, así que su
  balance dependerá de cuánto daño de área haya en el meta.

Cada dosier lleva su propia nota técnica de implementación en la sección de
mecánicas.

**Si vas a escribir el dosier de una facción nueva, lee antes
`docs/GUIA-PROMPTS-ARTE.md`.** Son las once reglas para escribir los prompts de
arte, y cada una está ahí porque una tanda de ilustraciones se fue a la basura:
la dirección artística no viaja si no la escribes dentro del prompt, Gemini
ignora las instrucciones de cámara, y una facción histórica sin bestias ni
colosos no se sostiene al lado de Bestiario.

### Los 12 escenarios y quién juega en cada uno

| Escenario | Archivo | Suelo | Facciones |
| --- | --- | --- | --- |
| Aether Citadel | `AetherCitadel.tsx` | `stone` | Arcano, Orden, Olimpo |
| Santuario de las Runas | `RunicSanctuary.tsx` * | `moss` | Sombra, Vacío |
| Fragua de la Caldera | `CalderaScenario.tsx` | `basalt` | Furia |
| Necrópolis de Duna | `DunaNecropolis.tsx` | `sand` | Duna, Plaga |
| Fiordo de Fimbul | `FimbulFjord.tsx` | `ice` | Fimbul |
| Claro del Bosque | `VerdantGrove.tsx` | `forest` | Naturaleza |
| Rompiente de Nerith | `TidalShore.tsx` | `tide` | Marea |
| Patio del Gremio | `ForgeYard.tsx` | `forge` | Forja |
| Corte de Jade | `JadeCourt.tsx` | `glaze` | Jade |
| Escalinata de la Rueda | `WheelGhat.tsx` | `sandstone` | Samsara |
| Patio del Quinto Sol | `SolarCourt.tsx` | `stone` | Quinto Sol |
| Garganta del Bestiario | `BestiaryRavine.tsx` | `forest` | Bestiario |

\* `SanctuaryScenario.tsx` es solo un envoltorio de una línea sobre
`RunicSanctuary.tsx`. No es código muerto, pero tampoco hace nada: si tocas ese
escenario, el contenido está en el segundo.

Ya **no queda ningún escenario con tres facciones** salvo la Ciudadela, y esas
tres (Arcano, Orden, Olimpo) comparten estética grecolatina a propósito.

---

## 2. Arquitectura en cuatro líneas

- `src/game/` — el motor. Puro, sin React ni Three.js. Estado inmutable
  (`MatchState`), un despachador `applyAction`, y una cola de `AnimationEvent`
  que la interfaz consume después. **Las animaciones nunca deciden reglas.**
- `src/battle/` — el render 3D. `Board3D.tsx` es el orquestador; los escenarios
  van en `scenarios/`, las texturas procedurales en `textures.ts`, los
  obstáculos en `terrain/TerrainMarks.tsx`.
- `src/store/` — Zustand con `persist`. Preferencias y estado de partida.
- `src/pages/`, `src/components/` — interfaz.

Los materiales del escenario usan texturas **procedurales**, dibujadas con Canvas 2D en
`textures.ts`, `materials/` y los auxiliares de escenarios, cacheadas por clave.
Los materiales nuevos se dibujan con código. Las vistas panorámicas originales
generadas con `imagegen` se documentan aparte en `docs/arte-escenarios.md`;
los maestros privados se conservan y el juego consume WebP optimizado.

---

## 3. Lo que cuesta una tarde si no lo sabes

Esta sección es la más valiosa del documento. Todo lo de aquí se descubrió
rompiendo algo.

### 3.1 La cámara: el error que he cometido CUATRO veces

**Desde la renovación del 22 oct:** el lienzo llega bajo los paneles mediante
`--scene-bleed`, mientras el cálculo de encuadre conserva el ancho seguro.
Recoger la mano o quedarse sin cartas también amplía el alto del campo.
`ResponsiveCamera` ajusta distancia/proyección al tamaño efectivo; las cifras
siguientes explican la dirección de vista, pero no sustituyen medir la cámara
real del estado que se esté revisando. No colocar decorado solo a ojo.

La cámara está en `z = 8,8`, mira **37° en picado**, y deja tan poco cielo que
en la práctica **no se ve ninguno**. Consecuencias:

- **El borde superior del cuadro cae en el suelo alrededor de `z = -11`.**
  Todo lo que esté más lejos se dibuja entero fuera de cuadro.
- **Lo alto y lejano NO CABE.** Un edificio de 7 m a 26 de fondo es invisible.
  El decorado que se ve de verdad está **entre 6 y 12 de fondo y por debajo de
  unos 4 de alto**.
- En horizontal el margen es `(8,8 + |z|) · 0,45` (semiángulo de unos 24°).
- **Estar por debajo del suelo no salva.** Lo que decide es el ángulo:
  `atan((y − 6,7) / profundidad)`, comparado con el borde superior que está
  alrededor de **−18,7°**. Un río 2,4 m por debajo del suelo pero a 19,5 de
  fondo daba −17,9° y quedaba fuera.

Víctimas de este error, por orden: el faro del Rompiente, el horno del Patio
del Gremio, el pabellón de la Corte de Jade y el ghat de la Escalinata. **Haz
la cuenta antes de colocar nada.**

### 3.2 Luz

- **Clave cálida ⇒ relleno frío**, y al revés. El sol calienta lo que ilumina;
  lo que queda en sombra lo alumbra el cielo, que es azul. Si pones los dos del
  mismo tono **y el material también lo es**, la escena entera sale de un color
  y no se distingue nada (me pasó en la Escalinata: arenisca rosada + luz
  cálida + niebla cálida = todo óxido).
- **El relleno plano debe ser ~⅓ de la clave**, no ⅔. Un `bumpMap` o un
  `roughnessMap` solo se nota si hay luz DIRECCIONAL que lo module.
- **El ángulo de la clave manda, por el coseno.** Sobre una superficie
  horizontal —el tablero lo es— llega la intensidad por el coseno del ángulo
  con la vertical. A 14° sobre el horizonte llega solo el **24 %** (eso dejó el
  Rompiente casi negro); a 32°, el 53 %. **La ventana buena es 30-45°.**
- **R3F aplica ACESFilmicToneMapping por defecto.** Pasarse de luz sobre
  materiales claros no recorta: DESATURA hacia el blanco y se lleva la textura.
  Con piedra o arena claras, el total (clave + relleno) no debería pasar
  de ~4,3.
- Las luces que proyectan sombra necesitan `shadow-camera-left/right/top/bottom`
  explícitos (el ±5 por defecto recorta) y `shadow-bias={-0.0006}`.

### 3.3 Materiales

- **Subir `metalness` sin mapa de entorno deja el material NEGRO.** Era el
  caso de las escenas antiguas. Ahora `MaterialEnvironment` captura tres
  paneles neutros propios una vez, sin HDR externo: los filetes de carta
  admiten metalness 0,6. Piedra y papel siguen en ≤ 0,05. No convertir todo
  en metal ni confundir ese entorno con reflejos de piezas en el suelo,
  que todavía están pendientes en la lista de renovación.
- **Los mapas de datos (rugosidad, normales) NO pueden ir en sRGB.**
  `finishTexture()` marca todo como `SRGBColorSpace`, que está bien para color
  pero no para datos. Sobrescribe con `NoColorSpace` después.
- `scale={[-1,1,1]}` **+** `side={BackSide}` en una cúpula de cielo se cancelan
  y la dejan invisible. Con `BackSide` basta.
- En una cúpula esférica **`v = 0` es el cénit y `v = 1` el NADIR**: el
  horizonte está en la MITAD de la textura. Puse un atardecer entre 0,82 y 1 y
  quedó enterrado bajo el mar.

### 3.4 Composición

- **Nunca plantes decorado en círculo completo alrededor del tablero.** La
  cámara mira desde z positivo, así que el arco cercano (`sin(ángulo) > 0,1`)
  cae ENTRE el jugador y el tablero. Pasó con los troncos del Claro (un tronco
  negro cruzaba media pantalla) y con los monolitos del Santuario.
- **El tablero es CUADRADO**: su media diagonal mide `3,68 × √2 = 5,20`. Un
  anillo de decorado tiene que ir por fuera de 5,20, no de 3,68.
- **Un objeto del lado por el que entra el sol se ve solo en sombra.** Si la
  clave viene de x negativo, lo que plantes en x negativo enseña a la cámara su
  cara oscura. Se resuelve moviéndolo, no subiendo luces.
- **La niebla tiene dos fallos simétricos y he cometido los dos**: demasiado
  cerca se traga el fondo y el sitio queda vacío; demasiado lejos deja el
  decorado FUERA de ella y, si además está a contraluz, se ve como un recorte
  negro. **La niebla tiene que empezar antes de donde está el decorado.**

### 3.5 Cómo verificar de verdad lo que se ve

Las capturas del panel del navegador salen a escala reducida y **no sirven**
para juzgar una escena. Lo que sí funciona:

- `canvas.toDataURL()` devuelve NEGRO (el `<Canvas>` va con
  `preserveDrawingBuffer: false`).
- **`gl.readPixels` dentro de un `requestAnimationFrame` SÍ funciona**: R3F
  registró su bucle antes, así que su render ya ocurrió y el búfer aún no se ha
  compuesto. Ojo: la fila 0 va ABAJO, hay que invertir la Y.
- Promediando por celdas en una rejilla (48×22) y mapeando cada celda a una
  letra por tono sale un **mapa ASCII de la escena** que sí se puede leer: dónde
  está cada cosa y de qué color. Es lo que destapó que el pabellón de Jade
  estaba fuera de cuadro.
- **Cuidado al interpretarlo**: la mitad rival del tablero queda MUY comprimida
  por la perspectiva (una banda fina arriba, no media pantalla). Yo la leí mal
  y estuve a punto de «arreglar» un tinte que funcionaba.
- Para estados transitorios (casillas chamuscadas, estados de pieza) el truco
  es inyectar el estado en `localStorage['cronicas-nexo-match']` y recargar.

---

## 4. Recetas

### 4.1 Añadir una facción

El sistema de tipos te guía en casi todo: añade el id a `FACTION_IDS`
(`src/game/types.ts`) y `tsc` va señalando los `Record<FactionId, X>` que
faltan. Los sitios:

`factions.ts` (definición + `FACTION_BY_ID`) · `schemas.ts` (coste de maná **y**
los efectos nuevos en la unión Zod) · `cardLabels.ts` · `FactionSigil.tsx`
(nombre + icono SVG) · `EventEffects.tsx` · `scenarioForFaction.ts` ·
`PlayPage.tsx` (3 cartas destacadas + descripción) · `cards.ts` (bloque de
cartas + `CARDS` + la guarda de recuento) · `decks.ts` (comandante + mazo +
`STARTER_DECKS`).

**Ojo con `schemas.ts`: `tsc` NO lo pilla.** Si olvidas registrar un efecto
nuevo en la unión Zod, el catálogo revienta en tiempo de ejecución al cargarse,
y todos los tests fallan a la vez con un error que no señala la causa.

**Recuentos que hay que subir a mano** (el CI los comprueba): `data.test.ts`
(nº de facciones, de cartas, de comandantes, lista literal de ids, tabla
`newFactionSets`), `alt-commanders.test.ts` (`soloCommanderFactions`),
`engine.test.ts` (`SOURCE_BY_FACTION`) y `balance-sim.test.ts`.

Un mazo son 50: 20 fuentes + 30 no-fuente. Cuadra la suma antes de correr los
tests o pierdes una vuelta.

### 4.2 Añadir un escenario

Tocar: `ScenarioId` (`store/preferences.ts`) · `TERRAIN_STYLE`, el `lazy()` y
la rama del switch (`battle/Board3D.tsx`) · `HOME`
(`battle/scenarioForFaction.ts`) · `SCENARIOS` (`pages/PlayPage.tsx`) ·
`MusicTheme` y `AMBIENCE` (`services/audio.ts`).

Si además lleva suelo propio: `BoardTileStyle` y los tres switches de
`textures.ts` (color, relieve, rugosidad), más `ZONE_TINTS_BY_STYLE`,
`NEXUS_STONE`, `BoardAtmosphere` y `Midline` en `Board3D.tsx`, `DRIFT` en
`BoardDrift.tsx` y `TERRAIN_LOOK` + las dos ramas de obstáculos en
`terrain/TerrainMarks.tsx`.

### 4.3 Editar `cards.ts`

Es un archivo enorme y los heredocs de shell se rompen con él. Escribe el
script de parcheo a un archivo temporal y ejecútalo con `python <ruta>`: evita
todos los problemas de comillas y acentos.

---

## 5. Audio

Cada escenario tiene su perfil en `AMBIENCE` (`services/audio.ts`) con **cuatro
capas**: `air` (lecho de ruido), `drone` (tono grave), `detail` (sucesos
sueltos) y `motif` (la música). Más `echo`, que es la reverberación propia del
sitio.

La música **no es un bucle a propósito**: es un paseo aleatorio por los grados
de una escala, en frases cortas separadas por silencios largos. Esto suena
debajo de una partida de media hora y una melodía cerrada se aprende a la
tercera vuelta. Lo que distingue un sitio de otro es el **modo**: frigio
dominante en la Caldera, pentatónica en la Corte de Jade, Bhairav en la
Escalinata.

**`echo.feedback` tiene que quedarse por debajo de 0,5**: por encima el eco se
suma a sí mismo y satura la mezcla.

El doble de audio para tests está en `src/test/fakeAudioContext.ts`. Si usas un
nodo de WebAudio que no esté ahí, los tests fallan (me pasó con `createDelay`).

---

## 6. Equilibrio

Hay un banco de pruebas en `src/game/balance-sim.test.ts`. **No forma parte del
gate**; se lanza a mano:

```bash
RUN_BALANCE=1 BALANCE_SEEDS=12 npx vitest run src/game/balance-sim.test.ts
```

Juega todos los cruces con la MISMA IA en los dos bandos y cada emparejamiento
en los dos asientos, así que las diferencias son del mazo.

### Último ranking (5 sep 2026, 2880 partidas)

Samsara 82 · Bestiario 80 · Olimpo 75 · Plaga 73 · Jade 71 · Orden 58 ·
Arcano 50 · Fimbul 48 · Furia 41 · Forja 40 · Vacío 40 · Naturaleza 39 ·
Sombra 31 · Duna 29 · Marea 28 · Quinto Sol 20

**El reparto está muy abierto**: cinco facciones por encima del 70 % y cinco por
debajo del 40 %. Es el problema de equilibrio más gordo que hay ahora mismo.

### Dos cosas que conviene no repetir

1. **Antes de tocar cartas, descarta un fallo de integración.** Los tests
   unitarios de los ayudantes no prueban que el efecto llegue a la partida. Una
   sonda que imprima el tablero real lo resuelve en minutos.
2. **Mira si la IA está gastando el arranque en estructuras.** Marea salió al
   16 % y lo que más subió la aguja (22 → 28 %) fue quitarle las dos estructuras
   del mazo: la IA gastaba los turnos 3 y 4 levantándolas mientras el rival
   desplegaba.

### Lo que NO hay que sobreajustar

Marea (28), Duna (29) y Quinto Sol (20) comparten diagnóstico: su valor es
**posicional o de recursos**, y la IA valora presencia y daño pero no
reposicionamiento ni pagar costes. Apretarlos más sería ajustar contra el
jugador equivocado. Necesitan que una persona los juegue.

Samsara (82) ya se dio por **techo estructural**: viene de su comandante y de
Renacer, no de una carta suelta, y el dueño del proyecto decidió no recortar
más la lista sin playtesting humano.

---

## 7. Lo que está pendiente

### Bloqueado, esperando al dueño del proyecto

- **Facción Enjambre — «La Corte de Quitina».** El dosier está
  (`docs/FACCION_ENJAMBRE.md` + PDF) y el arte ya está **renombrado** en
  `tools/art-inbox/enjambre-ilustraciones`: llegó como `exec-<uuid>.png`, sin
  metadatos y con la misma marca de tiempo en los 32 archivos, así que hubo que
  identificarlos mirándolos contra los prompts del dosier.

  Al hacerlo salieron tres cosas:

  1. **Faltan dos ilustraciones**: `enjambre-devorador` y `tejedora-abismal`.
     Hasta que existan, la facción no se puede dar de alta entera.
  2. **Dos imágenes eran versiones repetidas**, del retrato de la reina y de la
     fuente. Se han apartado como `vespira-madre-de-mil-alt.png` y
     `fuente-enjambre-alt.png` en vez de borrarlas; si se prefiere la otra
     versión, es intercambiar los nombres.
  3. **El dosier llama `plaga` a una de las cartas**, y ya hay una facción
     entera llamada Plaga. Técnicamente no choca (los ids de carta y los de
     facción son espacios distintos, y `plaga` está libre), pero se lee fatal.
     Conviene renombrarla al integrarla — `plaga-de-langostas` describe la
     ilustración mejor y evita el equívoco. Si se cambia, hay que cambiar
     también el nombre del archivo de arte.

### Decisiones firmes (no re-litigar)

- **Facción Anunna**: diseño y arte existen, pero fue **descartada**. No
  integrar sin que lo pidan.
- **PvP local**: aparcado explícitamente.
- **Inglés / i18n**: aparcado, «mucho mucho más adelante».
- **Escenario «Bastión de los Pilares»** (repo aparte): probado y rechazado.
- Todas las facciones abiertas desde el principio, sin progresión ni desbloqueos.

### Verificado solo a medias

Las capturas del panel salen pequeñas, así que de los escenarios nuevos está
confirmada la composición, el color y que nada tape el tablero, **pero el
detalle fino de las texturas no**. Y la música **nunca se ha oído**: está
verificada por estructura (tests) y por lectura del grafo de audio.

---

## 8. Ideas para seguir

No están ordenadas por prioridad, sino agrupadas. Son propuestas: conviene
contrastarlas con el dueño antes de meterse en las grandes.

### Visual — barato y con mucho retorno

1. **Sombras de contacto bajo las unidades.** Hay una textura
   (`contactShadowTexture`) ya hecha. Las piezas tienden a parecer flotando
   sobre la losa; una mancha suave bajo cada una las asienta.
2. **El tablero no reacciona al ciclo de la partida.** La luz es idéntica en el
   turno 1 y en el 30. Un desplazamiento lentísimo de la clave (el sol avanzando
   unos grados por turno) daría sensación de duración sin distraer.
3. **Las casillas amenazadas, de despliegue y válidas comparten vocabulario con
   los avisos de daño.** Vale la pena revisar que un jugador nuevo distinga de
   un vistazo qué es información y qué es decorado.
4. **Reflejo de las piezas en los suelos brillantes.** El Rompiente (roca
   mojada), la Corte (esmalte) y el Patio (acero) tienen rugosidad muy baja y se
   nota que les falta devolver algo. Sin `envMap` no hay reflejo real, pero una
   copia espejada y muy transparente de la pieza bajo la losa es barata.
5. **Los seis escenarios antiguos no tienen el nivel de los cuatro nuevos.**
   Ciudadela, Santuario, Caldera, Duna, Fiordo y Claro se hicieron antes de
   aprender lo de la sección 3. Revisarlos con esas reglas en la mano —sobre
   todo la del encuadre— probablemente destape decorado invisible.

### Visual — más grande

6. **Un escenario propio para las facciones que aún comparten.** Quedan Arcano,
   Orden y Olimpo juntos en la Ciudadela (coherente), pero Furia/Quinto Sol y
   Fimbul/Bestiario podrían separarse. Quinto Sol (mexica: obsidiana, sangre,
   cuenta de los días) es la que más chirría en la Caldera.
7. **Animación de las cartas al entrar en juego.** Ahora aparecen; podrían
   llegar.

### Jugabilidad

8. **El reparto de victorias está muy abierto** (sección 6). Es el problema más
   gordo. Pero ojo: buena parte se explica por límites de la IA, no de las
   cartas, así que lo primero es decidir si se arregla la IA o las listas.
9. **La IA no planifica a varios turnos vista.** Es la causa de que los mazos de
   control rindan por debajo. Mejorarla levantaría a Arcano, Marea, Duna y
   Quinto Sol de golpe, sin tocar una sola carta — probablemente el cambio con
   más efecto por línea escrita de todo el proyecto.
10. **La IA ya valora los hechizos de reposicionamiento** (21 oct 2026).
    Resaca Súbita, Canto de la Sirena, Marea Viva y Vorágine se simulan con
    `applyAction`: se compara material, intercambios habilitados y amenaza al
    Nexo en la siguiente respuesta rival, incluyendo mover antes de atacar.
    Conserva empujes inútiles y evita atracciones peligrosas. Se corrigió
    además la integración de `push-target`: faltaba en `spellNeedsPiece`, por
    lo que Resaca y Canto se podían gastar sin objetivo y sin mover nada.
    Las pruebas de `ai-positioning.test.ts` cubren los efectos reales en ambos
    asientos, inmunidad, bloqueo, remate, atracción y aturdimiento.
    **Pendiente:** valorar el empuje de ataques y despliegues, planear varios
    turnos y medir de nuevo el balance. La amenaza prevista es conservadora:
    prueba cada atacante por separado, sin combinaciones ni mano rival.
11. **`Esqueleto Guerrero`** sigue sin arreglar a propósito: resucitar es una
    acción de jugador con coste y UI propia, una feature de verdad y no un
    bugfix. No la emprendas sin que lo pidan.
12. **Las partidas duran mucho** (media de 55 turnos en simulación, mediana 47).
    Merece la pena mirar si eso es lo que se quiere.

### Mantenimiento

13. **`Board3D.tsx` ha vuelto a crecer.** Los obstáculos ya se extrajeron a
    `terrain/`; los tintes, la atmósfera y la costura del mediocampo podrían
    seguir el mismo camino.
14. **`SanctuaryScenario.tsx`** es un envoltorio de una línea. O se le da
    contenido o se elimina y se usa `RunicSanctuary` directamente.
