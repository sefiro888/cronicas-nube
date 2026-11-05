# Trabajo autorizado — 32 mejoras, 5 de noviembre de 2026

Estado: ejecución activa. Usuario aprobó expresamente los cuatro marcos v2 y pidió hacer toda la selección en una sesión continuada, pasando de un punto a otro. No hay temporizador creado.

Rama de ejecución: `codex/32-mejoras`, creada desde main y avanzada al acumulado `b5091d8`. No modificar magicfable. PR de referencia #2; no fusionar main ni publicar sin autorización.

## Registro

| ID | Estado | Comprobación/retoma |
|---|---|---|
| 1 | Integrado; QA general en curso | Cuatro WebP v2 activos en HTML/3D; cargan a 1920, 1366 y 390. |
| 3 | Integrado; QA general en curso | Prueba de todos los chasis sin desbordes de nombres ni reglas. |
| 4 | Integrado; QA general en curso | Actual/máxima en medallón e inspector; comprobado en los tres tamaños. |
| 5 | Integrado; QA general en curso | Cobro, desglose exacto y exclusión de descuentos no usados; 10 pruebas de motor y 3 navegadores. |
| 11 | Integrado; QA general en curso | Origen, objetivo y cantidad procedentes de eventos reales. |
| 12 | Integrado; QA general en curso | Distingue protección absorbida, escudo concedido y aura vital; prueba de ataque real. |
| 13 | Integrado; QA general en curso | Contagio, maldición y quemadura identificables; prueba de contagio del motor. |
| 14 | Integrado; QA general en curso | Crónica en orden con Vida al inicio/cierre de la acción; datos persistidos. |
| 17 | Integrado; QA general en curso | Fracturas persistentes y energía del relicario según integridad; máximos de jefe y guardián incluidos. |
| 18 | Integrado; QA general en curso | Ajuste desactivado, sutil o pulso suave; respeta movimiento reducido. |
| 21 | Integrado; QA general en curso | Auditoría real 38/38 de 19 escenarios, 2 cámaras y 2 resoluciones. |
| 22 | Integrado; QA general en curso | Relieve y materiales por suelo, sin cambiar la asignación por facción. |
| 23 | Integrado; QA general en curso | Detalles ambientales en bordes por familia de mundo. |
| 26 | Integrado; QA general en curso | Reflejos/ondas con variante ligera y pausa con movimiento reducido. |
| 28 | Integrado; QA general en curso | Partículas y ambiente según mundo y calidad. |
| 29 | Integrado; QA general en curso | Cuatro variantes de luz probadas en Atlas/3D. |
| 30 | Integrado; QA general en curso | Atlas real de 19 escenarios; vista previa sin tocar la partida hasta aplicar. |
| 31 | Integrado; QA general en curso | Cabecera adaptable; pruebas de solapamiento a 1920, 1366 y 390. |
| 33 | Integrado; QA general en curso | Panel contextual de carta, ficha, fase, Esencia y modificadores. |
| 38 | Integrado; QA general en curso | Abanico lleno menos curvado; pruebas de diez cartas y extremos. |
| 39 | Integrado; QA general en curso | Razón concreta compartida con validación de mano; pruebas de turno/objetivo/pago/sacrificio. |
| 43 | Integrado; QA general en curso | 19 timbres originales, conectados a los eventos y a la mezcla existente. |
| 52 | Integrado; QA general en curso | Laboratorio 2D con motor real, control de ambos bandos y sin tocar la partida normal. |
| 61 | Integrado; QA general en curso | 19 crónicas de tres capítulos, rivales, diálogos y progreso por facción. |
| 63 | Integrado; QA general en curso | Tres guardianes con dos fases reales; transición y vuelta a la aventura probadas. |
| 67 | Integrado; QA general en curso | Serie al mejor de tres con marcador, semillas y mazos fijos por serie. |
| 71 | Integrado; QA general en curso | Caminos del umbral: 9 pisos, rutas y guardado; clásica de 19 conservada. |
| 72 | Integrado; QA general en curso | Encuentros de expedición con consecuencias y guardas antes de entrar. |
| 73 | Integrado; QA general en curso | Guardianes con Vida y fuentes iniciales reales; prueba de batalla. |
| 74 | Integrado; QA general en curso | Tres reliquias funcionales e idempotentes al recargar. |
| 76 | Integrado; QA general en curso | Torre corta de 5 pisos y guardián final. |
| 101 | Integrado; QA general en curso | Placa y medallones al pie, con nombres y cifras sin hover; captura en 3 tamaños. |

## Reparto de archivos

- Principal: marcos/cartas/indicadores, BattlePage, combate, sonido, rutas App y cableado de modalidades.
- escenarios_atlas: escenarios/** y nueva ScenarioAtlasPage; contrato de variantes de luz.
- modos_campanas: módulos adventure, página de modos y laboratorio; contrato de inicialización/resultado.
- torre_variantes: store/tower, TowerPage y módulos puros nuevos; contrato de guardianes y reliquias.

Los agentes no cambian ramas ni crean commits. Integración y validación final coordinadas por principal. Guardar resultados y siguiente acción aquí al cerrar cada subbloque. No marcar como terminado por una captura o un archivo creado.

## Retoma de comprobación

- 791 unitarias correctas y 5 omitidas; compilación con base `/cronicas-nube/` correcta; lint corregido y repetido.
- Pruebas específicas: escenarios 38/38, Atlas 3/3, Torre 5/5, menús/modos/laboratorio 3/3 y casos de marcos, mano y efectos.
- Pasada general en puerto 4303, registro `.git/32-global.log`. Primer caso de aventura se inició con un límite de 5 s mientras corrían compilación y unitarias; se corrigió la espera de entrada y se repetirá el caso al acabar la pasada. No declarar QA general completa antes de revisar la salida.
- Capturas: `tools/captures/32-mejoras/`, `tools/captures/auditoria-escenarios/`, `tools/captures/atlas/`, `tools/captures/tower-variants/` y `tools/captures/adventures/`.
- Siguiente acción: leer la pasada general, corregir o repetir fallos, probar la compilación y guardar la revisión sin fusionar main.
