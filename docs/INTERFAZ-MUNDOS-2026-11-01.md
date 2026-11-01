# Escenas de interfaz — 1 de noviembre de 2026

Seis ilustraciones originales generadas con la herramienta integrada ImageGen
para el rediseño autorizado de portada, navegación y Torre del Nexo. Las tres
referencias de la portada y de la Torre son ilustraciones del propio proyecto:
`dragon-caldera.webp`, `coloso-de-la-fundicion.webp` y
`bromuro-el-afortunado.webp`. Los cuatro territorios se generaron mediante
instrucciones propias, sin referencias externas, marcas ni nombres de artistas.

## Archivos entregados

Los seis WebP completos y sus variantes `-small.webp` están en
`public/assets/interface/`. Los maestros PNG, el optimizador de formato y el
registro de generación se conservan en
`tools/art-inbox/interface-2026-11/` (ignorado por Git). Las escenas se muestran
sin texto ni interfaz incrustados; todos los controles siguen siendo HTML.
La conversión a WebP solo reduce peso/resolución, sin modificar la composición.

| Escena | Uso |
| --- | --- |
| `nexo-convergencia-v1` | Portada y atmósfera de las pantallas de menú |
| `torre-asedio-v1` | Torre del Nexo y acceso desde la portada |
| `territorios-hierro-v1` | Furia, Forja, Goblins, Tercios |
| `territorios-imperios-v1` | Orden, Duna, Jade, Olimpo, Quinto Sol |
| `territorios-salvajes-v1` | Naturaleza, Bestiario, Fimbul, Marea, Kalevala |
| `territorios-umbrales-v1` | Arcano, Sombra, Vacío, Plaga, Samsara |

Cada facción tiene además una ilustración original existente, sin marco ni
estadísticas de carta, y un enlace que selecciona su mazo antes de abrir Jugar.
La lista de territorios se usa solo para la composición artística de portada;
no añade facciones, cartas ni reglas al juego. Las bendiciones de Torre
reutilizan ilustraciones existentes como acompañamiento visual: su descripción
y sus efectos continúan procediendo de `src/store/tower.ts`.

## Criterios de integración

- Arte a todo el ancho, sin grandes márgenes laterales vacíos.
- Zonas de lectura oscurecidas localmente, conservando la escena visible.
- Criaturas y ataques integrados en paisajes nuevos; no se reutiliza el montaje
  de la carpeta de pruebas del propietario.
- Movimiento decorativo mediante CSS, sin WebGL ni bucles de JavaScript.
  Se detiene por preferencia de movimiento reducido del sistema o del juego,
  y también con calidad gráfica baja. Ninguna información depende del efecto.
- La Torre conserva selección, pisos, Vida persistente, bendiciones y abandono.
  Los marcadores sobre el paisaje son decorativos; no permiten saltar pisos.
- Las imágenes inferiores y retratos se cargan bajo demanda. La variante grande
  también se pide en móvil cuando el recorte de portada necesita más detalle.
- Pruebas y revisión en `127.0.0.1:4175`: la carpeta independiente Cronicasargon
  ocupa el puerto habitual 4173. `E2E_PORT` permite elegir otro puerto conservando
  el valor habitual por defecto, sin cerrar servidores ajenos.

## Verificación

Verificación: 722 unitarias correctas y 5 omitidas; compilación y lint correctos.
La batería e2e general cerró 107 casos correctos y detectó la numeración
decorativa dentro del texto de navegación. Tras corregirla sin modificar la
prueba original, los diez recorridos afectados pasaron; las 108 pruebas activas
quedan comprobadas y 43 sondas opcionales permanecen omitidas. Capturas en
`tools/captures/interface-2026-11/` a 1920 × 1080, 1366 × 768 y 390 × 844.
El arte nuevo se incluye en la caché bajo demanda de la PWA.

## Prompts completos

### nexo-convergencia-v1

```text
Use case: stylized-concept. Asset: original cinematic fantasy game website panoramic hero, landscape 16:9, extremely polished realistic painterly key art, no text, no lettering, no UI, no card frames, no logos. Crónicas del Nexo world. Supporting references are project-owned illustrations: black basalt dragon with molten amber seams, enormous bronze furnace automaton, mischievous olive goblin engineer; preserve their species and material identity if used. Invent an entirely new sweeping composition, NOT a collage of cards. View from a monumental broken stone bridge in the clouds into a vast nexus where different lands meet. A luminous suspended citadel with carved ivory archways and a shattered blue crystal at center-right; at far right an enormous living ancient tree guardian climbs a mossy escarpment; a black volcanic dragon arcs through the upper right sky, small relative to the impossible architecture. Far below the bridge, visible depth: a jade pavilion, distant stepped solar temple, a golden necropolis, a frosted fjord, and a coastline with a leviathan silhouette. Several tiny travelers establish incredible scale. Art fills ALL edges, especially sides and bottom, no black or empty borders. Most action and architecture occupies right 65%; left third is rich atmospheric indigo sky and distant shadowed mountains, softly detailed and darker for HTML title legibility. Strong diagonal bridge leading toward a pale amber horizon, deep midnight-blue colored shadows, emerald light of grove, localized molten orange, pale gold illuminated edges. Physical worn stone and metal, layered mist catching the light, fine sparks, magnificent mysterious world to explore. Sophisticated restrained saturation and sharp silhouettes, narrative depth, no generic symmetrical poster, no flat digital collage, no text.
```

### torre-asedio-v1

