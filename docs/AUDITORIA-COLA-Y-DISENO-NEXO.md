# Auditoría de la cola y valoración de Crónicas del Nexo

Base de juego revisada: `main` en `913848b`. Los números corresponden a la [cola de la siguiente etapa](COLA-100-MEJORAS-SIGUIENTE-ETAPA.md). Se cruzaron las propuestas con código, pruebas de navegador, capturas y el banco de equilibrio. Las notas son una valoración de diseño. La duración en turnos de la simulación no mide los minutos de una partida humana.

## Correcciones a la cola

| Puntos | Evidencia en la versión actual | Trabajo que queda |
| --- | --- | --- |
| **30, 76** | Ajustes ya tiene Cinemático, Normal y Rápido. La pantalla final ya descarga un registro de la partida. | Cerrar el alcance básico. Si interesa ampliar, especificar la transición entre ritmos o un informe público con datos privados filtrados. |
| **1, 6, 7, 10, 12–15, 17, 19–20** | Ya hay emblemas, Runo propio, coste efectivo de Ofrenda, estados y previsiones concretas de ataque o movimiento. Formación ya advierte de pérdida de Vida. La previsión prueba Perforar y el registro reconoce efectos de Petardazo. | Mostrar poderes para ambos bandos, consecuencias de Juicio, regreso por Canto, origen del apoyo y demás datos situacionales que pide cada punto. |
| **2–5, 8–9, 11, 16, 18** | El motor contempla las mecánicas y el glosario explica varias. | Añadir la lectura pública y contextual propuesta. En particular, la pantalla de batalla carece de dueño visible del Mandato y valor visible de Cuenta del Sol. |
| **21–26, 28–29** | Existe duración total, tres ritmos, omisión de animaciones, agrupación en ciertas colas, avisos al acabar turno, mulligan con pista de fuentes, banner de turno y vuelta o revancha tras el resultado. | Medir tiempo por causa, mejorar el ritmo según el evento, explicar la decisión antes de confirmarla y acortar el recorrido entre partidas. El objetivo de #22 se cruza con #23 y #30. |
| **31–44** | Ya hay campañas, tres capítulos por crónica y guardianes con fases. | Las propuestas introducen objetivos y mapas que alteran decisiones. Empezar con un solo encuentro. Los objetivos de campaña actuales siguen girando alrededor de derrotar al rival, al guardián o al Nexo. |
| **45–51, 55, 58** | La IA ya puntúa Formación y simula ciertos empujes. Duna ya tiene una heurística de Ofrenda con reserva de 12 de Vida. Hay tutorial, glosario y curva de coste del mazo. | Definir posiciones donde esa IA se equivoca, usar el objetivo alternativo al decidir, crear ejercicios evaluables y vincular diagnóstico de mazo con fuentes y casos jugables. |
| **52–54, 56–57, 59–62, 68–69, 71–72** | Hay Laboratorio, códigos de mazo, Aventuras y Torre. El deshacer de un movimiento en batalla no equivale a ramificar el Laboratorio. | Quedan por desarrollar los flujos completos propuestos. Torre con cambio de mazo y campaña con consecuencias entre capítulos merecen un prototipo propio. |
| **63–67, 70** | Torre ya tiene rutas, resumen, guardado, recompensas, reliquias y decisiones de riesgo, incluso pagar Vida para reclamar una reliquia. Hay reto diario. | Añadir comparabilidad pública por semilla, alcance nuevo de campamento, reliquias de posicionamiento y objetivos semanales con una posición reproducible. Separar #66, que compara expediciones, de #70, que compara soluciones a un reto. |
| **73–75, 77–78** | Ya existe repetición de la última jugada, gráfica de Vida, mejor golpe, registro de acciones, pruebas de interacciones y una matriz de balance que cruza los 19 mazos en ambos asientos. | Guardar repeticiones completas, saltar a un estado exacto y abrirlo en Laboratorio. La matriz ya existe y el #77 debe centrarse en métricas nuevas, reproducibilidad de resultados y contraste humano. |
| **79–84** | PvP privado ya tiene reconexión con ventana de un minuto, petición de estado al anfitrión, validación de acciones por el motor y revancha bilateral. | Probar fallos en mitad de una resolución, verificar idempotencia, ordenar estados y reforzar la autoridad. Series privadas, torneos y observación dependen de esas garantías. |
| **85–93, 96–97, 99–100** | Hay glosario, auditoría de marcos, teclado, indicadores de reserva, diálogos tácticos, mezcla de audio, variantes gráficas, caché, guardado versionado de partida, filtros de facción y propiedad, etiquetas de cartas nuevas y doradas y pruebas de guardado al abrir sobres. | Acotar a los casos que faltan. Por ejemplo, paso del puntero a la ayuda, escala de texto, detalle de fuente por foco, estado de caché tras una actualización, copia de recuperación y celebración de colección completa. |
| **27, 94–95, 98** | Hay control de ritmo y calidad gráfica, además de persistencia local. | Quedan el formato rápido de reglas, ajuste gráfico por medición sostenida, presupuesto de memoria verificado y exportación e importación integral del progreso. |

