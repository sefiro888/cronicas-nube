# IA táctica y revisión de equilibrio

La rama activa el planificador en dificultad Normal y Difícil para Tercios, Marea, Duna y Goblins. Cada consulta devuelve una sola acción y vuelve a pensar después de resolverla. En Fácil se conserva el comportamiento anterior. Las reglas, las estadísticas y la composición de los mazos siguen siendo las de la rama principal.

## Posiciones comprobadas

- **Tercios.** Un avance habitual dejaría a un aliado con 1 de Vida sin su último apoyo. La IA conserva el aliado. El planificador prueba rutas alternativas, despliegues de apoyo y ataques con el motor real.
- **Marea.** Canto de la Sirena aparta una Guardia. La IA conserva esa opción aunque cueste una carta, avanza a la fila del Nexo y remata después de volver a consultar la posición.
- **Duna.** Compara pagar o conservar Vida. Puede pagar por debajo del antiguo umbral si elimina el remate rival, o reservar esos puntos si la carta básica basta. Una prueba comprueba pagar Ofrenda para quedar por debajo del rival y aprovechar Juicio con Balanza de Maat en la siguiente decisión.
- **Goblins.** Valora el intercambio completo cuando una baja activa Petardazo. Evalúa las caras de Chispa que ya salieron. Si la cara no tiene objetivo legal, la resuelve sin blanco para que el turno continúe.
- **Guardas.** Tres pasos de horizonte, tres ramas y hasta 54 simulaciones por consulta. El objetivo temporal de 28 ms es cooperativo y puede excederse por una resolución individual, el trabajo de respaldo o el equipo. El plan no utiliza el contenido del mazo rival ni sigue ramificando con cartas recién robadas o tiradas aún sin revelar.

## Comparación de versiones

El banco enfrenta cada mazo objeto de estudio contra Samsara, Furia, Arcano, Orden, Marea y Goblins, omitiendo espejos. Cada par conserva semilla, asiento, mazos y rival. Solo cambia la política del bando estudiado. Ambas versiones comparten la corrección de Chispa sin objetivo para que un turno bloqueado no se confunda con una mejora de estrategia. Los enfrentamientos se ejecutan por acciones, igual que el juego, con un máximo fijo de simulaciones y sin límite de reloj para reproducir los resultados.

```powershell
$env:RUN_TACTICAL_AB = '1'
$env:TACTICAL_AB_SEEDS = '12'
$env:TACTICAL_AB_OUT = '.git/ia-ab.json'
npx vitest run src/game/ai-tactical-ab.test.ts --disableConsoleIntercept
```

El informe JSON guarda cada pareja, los turnos, acciones rechazadas y el resultado. El rendimiento de los cuatro mazos contra esta selección de rivales no es una tasa esperada para jugadores humanos ni se puede comparar directamente con el 91 % histórico de Samsara.

## Resultado de la simulación

Hubo 528 parejas de partidas (1.056 partidas en total) con 12 semillas y ambos asientos. Los conteos de victorias incluyen las parejas que alcanzaron el límite en el denominador.

| Mazo | Partidas por versión | Victorias antes | Victorias con planificación | Sin desenlace antes → después |
| --- | ---: | ---: | ---: | ---: |
| Tercios | 144 | 27 | 70 | 2 → 0 |
| Marea | 120 | 26 | 36 | 3 → 0 |
| Duna | 144 | 77 | 78 | 0 → 0 |
| Goblins | 120 | 1 | 9 | 3 → 1 |

En 73.034 decisiones de la versión táctica, la mediana fue 0,04 ms y el percentil 95 fue 1,33 ms en la ejecución final. La posición dirigida de 48 piezas con el presupuesto de batalla midió aproximadamente 10–31 ms por consulta. Las 1.056 partidas terminaron sin acciones rechazadas en esta muestra. Contra Samsara, Tercios pasó de 0 a 2 victorias de 24. Marea, Duna y Goblins siguieron en 0 de 24 cada uno.

## Experimento aislado de Samsara

Se probó solo en el banco el efecto de suprimir el robo de Indrayani al morir su primera unidad. Se conservó Renacer. La prueba emparejó otras 192 partidas, con la misma IA, semilla, asiento y mazos en ambas variantes.

| Rival de Samsara | Victorias con la pasiva | Victorias sin ese robo |
| --- | ---: | ---: |
| Furia · agresión | 24/24 | 19/24 |
| Arcano · control | 23/24 | 4/24 |
| Orden · defensa | 24/24 | 18/24 |
| Goblins · explosiones | 24/24 | 24/24 |

El robo explica una parte de la ventaja simulada, con un efecto especialmente grande contra Arcano. El resultado contra Goblins sigue intacto. Retirar la pasiva entera sería un cambio brusco y todavía faltan partidas humanas. El experimento se puede repetir con el mismo comando y sus resultados quedan en el campo `isolation` del informe.

## Prueba humana preparada

1. Dos personas juegan en sala privada con los mazos iniciales y comandantes predeterminados. Empezar con **Samsara–Goblins**, **Samsara–Tercios** y **Samsara–Arcano** para cubrir recuperación, formación y control. Añadir **Marea–Furia** y **Duna–Orden** como controles para los cambios de IA.
2. Por enfrentamiento, jugar cuatro partidas como mínimo. Si A usa Samsara y B Goblins, jugar primero con A como anfitrión y luego con B como anfitrión. Intercambiar los mazos entre personas y repetir los dos órdenes. Para hacer una segunda tanda, usar otros jugadores. En sala la semilla puede cambiar, por lo que se registra junto al resultado cuando esté disponible.
3. Al terminar, descargar el registro antes de repetir. Apuntar quién empezó, facción y comandante, resultado, turno de primera amenaza al Nexo, primer Renacer o Petardazo decisivo, turnos sin jugada, y una respuesta que el perdedor tuvo en mano o tablero. Si se perdió por una regla difícil de leer, marcarlo por separado.
4. Si el mismo patrón aparece con ambos jugadores y ambos órdenes, aislar la posición en el Laboratorio y ensayar una sola modificación en otra rama. Compararla con los mismos casos, además de Furia, Arcano y Orden. Antes de pasarla a la rama principal, revisar si el cambio conserva la identidad de la facción y las respuestas útiles del rival.

| Jugadores | Facciones y asientos | Semilla si consta | Ganador y turno | Acción decisiva | Respuesta disponible | Registro |
| --- | --- | --- | --- | --- | --- | --- |
| A / B | A empieza | | | | | |
| A / B | B empieza | | | | | |
| A / B | Mazos intercambiados, A empieza | | | | | |
| A / B | Mazos intercambiados, B empieza | | | | | |