```text
Use case: stylized-concept. Asset: premium fantasy game challenge screen original illustration. Landscape 3:2 composition with a gigantic vertical tower centered at x=64%, summit and base fully visible, tower occupying 85% of height. No text, no UI, no card frames, no logo. Supporting reference illustrations are project-owned black volcanic dragon, bronze furnace colossus, and mischievous olive goblin engineer. Use their identities in new action poses. A colossal ancient basalt-and-bronze tower built in 19 staggered fortified tiers, outer spiral stairways, enormous buttresses, floating fractured bridges, a faceted Nexus crystal at the summit splitting the thunderclouds with pale gold and cyan radiance. The viewer stands among tiny conquerors at the base, looking up into impossible height. A bronze furnace automaton actually CLIMBS lower tower walls with one hand gripping a ledge; a forest beast ascends roots around a buttress; green goblin climbers with ropes hang from the mid-level parapet; winged black volcanic dragon spirals near the upper third. Terraces host tiny pike formations beneath gold magical shields. A frozen blue lance strikes a ward at one level, roots coil around a stairway, a purple portal opens in midair at another, and an orange fire spell streaks diagonally from the opposite side. Beautiful colored spells around the tower with distinct sources and targets, physical light illuminating masonry, no chaotic neon everywhere. Tower is by far the largest silhouette. Crashing ocean and abyssal rock at base, indigo clouds, amber sparks, turquoise arcane lightning, copper-red magical fire, violet distant gateways, teal reflected light. Left quarter has shadowed rock and luminous mist for HTML interface overlay; still filled with painterly terrain, not black emptiness. This must feel like conquering an impossible fortress, spectacular scale, sophisticated realistic fantasy illustration, extreme material richness, clear architecture, luminous focal summit. No lettering.
```

### territorios-hierro-v1

```text
Use case: stylized-concept. Original cinematic fantasy game website full-width panorama, landscape 16:9, no text, no UI, no frames. ONE continuous epic landscape, not collage: at far left black basalt volcanic crags, lava river and an obsidian dragon with molten amber seams breathing fire (Furia); at right monumental orderly bronze foundry and a furnace-bodied mechanical colossus moving on the ground (Forja); on a central cliff crooked goblin workshop of brass scrap, tiny olive goblin engineers launching a rocket with sparks (Goblins); Spanish early-modern pike formation with burgundy banners crossing a stone foreground bridge beneath golden magical shield (Tercios). Creatures fully integrated with ground contact, architecture vast, magnificent scale. Action right two thirds, left third richer quiet shadowed stone for HTML text. Lava orange keylight from below, deep cobalt colored shadows, copper and soot, sunset through smoke, glowing airborne ash. Premium realistic painterly fantasy, tactile materials, atmospheric depth, no black voids, fill every edge.
```

### territorios-imperios-v1

```text
Use case: stylized-concept. Original cinematic high fantasy game website chapter panorama 16:9. Five mythic cultures across ONE continuous magnificent valley, NOT separate panels. Pale gold Egyptian necropolis and enormous walking stone jackal colossus far left (Duna), Chinese jade celestial palace with curved roofs on high cliffs and emerald river dragon right (Jade), Greek marble acropolis beneath chained bronze titan center distance (Olimpo), Mesoamerican obsidian stepped solar temple and huge turquoise feathered serpent lower right (Quinto Sol), ivory armored winged angel holding golden magical shield over foreground bridge (Orden). Creatures stand within scenery with believable scale and shared perspective. Low amber setting sun right, cool violet blue gorge shadows, teal mist and luminous gold suspended dust, immense richly carved stone. Main spectacular architecture and creatures right 70%, left third shadowed detailed gorge for heading overlay. Premium painterly realistic key art, no lettering, no UI, no card frames, no logos, no black empty edges.
```

### territorios-salvajes-v1

```text
Use case: stylized-concept. Original fantasy game website full-bleed panorama landscape16:9. ONE continuous enormous magical wilderness, no collage: ancient living tree guardian and antlered luminous deer in emerald moss forest left (Naturaleza); huge horned behemoth climbs rocky ledge right foreground (Bestiario); deep blue frozen fjord beyond forest with frost giant and giant mythic wolf on glacier beneath aurora right background (Fimbul); bottom left sea leviathan raises scaled neck from ocean surf (Marea); amber northern lake with birches and golden mythic eagle of Pohjola spreading wings, tiny rune singer on shore center (Kalevala). Creatures physically belong to terrain, ground contact, strong silhouettes at different depths. Teal aurora, amber distant sunset through foliage, deep indigo colored shadows, glowing layered mist, pale icy blue shards and ocean spray. Main creatures center and right70%, quieter shadowed woods on left for HTML heading. Sophisticated realistic painterly epic fantasy, fill all edges, no black dead space, no text no UI no frames.
```

### territorios-umbrales-v1

```text
Use case: stylized-concept. Original high fantasy game website panorama landscape16:9. Five magical factions in ONE continuous deeply layered mystical landscape. Right foreground enormous translucent azure crystalline golem among rune-carved monoliths and floating ice shards (Arcano); necromancer and shadow bat by violet funerary ruins left midground (Sombra); immense cosmic basilisk curled around a fractured stone gateway showing stars high right (Vacío); distant stitched plague titan with rusty iron and sickly green aura among lower ruins, no closeup gore (Plaga); luminous gold-winged garuda above Indian carved river steps and lotus lake center (Samsara). Bridges and moonlit water unite environments, creatures within landscape not pasted in. Deep indigo colored shadows, icy cyan and soft gold keylights, violet localized portals, suspended dust and blue mist, tactile stone and crystal. Main visual spectacle center-right70%, left third quieter detailed dark water for heading overlay, no black empty edges. Premium realistic painterly fantasy key art with clear silhouettes and monumental architecture, no text no UI no card frames.
```