La clasificación señala solapamientos, no certifica cada caso de uso por separado. En los puntos de interfaz, distinguir un estado calculado en el motor de un dato visible al tomar una decisión.

## Qué verificamos en esta revisión

- Nueve pruebas de navegador correctas. Se comprobaron marcos y placas a 1920, 1366 y 390 px, una batalla de aventura con cambio de fase y las variantes de Torre con reliquias y guardado.
- Banco de equilibrio ejecutado en 4.104 escaramuzas automáticas, con los 19 mazos iniciales, 12 semillas por enfrentamiento y ambos órdenes de salida. Hubo 28 partidas sin desenlace dentro del límite. La mediana fue de 43 turnos.
- Entre las partidas decididas de cada mazo, Samsara ganó 391 de 431 (91 %), Bestiario 341 de 431 (79 %) y Kalevala 340 de 431 (79 %). En el otro extremo, Tercios ganó 61 de 430 (14 %) y Goblins 8 de 410 (2 %).
- Son resultados de la misma IA a ambos lados. Ayudan a localizar enfrentamientos y estrategias que necesitan revisión. Todavía no separan fuerza del mazo, habilidad de la IA con esa mecánica y nivel del jugador humano. Tampoco cuantifican diversión o deseo de revancha.

## Valoración por apartados

| Apartado | Nota | Lectura |
| --- | ---: | --- |
| Identidad visual y ambientación | 8,5 | Arte, suelos y escenarios reconocibles. El tablero 3D con fichas que siguen siendo cartas da una personalidad clara. |
| Identidad mecánica de facciones | 8 | Jade disputa un favor, Duna arriesga Vida, Marea cambia de plan con el turno y Tercios cuida el apoyo. La fuerza de esa identidad varía y parte queda escondida en reglas de carta. |
| Profundidad táctica | 8 | Alcance, rutas, Guardia, formación, empuje y orden de acciones dan valor a la posición. Falta variedad de objetivos que obligue a usar esas herramientas de forma distinta. |
| Legibilidad durante la decisión | 6,5 | Buenas señales de cartas listas, coste y vida. Falta ver el estado de poderes de facción a tiempo. En 1366, cabecera, mano y tablero compiten por espacio y se recortan nombres largos. |
| Ritmo de combate | 6,5 | Hay controles de ritmo y escenas de alto impacto. Cinemático es el perfil por defecto y ciertas cartas ocupan hasta cinco segundos antes de resolución, aparte de pausas de IA. Falta medir minutos por causa y por perfil. |
| IA | 6 | Ejecuta acciones legales, puntúa varios rasgos de facción y simula algunos reposicionamientos. El contraste entre mazos aconseja medir si sabe convertir una preparación en una secuencia ganadora. |
| Equilibrio | 5,5 provisional | La simulación actual da una señal fuerte de desigualdad entre mazos iniciales en manos de la IA. Hace falta separar fuerza del mazo, calidad de la IA y rendimiento humano. |
| Aprendizaje | 6,5 | Tutorial, glosario y Laboratorio dan herramientas. Faltan ejercicios que enseñen por qué un movimiento, un sacrificio o el orden de los ataques importan. |
| Aventuras y Torre | 7,5 | Mucho recorrido y buena base de progresión. La campaña cambia oponentes y fases, pero la mayoría de las victorias se deciden de manera parecida. |
| Rejugabilidad | 7,5 | Gran variedad de mazos y modalidades. La siguiente partida ganará valor cuando pueda empezar con otro problema táctico, además de otro rival o escenario. |
| Colección y recompensas | 8 | Apertura temática, descubrimientos y doradas ofrecen una celebración propia. Mantener el interés del combate como principal motivo para volver. |
| Multijugador | 6 provisional | Buena base para duelos privados. El anfitrión distribuye el estado completo al invitado. Antes de competición se requiere autoridad verificable, separación de información privada y pruebas de cortes en ambos lados. |
| Rendimiento y estabilidad | 7 provisional | Pruebas de navegador y auditorías visuales aportan evidencia funcional. Faltan mediciones de fluidez y memoria en equipos distintos y en una sesión larga. |

