# Auditoría de ritmo, IA y equilibrio de batalla

## Ritmo

Reproducción de 32 partidas completas del motor, con cuatro semillas, cuatro
cruces y ambos asientos. Se acumulan los temporizadores reales de la cola,
presentación de cartas, entrada de duelos y demora programada de la IA rival.
Velocidad ×1, sin saltar escenas ni activar movimiento reducido. No incluye
deliberación humana, tiempo de cálculo, renderizado ni escenas fuera de la cola.
La comparación antes/después usa exactamente las mismas jugadas.

| Ritmo | Mediana anterior | Mediana nueva | Percentil 95 anterior | Percentil 95 nuevo |
|---|---:|---:|---:|---:|
| Cinemático | 379,17 s | 323,35 s | 871,96 s | 743,08 s |
| Normal | 221,47 s | 221,47 s | 504,28 s | 504,28 s |
| Rápido | 135,84 s | 135,84 s | 316,47 s | 316,47 s |

Cinemático ahorra 55,82 s por partida mediana (14,7 %). El ahorro viene de
acortar impactos, escudos, desplazamientos y entradas de duelos repetidos, y de
presentar cartas breves durante 3,2 s. Los poderes, míticas, textos largos,
Ofrenda pagada y resultados de Chispa conservan 5 s. También conservan su
duración la invocación y el impacto al Nexo. La animación sobre el tablero
consume el mismo reloj que la cola.

## Tiempo de decisión

Medición en Node en el equipo de desarrollo, con 20 posiciones sintéticas por
facción y tamaño. Se comparan 32, 48 y 56 piezas, con ambos ejércitos y acciones
legales. Duna tiene una Ofrenda pagable. 300 decisiones por versión, todas
legales. El presupuesto de producción de la planificación táctica es 28 ms
cuando aplica. Las cifras dependen del equipo y excluyen UI y renderizado.

| Facción con 56 piezas | P95 anterior | P95 actual | Máximo actual |
|---|---:|---:|---:|
| Tercios | 0,25 ms | 21,01 ms | 21,93 ms |
| Marea | 0,36 ms | 12,27 ms | 12,49 ms |
| Duna | 0,06 ms | 5,04 ms | 5,14 ms |
| Goblins | 0,24 ms | 12,33 ms | 12,59 ms |
| Samsara (control, sin planificador de facción) | 0,35 ms | 0,34 ms | 0,39 ms |

Las pruebas tácticas existentes reproducen la pérdida de Formación, el empuje
seguido de avance y remate, y Ofrenda con y sin beneficio. La medición de mesa
llena evalúa el coste adicional en condiciones sintéticas distintas.

## Resultados por mazo

El ensayo A/B mantiene mazo, rival, semilla y asiento. Solo cambia la IA de
la facción examinada. Se usan seis semillas, dos asientos y un presupuesto
determinista de nodos. 264 pares de partidas (528 ejecuciones).

| Facción | Pares | Victorias IA anterior | Victorias IA táctica |
|---|---:|---:|---:|
| Tercios | 72 | 16 | 36 |
| Marea | 60 | 15 | 17 |
| Duna | 72 | 34 | 35 |
| Goblins | 60 | 0 | 8 |

Quedó una partida sin resolver con la IA anterior de Tercios. En el cruce
directo de la muestra corta, Samsara ganó 8/8 frente a Goblins con ambas
versiones. La prueba aislada de la pasiva de robo de Samsara redujo sus
victorias contra Arcano de 11/12 a 3/12, pero contra Goblins siguió en 12/12.
El resultado depende del rival. No se han cambiado cartas ni mazos.

### Prueba humana pendiente

Usar los mazos iniciales de Samsara/Goblins y Samsara/Arcano. Para cada cruce,
hacer cuatro partidas por pareja de probadores, combinando ambos pilotos en
cada facción y cada orden de salida. Mantener escenario y reglas fijos.
Registrar turno de vuelco, carta o jugada decisiva, Vida y tamaño de mano al
cierre, qué respuestas había en mano y si había Esencia para jugarlas.
Repetir el cruce con otra pareja antes de tratar un patrón como general.
La simulación y las posiciones controladas no aportan esos datos humanos.

## Repetir las mediciones

En PowerShell:

```powershell
$env:RUN_BATTLE_AUDIT = '1'
npm run test -- src/battle/wholeBattleAudit.test.ts

$env:RUN_TACTICAL_AB = '1'
$env:TACTICAL_AB_SEEDS = '6'
$env:TACTICAL_AB_OUT = '.git-tactical-ab.json'
npm run test -- src/game/ai-tactical-ab.test.ts
```
