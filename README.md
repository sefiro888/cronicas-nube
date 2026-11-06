# Crónicas del Nexo

**[▶ Jugar en el navegador](https://sefiro888.github.io/cronicas-nube/)**

**Estado al 6 de noviembre de 2026.** `main` de `sefiro888/cronicas-nube`
incluye Supabase independiente, obstáculos destructibles, hechizos emblemáticos,
formas del Nexo por facción y ajustes del ritmo Cinemático. La versión de juego
publicada y verificada es `ef3f235`.

Para continuar, lee [AGENTS.md](AGENTS.md) y el
[traspaso vigente](docs/ESTADO-Y-SIGUIENTE.md#traspaso-vigente--6-de-noviembre-de-2026).
Las notas fechadas de entregas anteriores son históricas.

Juego táctico de cartas de fantasía para PC, en español: duelos 1v1 sobre un
**tablero 8 × 8 en 3D**, contra la IA o en salas multijugador en línea.
Las unidades y estructuras conservan su forma de carta sobre el tablero.
También se puede instalar como PWA.

**Contexto del 1 de noviembre de 2026.** Este README es el punto de entrada
para entender el juego y continuar su desarrollo. Distingue contenido integrado,
trabajo local y diseños pendientes: tener un dosier no significa ser jugable.

**Rediseño del 1 de noviembre:** portada y navegación renovadas, atlas
ilustrado con las 19 facciones y Torre del Nexo con escena de conquista,
selección de expedición y bendiciones ilustradas. Se han creado seis escenas
originales y se conserva el funcionamiento del juego. **La entrega está
publicada y comprobada en la web**, con compilación y despliegue correctos en
[GitHub Actions](https://github.com/sefiro888/magicfable/actions/runs/41294375177).
Véanse el
[registro actual de continuidad](docs/ESTADO-Y-SIGUIENTE.md) y el
[inventario de escenas y prompts](docs/INTERFAZ-MUNDOS-2026-11-01.md).
Las referencias a pausa, prototipos sin publicar y última entrega del
30 de octubre en los apartados históricos siguientes deben leerse junto a
las publicaciones del 31 de octubre recogidas en ese registro.

## Estado actual

| Contenido integrado | Cantidad |
| --- | --- |
| Facciones jugables, abiertas desde el inicio | **19** |
| Diseños de cartas, sin contar comandantes | **517** |
| Comandantes | **25** |
| Mazos iniciales | **19**, de 50 cartas cada uno |
| Escenarios 3D | **19**, uno por facción |
| Pisos de la Torre del Nexo | **19**, derivados del catálogo de mazos |

El catálogo comprende 90 cartas de NEX-01, 24 de NEX-02 y 31 por cada set de
NEX-03 a NEX-15. Las seis facciones originales tienen dos comandantes; las otras
trece, uno. Los recuentos, esquemas y recursos de arte se comprueban en
[`src/game/data.test.ts`](src/game/data.test.ts).

La última entrega de juego subida a `main` antes de esta revisión documental es
[`5dd7e15`](https://github.com/sefiro888/magicfable/commit/5dd7e15): incluye
Goblins, Tercios y Kalevala, correcciones de sus interacciones y avisos en el
suelo cuando mover rompe Formación y puede matar unidades. El 30 de octubre se
comprobó que [su flujo de compilación y despliegue terminó correctamente](https://github.com/sefiro888/magicfable/actions/runs/40933625884).
El resultado de las siguientes publicaciones se consulta en
[GitHub Actions](https://github.com/sefiro888/magicfable/actions).

**Nota histórica del 30 de octubre.** El desarrollo de juego quedó en pausa por petición del propietario. Esta
actualización documental no reanuda las mejoras visuales ni integra prototipos.
Para continuar trabajo de juego hay que partir de una nueva petición y revisar
el estado de Git, conservando los cambios existentes.

## Qué incluye

- **Escaramuza contra IA:** selección de facción, mazo, comandante y escenario;
  mulligan, Esencia, despliegue, movimiento, combate y victoria por Nexo.
  La IA usa las acciones legales del mismo motor.
- **Torre del Nexo:** combates consecutivos con Vida del Nexo persistente,
  bendiciones entre pisos y duelo espejo final. El mazo no cambia durante la
  subida; el progreso y la mejor marca se guardan localmente.
- **Multijugador en línea:** salas efímeras por código de cinco letras mediante
  Supabase Realtime, elección de mazo/comandante, sincronización, gestión de
  desconexión y revancha. Requiere red y un servicio Supabase disponible;
  tener la función implementada no garantiza disponibilidad del servicio remoto.
  No hay cuentas, emparejamiento ni clasificación. El PvP local está aparcado.
- **Colección:** galería de cartas, visor de ilustraciones y consulta de mazos.
  El catálogo integrado tiene WebP y respaldo SVG por carta: ya no se limita a
  los 90 bocetos iniciales.
- **Seguimiento:** historial, estadísticas separadas de IA/PvP, logros y reto
  diario; preferencias y otros estados persistentes mediante Zustand.
- **Presentación:** mano en abanico recogible, inspección de cartas y estados,
  guía inicial, modo foto, calidad baja/media/alta, movimiento reducido,
  velocidad de animación y controles de volumen.
- **Audio propio:** efectos, ambiente y música procedural por escenario,
  sintetizados localmente con Web Audio.
- **PWA:** instalación y caché del shell de la aplicación. El arte se almacena
  bajo demanda y la caché tiene límites; no se descarga todo el catálogo para
  jugar sin conexión desde la primera visita. El multijugador necesita red.

## Reglas esenciales y controles

Cada mazo tiene **50 cartas: 20 fuentes de Esencia y 30 cartas no fuente**.
Las normales no fuente admiten hasta cuatro copias; las únicas, una.
El comandante y las cartas deben pertenecer a la facción del mazo.

Ambos bandos empiezan con **10 cartas** y conservan el robo normal de turno.
Cuando hay que robar y el mazo está vacío, se baraja el cementerio para formar
un nuevo mazo y se roba lo que corresponda. No se rellena automáticamente la
mano ni se recuperan piezas o fuentes en juego. Si tampoco queda cementerio,
no se roba ni se aplica daño de fatiga.

1. En el mulligan, conserva la mano o marca las cartas que quieras cambiar.
2. Pulsa una fuente de Esencia para colocarla: como regla general, una por turno.
3. Selecciona una carta jugable y una casilla de despliegue válida.
4. Selecciona una unidad aliada para ver movimientos y objetivos legales.
5. Pulsa una casilla para mover, o una carta enemiga o su Nexo para atacar.
6. Resuelve las elecciones de cartas o Chispa cuando aparezcan y termina el turno.

`Esc` cancela; clic derecho o `I` permite inspeccionar. «Saltar animaciones»
aparece cuando la cola es larga. El modo desarrollador está disponible solo
en desarrollo mediante `Ctrl+Mayús+D`.

**Mover puede romper Formación:** retirar apoyo puede restar Vida y matar a la
unidad movida o a otras aliadas, incluso en cadena. Los destinos con pérdida
de Vida se señalan en ámbar y los mortales, en rojo con grietas y calavera.
El aviso calcula el movimiento con el motor real. El hollín y la lava decorativa
no añaden daño por pisarlos.

## Las 19 facciones integradas

| Facción | Identidad y mecánicas principales |
| --- | --- |
| Furia | Agresión, fuego y daño inmediato |
| Arcano | Control, hielo y robo de cartas |
| Naturaleza | Crecimiento, curación y Esencia |
| Orden | Defensa, escudos y estructuras |
| Sombra | Veneno, descarte y cementerio |
| Vacío | Portales, teletransporte y distorsión |
| Duna | Ofrenda, Juicio y remontadas con Vida baja |
| Fimbul | Desafío y Furor |
| Samsara | Renacer y ciclo de unidades |
| Jade | Mandato y elementos |
| Olimpo | Hybris y Metamorfosis |
| Quinto Sol | Sacrificios y Cuenta del Sol |
| Bestiario | Bestias grandes y palabras clave |
| Plaga | Contagio y apropiación de unidades caídas |
| Marea | Ciclo de las aguas, empujes y reposicionamiento |
| Forja | Ensamblaje, estructuras y autómatas |
| Goblins | Chispa y Petardazo |
| Tercios | Formación y Descarga |
| Kalevala | Runo acumulativo y Canto |

La incorporación más reciente añade **93 cartas, tres comandantes, tres mazos
y 96 ilustraciones**. Chispa usa azar reproducible y elecciones legales;
Formación depende del apoyo actual del tablero; Runo no se gasta y Canto
hunde temporalmente unidades sin matarlas ni activar efectos de muerte.
Las decisiones manuales y de la IA comparten las opciones legales.

También se corrigieron la previsión de ataques de Canto, la valoración de
Chispa bajo silencio, las auras de vuelo silenciadas y las curaciones con
bonos de Vida o pérdidas permanentes. El detalle está en
[`tools/ESTADO-INTEGRACION-FACCIONES.md`](tools/ESTADO-INTEGRACION-FACCIONES.md).
Sus secciones «sin publicar» son históricas cuando una nota posterior registra
la publicación de esos cambios.

## Escenarios y renovación visual

La selección es automática según facción o manual en Jugar y Ajustes.

| Escenario | Facciones en modo automático |
| --- | --- |
| Aether Citadel | Arcano |
| Santuario de las Runas | Sombra |
| Fragua de la Caldera | Furia |
| Necrópolis de Duna | Duna |
| Fiordo de Fimbul | Fimbul |
| Claro del Bosque | Naturaleza |
| Rompiente de Nerith | Marea |
| Patio del Gremio | Forja |
| Corte de Jade | Jade |
| Escalinata de la Rueda | Samsara |
| Patio del Quinto Sol | Quinto Sol |
| Garganta del Bestiario | Bestiario |
| Bastión del Alba | Orden |
| Acrópolis de Olimpo | Olimpo |
| Baluarte de los Tercios | Tercios |
| Umbral de la Fractura | Vacío |
| Cripta de la Plaga | Plaga |
| Desguace de los Goblins | Goblins |
| Lago del Sampo | Kalevala |

El render actual combina geometría y materiales procedurales, panoramas
originales y recursos optimizados. La antigua descripción de una Ciudadela
basada únicamente en un GLB de Blender ya no describe el sistema actual.
Hay sombras de contacto, marcos físicos, estados sobre piezas, invocaciones,
ataques e impactos, deterioro y caída del Nexo, mejoras de inspección e interfaz
y diecinueve escenarios con suelos propios. Algunos entornos tienen reflejo planar
según calidad; el render bajo demanda reduce trabajo con movimiento reducido
o tras paneles opacos.

**La renovación de 50 mejoras no está terminada:** su listado individual mantiene
**11 verificadas y 39 con avances pendientes de revisión global**. Un escenario
integrado o una captura correcta no equivalen a cerrar su pulido. El estado por
tarea está en [`docs/RENOVACION-VISUAL.md`](docs/RENOVACION-VISUAL.md).

En la copia de trabajo revisada el 30 de octubre quedan cambios locales de
superficie, materiales y contraste del tablero, diez WebP de terreno aún sin
seguimiento, ajustes de sondas visuales y una prueba específica de caducidad
del hollín. **No forman parte de la entrega de juego `5dd7e15` ni de esta
actualización documental.** Hay originales y capturas en carpetas locales
ignoradas: un clon de GitHub no los incluye. Revisar `git status` antes de
continuar y no incorporar esos cambios como si estuvieran terminados.

## Arranque y comprobaciones

Requiere **Node.js 20.19 o superior**; GitHub Actions utiliza Node 22.

```bash
npm ci
npm run dev
```

Abre `http://localhost:4173`. El puerto es fijo: evita iniciar otro servidor si
ya existe uno. Para compilar y previsualizar localmente:

```bash
npm run build
npm run preview
```

Comprobación mínima antes de entregar cambios:

```bash
npm run test
npm run build
npm run lint
```

Si cambias navegación o batalla, añade Playwright y revisión visual a
**1920 × 1080 y 1366 × 768**:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright inicia o reutiliza el servidor local, usa Chromium y un solo worker.
No ejecutes compilaciones ni modifiques fuentes durante las pruebas WebGL.
Las sondas visuales opcionales tienen variables propias: actívalas solo para
el archivo correspondiente, no globalmente para toda la batería. Las capturas
y resultados generados no se versionan.

Referencia de la última entrega de juego: **697 pruebas unitarias correctas
y 5 omitidas**, compilación y lint correctos. La última batería e2e completa
anterior al aviso de Formación registró **97 correctas y 43 sondas opcionales
omitidas**; después se verificó la interfaz afectada por el aviso y siete
comprobaciones de suelo, con repetición correcta de un fallo de red. Son
registros de ejecuciones concretas, no una garantía de equilibrio ni una nueva
pasada completa de e2e. Consultar el registro de integración para el detalle.

En esta revisión documental del **30 de octubre** se ejecutaron nuevamente
`npm run test` (**697 correctas, 5 omitidas**), `npm run build` y `npm run lint`,
todos correctos sobre la copia de trabajo. No se repitió Playwright: esta entrega
solo cambia documentación y no valida como terminados los prototipos locales.

Desde el 6 de noviembre de 2026, esta copia utiliza el proyecto independiente
`cawihzwnibqxrplkhpbm` de Supabase para sus salas privadas. La configuración
del cliente incluye únicamente la URL y la clave publicable; no necesita la
contraseña de la base de datos ni una clave secreta. Las salas actuales usan
Realtime (presencia y mensajes), sin requerir tablas nuevas.

El multijugador permite configurar `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` en `.env.local` o en el entorno de compilación.
Usa la clave pública/anon de cliente, nunca credenciales de servicio. El código
incluye valores de cliente predeterminados y un aviso de error de conexión.
Cambiar variables requiere reiniciar el servidor o recompilar.

## Arquitectura y puntos de entrada

React 19, TypeScript estricto, Vite, Three.js/React Three Fiber y Drei,
Zustand, Zod, Vitest, Testing Library y Playwright.

```text
src/game/          motor puro, catálogo, esquemas, mazos, reglas, IA y pruebas
src/battle/        tablero 3D, cámara, cartas, escenarios, materiales y efectos
src/multiplayer/   salas y sincronización con Supabase Realtime
src/pages/         inicio, jugar, batalla, multijugador, torre, colección y ajustes
src/components/    cartas, inspección y componentes compartidos
src/store/         partida, preferencias, torre, historial, logros y retos
src/services/      síntesis de audio y servicios auxiliares
public/assets/     ilustraciones, SVG de respaldo y recursos del juego
e2e/               recorridos de navegador y sondas visuales opcionales
docs/              continuidad, diseño, arte y dosieres de facciones
tools/             herramientas, registros y originales locales ignorados
.github/workflows/ comprobación y despliegue a GitHub Pages
```

- **Reglas y datos:** `src/game/engine.ts`, `types.ts`, `schemas.ts`, `cards.ts`,
  `expansionCards.ts`, `factions.ts` y `decks.ts`.
- **Mecánicas recientes:** `src/game/goblins.ts`, `tercios.ts`, `kalevala.ts`
  y `movementHazard.ts`; pruebas de interacción junto al motor.
- **IA:** `src/game/ai.ts`. Ya simula hechizos de reposicionamiento con
  `applyAction`; todavía no planifica combinaciones completas a varios turnos.
- **Presentación:** `src/battle/Board3D.tsx`, `scenarios/`, `textures.ts`,
  `scenarioCatalog.ts`, `scenarioPresentation.ts` y `scenarioForFaction.ts`.
- **Persistencia y sonido:** `src/store/` y `src/services/audio.ts`.

El motor no puede depender de React, Three.js ni del DOM. Resuelve las reglas
y emite eventos; las animaciones los consumen sin decidir resultados. Los datos
se validan con Zod al cargar. Mantén TypeScript estricto y evita `any`.

## Cómo continuar desde aquí

1. Lee [`AGENTS.md`](AGENTS.md) y este README. Comprueba rama, historial y
   `git status`: puede haber prototipos o trabajo de otra sesión.
2. Consulta [`tools/ESTADO-INTEGRACION-FACCIONES.md`](tools/ESTADO-INTEGRACION-FACCIONES.md)
   para la última entrega de juego y la pausa, y
   [`docs/RENOVACION-VISUAL.md`](docs/RENOVACION-VISUAL.md) para las 50 mejoras.
   Prioriza las notas posteriores sobre las anteriores del mismo registro.
3. Lee [`docs/ESTADO-Y-SIGUIENTE.md`](docs/ESTADO-Y-SIGUIENTE.md) por sus
   advertencias de cámara, luces, materiales e integración. Sus cifras y
   propuestas antiguas deben contrastarse con esta revisión y el código.
4. Delimita la petición actual. No reanudes una tarea solo porque un registro
   histórico diga «en curso», ni modifiques dosieres del propietario para
   acomodar atajos del motor.
5. Comprueba el comportamiento real antes de cambiar equilibrio: probar un
   ayudante no garantiza que el efecto esté conectado a la partida. Ejecuta
   las comprobaciones anteriores y documenta qué queda pendiente.
6. Al añadir contenido, revisa recuentos, Zod, mazos, presentación, arte y
   pruebas. `data.test.ts`, `alt-commanders.test.ts`, `engine.test.ts` y
   `balance-sim.test.ts` contienen expectativas que deben actualizarse.

Todo `card.id` necesita `public/assets/cards/art/<card-id>.svg`; su WebP
homónimo tiene prioridad. Mantén mazos legales, actualiza
[`docs/art-direction.md`](docs/art-direction.md) y lee
[`docs/GUIA-PROMPTS-ARTE.md`](docs/GUIA-PROMPTS-ARTE.md) antes de preparar arte.
No incorpores recursos de terceros sin licencia verificable. Los maestros
privados no se suben por defecto; la procedencia de panoramas e interfaz está en
[`docs/arte-escenarios.md`](docs/arte-escenarios.md) y
[`docs/arte-interfaz.md`](docs/arte-interfaz.md).

El proyecto se escribe en español en interfaz, comentarios y commits; los
identificadores van en inglés. Comentarios y commits explican el problema y
el porqué de la solución.

## Pendientes y límites conocidos

- **Pulido visual:** cerrar las 39 tareas con avances; comparar superficies,
  legibilidad, ataques, impactos, destrucciones y composición global. Hay una
  incidencia documentada de recorte del panorama de Ciudadela en modo foto:
  comprobar su estado antes de aplicar una propuesta histórica.
- **Equilibrio:** las simulaciones históricas detectaron ventaja alta de Samsara
  y límites de IA en mazos de posición o recursos. Esas mediciones anteriores
  a las tres facciones recientes no describen el equilibrio actual de las 19.
  Hace falta playtesting humano y nuevas mediciones autorizadas.
- **IA:** ampliar planificación y valoración de empujes en ataques/despliegues,
  además de los hechizos ya contemplados.
- **Diseñadas, sin integrar:** existen dosieres de Enjambre, Inmortales, Circo y
  Guaraní. No aparecen en `PLAYABLE_FACTIONS`. La nota histórica de Enjambre
  registra dos ilustraciones ausentes y un nombre de carta ambiguo: revisar
  la entrega de arte antes de integrarlo. Inmortales tiene una discrepancia
  documentada entre número de cartas y checklist.
- **Decisiones conservadas:** Anunna está descartada; PvP local e inglés/i18n
  están aparcados; todas las facciones jugables están abiertas desde el inicio.
  La resurrección manual de Esqueleto Guerrero sigue pendiente como función
  con coste e interfaz propia, no como un arreglo menor.
- **Validación audiovisual:** los tests de audio verifican estructura y
  comportamiento, no sustituyen una escucha. La revisión visual debe hacerse
  en cámara de juego y a tamaño real.

## Publicación y documentación de referencia

Cada push a `main` activa [las comprobaciones](.github/workflows/comprobar.yml)
(pruebas unitarias, compilación y lint) y [la publicación](.github/workflows/vista-previa.yml)
con base `/cronicas-nube/`. GitHub Pages sirve la web compilada desde `gh-pages`.
Para cambios de navegación o batalla, ejecuta también Playwright según AGENTS.md.

Los dosieres `docs/FACCION_*.md` detallan identidad, cartas y arte; el catálogo
y sus pruebas indican qué está implementado. Documentos de raíz como
`GAME_RULES.md`, `ARCHITECTURE.md`, `SCENARIO_GUIDE.md`, `PROJECT_AUDIT.md` y
`DEVELOPMENT_ROADMAP.md` conservan contexto histórico y pueden describir
versiones anteriores. Para continuar, sigue primero el orden de lectura de
este README y contrasta las cifras y pendientes con el código actual.