**Nota global de diseño: 7,3/10.** Juicio ponderado a favor del núcleo de batalla, la identidad de facciones, el ritmo y la claridad. Las notas de balance, PvP y rendimiento tienen menor confianza porque faltan sesiones humanas y mediciones específicas.

## Diagnóstico

El rasgo más valioso es que una carta es también una pieza en el tablero. Un empuje, una Guardia o una unidad de apoyo pueden valer más que una cifra de Ataque alta. El juego gana cuando hace esa relación fácil de leer y cuando un objetivo exige usarla.

La carga mental viene de dos sitios. Uno productivo es decidir si vale la pena pagar Vida con Duna o arriesgar una Formación. Otro es tener que recordar quién tiene el Mandato o reconstruir qué pasó mientras se resolvían varios efectos. Los puntos 1–6 atacan esa segunda carga. La franja debe mostrar el estado real, con previsión ampliada al consultar la carta y sin crear una segunda fila de adornos sobre el tablero.

El ritmo se beneficia de separar acontecimientos. Un cambio de Mandato, la fase de un jefe o un golpe final merecen espacio. Una fuente repetida o una cadena de daño menor se puede presentar con más brevedad. Una partida histórica de 111 minutos en 21 turnos motiva la medición, pero no permite atribuir ese tiempo a una causa ni estimar una duración típica. Probar Cinemático y Normal con el mismo caso ayudará a decidir qué abreviar.

Un objetivo alternativo puede cambiar qué cartas importan. Defender un paso en Fimbul permite probar si una unidad que resiste, bloquea o mueve al rival cambia de valor respecto a la escaramuza. Las grietas deben anunciarse antes del movimiento y tiene que existir una ruta estable. Si la decisión se reduce a obedecer un camino único, el mapa añade trámite.

El mayor golpe de la pantalla final puede ser memorable aunque la jugada que ganó la partida fuera retirar una Guardia o sacrificar la pieza adecuada un turno antes. El resultado sería más útil si permitiera localizar y volver a probar ese estado. Se apoya en el Laboratorio y en una repetición de estado, de modo que conviene resolver #73 antes de #74.

## Orden recomendado

1. **Lectura de poderes.** Franja de ambos bandos, Jade, Quinto Sol, Olimpo, Marea y Runo. Probar ambos lados a 1920 × 1080 y 1366 × 768.
2. **Ritmo medido.** Separar segundos de decisión, cálculo, presentación y carga. Comparar perfiles actuales y optimizar las esperas comprobadas.
3. **Una misión emblemática.** Fimbul con paso que defender, hielo anunciado y dos rutas. Jugar con dos estilos de mazo y pedir a los jugadores que expliquen qué habrían hecho distinto.
4. **Equilibrio y aprendizaje.** Repetir los enfrentamientos extremos con humanos y con IA mejorada, fijar posiciones reproducibles y usar las que enseñen una buena decisión en la Academia.
5. **Repeticiones y PvP.** Completar el registro reproducible y las garantías de sincronización antes de ampliar competición.
