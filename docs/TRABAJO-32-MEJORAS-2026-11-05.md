# Trabajo autorizado — 32 mejoras, 5 de noviembre de 2026

Estado: ejecución activa. Usuario aprobó expresamente los cuatro marcos v2 y pidió hacer toda la selección en una sesión continuada, pasando de un punto a otro. No hay temporizador creado.

Rama de ejecución: `codex/32-mejoras`, creada desde main y avanzada al acumulado `b5091d8`. No modificar magicfable. PR de referencia #2; no fusionar main ni publicar sin autorización.

## Registro

| ID | Estado | Comprobación/retoma |
|---|---|---|
| 1 | Integrado | Cuatro WebP v2 activos en HTML/3D; cargan a 1920, 1366 y 390. |
| 3 | Integrado | Prueba de todos los chasis sin desbordes de nombres ni reglas. |
| 4 | Integrado | Actual/máxima en medallón e inspector; comprobado en los tres tamaños. |
| 5 | Integrado | Cobro, desglose exacto y exclusión de descuentos no usados; 10 pruebas de motor y 3 navegadores. |
| 11 | Integrado | Origen, objetivo y cantidad procedentes de eventos reales. |
| 12 | Integrado | Distingue protección absorbida, escudo concedido y aura vital; prueba de ataque real. |
| 13 | Integrado | Contagio, maldición y quemadura identificables; prueba de contagio del motor. |
| 14 | Integrado | Crónica en orden con Vida al inicio/cierre de la acción; datos persistidos. |
| 17 | Integrado | Fracturas persistentes y energía del relicario según integridad; máximos de jefe y guardián incluidos. |
| 18 | Integrado | Ajuste desactivado, sutil o pulso suave; respeta movimiento reducido. |
| 21 | Integrado | Auditoría real 38/38 de 19 escenarios, 2 cámaras y 2 resoluciones. |
| 22 | Integrado | Relieve y materiales por suelo, sin cambiar la asignación por facción. |
| 23 | Integrado | Detalles ambientales en bordes por familia de mundo. |
| 26 | Integrado | Reflejos/ondas con variante ligera y pausa con movimiento reducido. |
| 28 | Integrado | Partículas y ambiente según mundo y calidad. |
| 29 | Integrado | Cuatro variantes de luz probadas en Atlas/3D. |
| 30 | Integrado | Atlas real de 19 escenarios; vista previa sin tocar la partida hasta aplicar. |
| 31 | Integrado | Cabecera adaptable; pruebas de solapamiento a 1920, 1366 y 390. |
| 33 | Integrado | Panel contextual de carta, ficha, fase, Esencia y modificadores. |
| 38 | Integrado | Abanico lleno menos curvado; pruebas de diez cartas y extremos. |
| 39 | Integrado | Razón concreta compartida con validación de mano; pruebas de turno/objetivo/pago/sacrificio. |
| 43 | Integrado | 19 timbres originales, conectados a los eventos y a la mezcla existente. |
| 52 | Integrado | Laboratorio 2D con motor real, control de ambos bandos y sin tocar la partida normal. |
| 61 | Integrado | 19 crónicas de tres capítulos, rivales, diálogos y progreso por facción. |
| 63 | Integrado | Tres guardianes con dos fases reales; transición y vuelta a la aventura probadas. |
| 67 | Integrado | Serie al mejor de tres con marcador, semillas y mazos fijos por serie. |
| 71 | Integrado | Caminos del umbral: 9 pisos, rutas y guardado; clásica de 19 conservada. |
| 72 | Integrado | Encuentros de expedición con consecuencias y guardas antes de entrar. |
| 73 | Integrado | Guardianes con Vida y fuentes iniciales reales; prueba de batalla. |
| 74 | Integrado | Tres reliquias funcionales e idempotentes al recargar. |
| 76 | Integrado | Torre corta de 5 pisos y guardián final. |
| 101 | Integrado | Placa y medallones al pie, con nombres y cifras sin hover; captura en 3 tamaños. |

## Reparto de archivos

- Principal: marcos/cartas/indicadores, BattlePage, combate, sonido, rutas App y cableado de modalidades.
- escenarios_atlas: escenarios/** y nueva ScenarioAtlasPage; contrato de variantes de luz.
- modos_campanas: módulos adventure, página de modos y laboratorio; contrato de inicialización/resultado.
- torre_variantes: store/tower, TowerPage y módulos puros nuevos; contrato de guardianes y reliquias.

Los agentes no cambian ramas ni crean commits. Integración y validación final coordinadas por principal. Guardar resultados y siguiente acción aquí al cerrar cada subbloque. No marcar como terminado por una captura o un archivo creado.

## Validación final

- 791 pruebas unitarias correctas y 5 omitidas. Lint y compilación con base de GitHub Pages correctos.
- Navegador: 153 casos correctos en la pasada general y 123 opcionales omitidos. Los cinco fallos de esa pasada se repitieron tras corregir el objetivo táctil de Ajustes y actualizar las esperas y el clic sobre la geometría real: los cinco pasaron.
- Auditoría independiente: 38/38 combinaciones de facción y resolución, con dos cámaras por caso. El Atlas, el laboratorio y la Torre también se comprobaron a 390 px.
- En la compilación se abrieron Aventuras, Laboratorio y el tablero 3D del Atlas; los cuatro marcos WebP se sirvieron correctamente y no hubo errores de ejecución.
- Capturas: `tools/captures/32-mejoras/`, `tools/captures/auditoria-escenarios/`, `tools/captures/atlas/`, `tools/captures/tower-variants/` y `tools/captures/adventures/`.
