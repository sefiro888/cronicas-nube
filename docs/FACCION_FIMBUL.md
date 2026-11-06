# Facción nueva · FIMBUL — «El invierno que no termina»

Dosier completo de la facción nórdica: mitología escandinava, duelos y el fin
anunciado. Identidad, mecánica propia, comandante y **31 cartas** con su prompt
de arte.

---

## 1. Por qué esta facción y en qué se diferencia

Lo nórdico tiene dos trampas evidentes y las dos se esquivan a propósito:

- **No es Furia con nieve.** Furia agrede a lo que tenga más cerca y cuanto
  antes mejor. Fimbul **elige a quién ataca, y elige al más grande**: golpear
  a lo débil no le sirve de nada. Furia quiere ganar rápido; Fimbul quiere
  ganar bien.
- **No es Orden con hachas.** Orden aguanta detrás de un muro sin recibir.
  Fimbul **cobra por recibir**: sus criaturas pegan más cuanto peor están, así
  que un intercambio a medias es exactamente lo que buscaba.

Ninguna facción del juego premia hoy estar malherido ni buscar el combate
difícil. Ese es el hueco: la única a la que le conviene que la partida sea una
carnicería pareja.

### Identidad visual

| Uso | Color |
| --- | --- |
| Base (hierro pavonado, madera quemada) | `#5a5f66` |
| Luz (nieve, aliento en el frío) | `#dfe9f2`, `#ffffff` |
| Sombra (noche polar, fiordo profundo) | `#0d141c` |
| Acento (oro rúnico, sangre en la nieve) | `#d8a944`, `#a8262a` |

**Materiales**: hierro forjado a martillo, madera de roble tallada, cuero
crudo, lana basta, ámbar, oro trenzado, hueso. **Formas**: nudos entrelazados,
proas de dragón, escudos redondos, runas grabadas, tejados de turba, hachas de
mango largo. **Tono**: crudo y frío, con muy poco color y todo el peso en la
textura. Nada de cascos con cuernos ni de bárbaros gritando: esta es gente que
sabe navegar, comerciar y hacer leyes, y que además pelea.

---

## 2. Las mecánicas propias

### Desafío

> **Desafío** — Cuando esta unidad ataca a una unidad enemiga con **Ataque
> igual o mayor que el suyo**, obtiene el efecto que diga la carta.

Es la mecánica insignia y va contra el instinto de todo el mundo: en el resto
del juego, lo correcto es atacar a lo que puedes matar sin perder nada. Aquí,
elegir el intercambio cómodo es renunciar a la mitad de tu mazo.

Cambia también cómo juega el rival. Una criatura enorme deja de ser una
amenaza y pasa a ser un cebo: mientras esté en la mesa, media facción de Fimbul
está encendida.

### Furor

> **Furor** — Mientras a esta unidad le falte la mitad o más de su Vida, tiene
> el segundo bloque de reglas.

La contrapartida: no premia el riesgo que buscas, premia el daño que ya has
comido. Sus criaturas grandes empiezan siendo cuerpos correctos y se convierten
en un problema en cuanto alguien las abolla.

Juntas hacen que un tablero de Fimbul empeore para el rival cuanto más avanza
el combate, que es justo lo contrario de lo que pasa con las demás facciones.

> Nota técnica: Desafío se comprueba en la resolución del ataque, donde ya se
> conocen atacante y defensor y ya se miran palabras clave como Perforar.
> Furor es una condición sobre la Vida actual de la pieza, del mismo tipo que
> las que ya consultan estados. Ninguna de las dos necesita estado nuevo.

---

## 3. El comandante

### `hildr-la-que-elige`

- **Nombre**: Hildr · **Título**: La que Elige a los Caídos
- **Facción**: Fimbul · **Vida del Nexo**: 35
- **Pasiva**: La primera vez cada turno que una unidad tuya ataca a otra con
  más Ataque que ella, robas 1 carta.
- **Poder (una vez por partida, 2 genérico + 1 escarcha)**: «Elección del
  Campo» — todas tus unidades ganan +2 de Ataque hasta el final del turno y
  pueden volver a atacar.
- **Sabor**: «No decide quién gana. Decide a quién se lleva.»
- **Prompt de retrato**: *Retrato en tres cuartos de una guerrera de rasgos
  duros y serenos, cota de malla sobre lana gris, capa de piel de lobo al
  hombro y un yelmo sencillo de hierro con protector nasal, sin cuernos.
  Sostiene una lanza apoyada en el suelo. Trenzas y cicatriz fina en la ceja.
  Fondo: campo nevado al anochecer con cuervos y la aurora boreal al fondo.
  Grave, nada teatral. Paleta Fimbul.*

---

## 4. Las 31 cartas

Cada ficha trae: **id** (nombre de archivo), datos de juego y el prompt de arte.
La columna «motor» avisa de si la carta usa mecánica que el juego ya sabe
resolver o si hay que programar algo.

---

### 4.1 Fuente

#### `fuente-fimbul`
- **Tipo**: Esencia — Fuente · **Rareza**: Común · **Coste**: 0
- **Reglas**: Agota esta fuente: genera 1 de Esencia de Escarcha.
- **Sabor**: «Tres inviernos seguidos y ningún verano en medio. Así empieza.»
- **Motor**: ya soportado
- **Prompt**: *Un hogar de piedra apagado en el centro de una casa comunal de
  madera, con la escarcha entrando por las juntas del tejado de turba y un
  cuenco de hierro helado. Luz azulada de mediodía polar. Sin figuras. Paleta
  Fimbul.*

---

### 4.2 Unidades (15)

#### `escudero-del-thing`
- **Tipo**: Unidad — Soldado · **Rareza**: Común · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 2/4 · **Alcance** 1 · **Movimiento** 1
- **Reglas**: Guardia.
- **Sabor**: «En la asamblea sujeta el escudo del que habla. Fuera también.»
- **Motor**: ya soportado (`guard`)
- **Prompt**: *Un joven guerrero con escudo redondo pintado de rojo y blanco y
  una lanza corta, de pie en un círculo de piedras hincadas donde se reúne la
  asamblea. Ropa de lana, gesto atento. Paleta Fimbul.*

#### `doncella-escudo`
- **Tipo**: Unidad — Soldado · **Rareza**: Común · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 3/2 · **Alcance** 1 · **Movimiento** 2
- **Reglas**: Impulso.
- **Sabor**: «Se ganó el sitio en la primera fila y no piensa devolverlo.»
- **Motor**: ya soportado (`impulse`)
- **Prompt**: *Una guerrera con cota de malla corta y escudo redondo, avanzando
  a paso rápido sobre nieve pisada con el hacha baja. Trenza recogida, aliento
  visible en el frío. Paleta Fimbul.*

#### `cuervo-de-la-horca`
- **Tipo**: Unidad — Ave · **Rareza**: Común · **Coste**: 0 gen + 1 escarcha
- **ATQ/VID**: 1/2 · **Alcance** 1 · **Movimiento** 3
- **Reglas**: Volador. Al entrar en juego, escruta 1.
- **Sabor**: «Uno se llama Pensamiento y el otro Memoria. Este no dice cuál es.»
- **Motor**: ya soportado (`flying` + `scry`)
- **Prompt**: *Un cuervo grande y lustroso posado en la rama pelada de un
  fresno, con la cabeza girada mirando fijamente al espectador, sobre un cielo
  gris plomo. Muy poco color, todo textura de pluma. Paleta Fimbul.*

#### `berserker-de-piel-de-oso`
- **Tipo**: Unidad — Guerrero · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 3/4 · **Alcance** 1 · **Movimiento** 2
- **Reglas**: Furor: gana +3 de Ataque.
- **Sabor**: «Entró en la batalla tranquilo. Eso fue hace un rato.»
- **Motor**: nueva (Furor)
- **Prompt**: *Un guerrero corpulento cubierto con una piel de oso completa,
  cabeza del animal como capucha, torso desnudo bajo la nieve, con los ojos
  desorbitados y un hacha en cada mano. Vapor saliendo de la piel. Paleta
  Fimbul.*

#### `skald-de-las-sagas`
- **Tipo**: Unidad — Humanoide · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 1/4 · **Alcance** 2 · **Movimiento** 1
- **Reglas**: Al final de tu turno, si alguna unidad tuya atacó a otra con más Ataque, robas 1 carta.
- **Sabor**: «No canta lo que pasó. Canta lo que va a merecer la pena contar.»
- **Motor**: nueva (Desafío)
- **Prompt**: *Un poeta de barba entrecana con una capa raída, de pie junto al
  fuego largo de una casa comunal, con un brazo levantado recitando ante gente
  sentada en los bancos laterales. Luz de fuego, humo bajo el techo. Paleta
  Fimbul.*

#### `arquera-de-hielo`
- **Tipo**: Unidad — Soldado · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 2/3 · **Alcance** 3 · **Movimiento** 1
- **Reglas**: Ninguna.
- **Sabor**: «Espera a que el reno se pare. Siempre se para.»
- **Motor**: ya soportado
- **Prompt**: *Una cazadora con esquís cortos de madera y ropa de piel de reno,
  tensando un arco entre abedules nevados con la respiración contenida. Luz
  plana de día nublado. Paleta Fimbul.*

#### `huscarle-del-rey`
- **Tipo**: Unidad — Soldado · **Rareza**: Infrecuente · **Coste**: 1 gen + 2 escarcha
- **ATQ/VID**: 4/4 · **Alcance** 1 · **Movimiento** 1
- **Reglas**: Desafío: gana un escudo de 2.
- **Sabor**: «Cobra por defenderlo. Se quedaría igual sin cobrar.»
- **Motor**: nueva (Desafío)
- **Prompt**: *Un guerrero veterano con cota de malla larga, yelmo con
  protector nasal y un hacha danesa de mango largo apoyada en el hombro, de pie
  ante una puerta de madera tallada. Cansado y sólido. Paleta Fimbul.*

#### `jinete-del-drakkar`
- **Tipo**: Unidad — Soldado · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **ATQ/VID**: 3/3 · **Alcance** 1 · **Movimiento** 3
- **Reglas**: Golpe veloz.
- **Sabor**: «Del barco a la orilla sin mojarse el cinturón.»
- **Motor**: ya soportado (`swift-strike`)
- **Prompt**: *Un guerrero saltando desde la borda de un barco largo a una
  playa de guijarros, con el escudo en alto y el agua salpicando, con la proa
  tallada de dragón sobre él. Amanecer gris. Paleta Fimbul.*

#### `draugr-del-tumulo`
- **Tipo**: Unidad — No muerto · **Rareza**: Rara · **Coste**: 1 gen + 2 escarcha
- **ATQ/VID**: 4/5 · **Alcance** 1 · **Movimiento** 1
- **Reglas**: No puede ser aturdido. Furor: gana Perforar.
- **Sabor**: «Se quedó a cuidar el oro. Nadie le ha dicho que ya puede parar.»
- **Motor**: nueva (Furor)
- **Prompt**: *Un guerrero muerto de piel azulada y ennegrecida, con la cota de
  malla oxidada pegada al cuerpo y los ojos brillando, saliendo de una cámara
  de piedra bajo un túmulo cubierto de hierba helada. Sin putrefacción
  explícita. Paleta Fimbul.*

#### `jarl-de-la-costa`
- **Tipo**: Unidad — Soldado · **Rareza**: Rara · **Coste**: 2 gen + 1 escarcha
- **ATQ/VID**: 4/4 · **Alcance** 1 · **Movimiento** 2
- **Reglas**: Tus otras unidades tienen Desafío: ganan +1 de Ataque en ese combate.
- **Sabor**: «Reparte el botín delante de todos. Por eso le siguen.»
- **Motor**: nueva (Desafío)
- **Prompt**: *Un jefe de barba trenzada con anillos de oro en los brazos y una
  capa forrada de piel, de pie sobre la proa de un barco varado, señalando
  hacia tierra. Hombres armados escuchando abajo. Paleta Fimbul.*

#### `herrero-de-los-enanos`
- **Tipo**: Unidad — Humanoide · **Rareza**: Rara · **Coste**: 1 gen + 2 escarcha
- **ATQ/VID**: 2/6 · **Alcance** 1 · **Movimiento** 1
- **Reglas**: Al final de tu turno, una unidad aliada herida gana +1 de Ataque y +1 de Vida permanentes.
- **Sabor**: «Le pidieron tres regalos imposibles y entregó cuatro.»
- **Motor**: ya soportado (mismo patrón que la Necrópolis de Duna)
- **Prompt**: *Un herrero bajo y ancho de barba larguísima trabajando en una
  fragua excavada en la roca, con chispas saltando del yunque y objetos de oro
  a medio terminar colgados de la pared. Luz naranja contra piedra oscura.
  Paleta Fimbul.*

#### `lobo-de-fenrir`
- **Tipo**: Unidad — Bestia · **Rareza**: Rara · **Coste**: 2 gen + 1 escarcha
- **ATQ/VID**: 5/3 · **Alcance** 1 · **Movimiento** 3
- **Reglas**: Impulso. Desafío: destruye a la defensora si sobrevive al combate.
- **Sabor**: «Hijo del que va a romper la cadena. Practica.»
- **Motor**: nueva (Desafío)
- **Prompt**: *Un lobo enorme de pelaje gris ceniza corriendo por la nieve con
  el aliento humeando y restos de una cadena rota colgando del cuello. Vista
  baja, movimiento. Paleta Fimbul.*

#### `gigante-de-la-escarcha`
- **Tipo**: Unidad — Gigante · **Rareza**: Mítica · **Coste**: 3 gen + 2 escarcha
- **ATQ/VID**: 7/7 · **Alcance** 1 · **Movimiento** 1
- **Reglas**: Perforar. Furor: al final de tu turno, inflige 2 de daño a todas las unidades enemigas.
- **Sabor**: «Vino del norte del norte, donde ya no hay nombres para los sitios.»
- **Motor**: nueva (Furor)
- **Prompt**: *Un gigante de piel azul grisácea y barba cubierta de carámbanos,
  de cuatro metros, avanzando por un paso de montaña con una maza de piedra al
  hombro. Ventisca, visibilidad corta. Vista desde abajo. Paleta Fimbul.*

#### `valquiria-de-la-eleccion`
- **Tipo**: Unidad — Celestial · **Rareza**: Rara · **Coste**: 2 gen + 1 escarcha
- **ATQ/VID**: 4/4 · **Alcance** 1 · **Movimiento** 3
- **Reglas**: Volador. Desafío: cura 3 a tu Nexo.
- **Sabor**: «Baja al final, cuando ya está claro quién ha merecido qué.»
- **Motor**: nueva (Desafío)
- **Prompt**: *Una jinete alada con cota de malla y lanza, descendiendo sobre
  un campo nevado al anochecer montando un caballo gris de crin larga, con la
  aurora boreal detrás. Ni erótica ni operística: guerrera y funcional. Paleta
  Fimbul.*

#### `serpiente-del-mundo`
- **Tipo**: Unidad — Dragón · **Rareza**: Mítica · **Coste**: 4 gen + 2 escarcha
- **ATQ/VID**: 8/6 · **Alcance** 2 · **Movimiento** 1
- **Reglas**: Al entrar en juego, inflige 3 de daño a todas las demás unidades, aliadas y enemigas.
- **Sabor**: «Rodea el mundo y se muerde la cola. El día que suelte, se acaba.»
- **Motor**: ya soportado (barrido que incluye aliados)
- **Prompt**: *Una serpiente marina colosal emergiendo del mar en tempestad,
  con el cuerpo saliendo y volviendo a entrar en el agua en varios puntos del
  horizonte a la vez. Escamas verdinegras, olas enormes. Paleta Fimbul.*

---

### 4.3 Hechizos (9)

#### `holmgang`
- **Tipo**: Hechizo inmediato — Duelo · **Rareza**: Común · **Coste**: 0 gen + 1 escarcha
- **Reglas**: Una unidad aliada gana +3 de Ataque hasta el final del turno y puede volver a atacar.
- **Sabor**: «Una isla, dos hombres y tres escudos. Vuelve uno.»
- **Motor**: ya soportado (bono temporal + refrescar ataque)
- **Prompt**: *Dos guerreros enfrentados dentro de un cuadrado marcado con
  estacas y cuerda sobre una playa de piedras, con testigos alrededor en
  silencio. Vistos de lejos, en el momento previo. Paleta Fimbul.*

#### `martillo-que-vuelve`
- **Tipo**: Hechizo inmediato — Conjuro · **Rareza**: Común · **Coste**: 1 gen + 1 escarcha
- **Reglas**: Inflige 4 de daño a una unidad enemiga.
- **Sabor**: «Se lanza y regresa. Lo difícil fue lo primero.»
- **Motor**: ya soportado (`damage`)
- **Prompt**: *Un martillo de guerra de cabeza corta y mango muy breve girando
  en el aire con un rastro de chispas eléctricas y nieve arremolinada, contra
  un cielo de tormenta. Sin figuras. Paleta Fimbul.*

#### `runa-de-la-victoria`
- **Tipo**: Hechizo inmediato — Encantamiento · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **Reglas**: Una unidad aliada gana +2 de Ataque y +2 de Vida permanentes.
- **Sabor**: «Se graba en la hoja y se nombra dos veces. Ni una más.»
- **Motor**: ya soportado (bono permanente)
- **Prompt**: *Una hoja de espada apoyada en un yunque con runas recién
  grabadas brillando en oro fundido dentro del surco, y una mano con guante
  sujetando el buril. Primer plano, luz de fragua. Paleta Fimbul.*

#### `hidromiel-de-la-poesia`
- **Tipo**: Hechizo inmediato — Ritual · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **Reglas**: Robas 2 cartas y curas 2 a tu Nexo.
- **Sabor**: «Un trago da versos. Dos, verdades. Tres, problemas.»
- **Motor**: ya soportado (`draw` + `heal-nexus`)
- **Prompt**: *Un cuerno de beber de gran tamaño con guarnición de plata
  labrada, lleno hasta el borde, sostenido en alto en una sala en penumbra con
  el fuego largo detrás. Vapor sobre el líquido. Paleta Fimbul.*

#### `invierno-de-fimbul`
- **Tipo**: Hechizo inmediato — Cataclismo · **Rareza**: Rara · **Coste**: 2 gen + 1 escarcha
- **Reglas**: Inflige 2 de daño a todas las unidades enemigas y les resta 1 de Movimiento este turno.
- **Sabor**: «El tercer invierno seguido. Ya nadie cuenta los días.»
- **Motor**: ya soportado (`damage-all-enemies` + ralentización)
- **Prompt**: *Un valle entero sepultado en nieve con una casa comunal casi
  cubierta y solo el humo saliendo del tejado, bajo una ventisca cerrada.
  Blanco sobre blanco, sin horizonte. Paleta Fimbul.*

#### `lanza-que-no-falla`
- **Tipo**: Hechizo inmediato — Conjuro · **Rareza**: Rara · **Coste**: 1 gen + 2 escarcha
- **Reglas**: Destruye la unidad enemiga con más Ataque.
- **Sabor**: «Se arroja sobre el ejército enemigo antes de empezar. Ya están todos muertos.»
- **Motor**: ya soportado (destruir a la más fuerte, como la Balanza de Maat)
- **Prompt**: *Una lanza de fresno con la punta rúnica volando en trayectoria
  tensa sobre un campo de batalla brumoso, vista desde atrás en el momento de
  soltarla. Sin figuras nítidas. Paleta Fimbul.*

#### `juramento-del-anillo`
- **Tipo**: Hechizo inmediato — Ritual · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha
- **Reglas**: Todas tus unidades ganan un escudo de 2.
- **Sabor**: «Se jura con la mano en el anillo del templo. Romperlo cuesta más que morir.»
- **Motor**: ya soportado (escudo masivo)
- **Prompt**: *Un grupo de manos callosas apoyadas todas a la vez sobre un
  grueso anillo de plata colocado en un altar de piedra. Primer plano cenital,
  sin caras. Paleta Fimbul.*

#### `niebla-de-niflheim`
- **Tipo**: Hechizo inmediato — Encantamiento · **Rareza**: Común · **Coste**: 1 gen + 1 escarcha
- **Reglas**: Congela una unidad enemiga 2 turnos.
- **Sabor**: «Entras andando y sales sin saber cuánto has andado.»
- **Motor**: ya soportado (`freeze`)
- **Prompt**: *Un bosque de abetos tragado por una niebla helada tan densa que
  los árboles del segundo plano ya no existen, con escarcha en cada rama.
  Silencio absoluto. Sin figuras. Paleta Fimbul.*

#### `ocaso-de-los-dioses`
- **Tipo**: Hechizo inmediato — Cataclismo · **Rareza**: Mítica · **Coste**: 2 gen + 2 escarcha
- **Reglas**: Inflige 5 de daño a todas las unidades, incluidas las tuyas. Tus unidades que sobrevivan ganan +2 de Ataque permanentes.
- **Sabor**: «Estaba escrito desde el principio. Nadie ha hecho nada por evitarlo.»
- **Motor**: nueva (barrido con premio a los supervivientes)
- **Prompt**: *Un cielo partido en dos por el fuego mientras el mar se traga
  una costa, con siluetas colosales enfrentándose en el horizonte y ceniza
  cayendo como nieve. Épico y terminal. Paleta Fimbul.*

---

### 4.4 Estructuras (6)

#### `muro-de-escudos`
- **Tipo**: Estructura — Fortaleza · **Rareza**: Rara · **Coste**: 2 gen + 1 escarcha · **Resistencia**: 8
- **Reglas**: Guardia.
- **Sabor**: «No es una pared. Son cuarenta personas de acuerdo en algo.»
- **Motor**: ya soportado (`guard`)
- **Prompt**: *Una formación cerrada de escudos redondos solapados vista de
  frente, con las lanzas asomando entre ellos y los rostros en sombra bajo los
  yelmos. Pintura descascarillada en la madera. Paleta Fimbul.*

#### `salon-de-los-caidos`
- **Tipo**: Estructura — Salón · **Rareza**: Mítica · **Coste**: 2 gen + 2 escarcha · **Resistencia**: 7
- **Reglas**: Al final de tu turno, si alguna unidad tuya murió este turno, robas 1 carta y curas 2 a tu Nexo.
- **Sabor**: «Quinientas cuarenta puertas. Salen ochocientos por cada una.»
- **Motor**: nueva (condición de muerte propia)
- **Prompt**: *Un salón inmenso de vigas de madera con el techo cubierto de
  escudos dorados solapados como tejas, mesas larguísimas llenas de gente
  comiendo y un fuego enorme en el centro. Cálido y ruidoso. Paleta Fimbul.*

#### `fresno-del-mundo`
- **Tipo**: Estructura — Árbol · **Rareza**: Rara · **Coste**: 1 gen + 2 escarcha · **Resistencia**: 6
- **Reglas**: Al final de tu turno, cura 2 a tu Nexo.
- **Sabor**: «Tres raíces en tres mundos. Y un ciervo comiéndose las hojas.»
- **Motor**: ya soportado (mantenimiento de curación)
- **Prompt**: *Un fresno colosal cuyas ramas se pierden en las nubes y cuyas
  raíces bajan hasta salir del encuadre, con niebla entre los troncos y un
  ciervo diminuto en una rama. Escala imposible. Paleta Fimbul.*

#### `piedra-runica`
- **Tipo**: Estructura — Piedra · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha · **Resistencia**: 5
- **Reglas**: Tus unidades a distancia infligen 1 de daño adicional.
- **Sabor**: «La levantó una madre por un hijo que no volvió. Sigue de pie.»
- **Motor**: ya soportado (`ranged-attack-bonus`)
- **Prompt**: *Una piedra rúnica erguida en un prado helado, con la serpiente
  de runas recorriendo el borde en pintura roja gastada y una cruz entrelazada
  en el centro. Luz baja de invierno. Paleta Fimbul.*

#### `fragua-de-los-enanos`
- **Tipo**: Estructura — Fragua · **Rareza**: Infrecuente · **Coste**: 1 gen + 1 escarcha · **Resistencia**: 4
- **Reglas**: Al final de tu turno, una unidad aliada gana un escudo de 2.
- **Sabor**: «Trabajan a oscuras. Dicen que así se ve mejor el metal.»
- **Motor**: ya soportado (mantenimiento de escudo)
- **Prompt**: *Una fragua bajo tierra con varios yunques encendidos a distintas
  distancias en una galería de roca, chispas suspendidas y herramientas
  colgadas en todas las paredes. Naranja contra negro. Paleta Fimbul.*

#### `barco-funerario`
- **Tipo**: Estructura — Barco · **Rareza**: Común · **Coste**: 1 gen + 1 escarcha · **Resistencia**: 5
- **Reglas**: Al final de tu turno, si tienes 3 o menos cartas en la mano, robas 1.
- **Sabor**: «Se carga con todo lo que hará falta al otro lado. Se calcula generoso.»
- **Motor**: ya soportado (mismo patrón que la Biblioteca Sumergida)
- **Prompt**: *Un barco largo varado en la orilla y rodeado de un círculo de
  piedras hincadas, cargado de armas, telas y vasijas, al atardecer con el
  fiordo al fondo. Sin fuego todavía. Paleta Fimbul.*

---

## 5. Cómo se juega esta facción

Fimbul busca la pelea difícil. Sus criaturas no quieren comerse a la más
pequeña del tablero: quieren ir a por la grande, porque es entonces cuando el
huscarle se escuda, la valquiria cura, el lobo remata y Hildr roba. Y cuando el
intercambio le sale a medias y le dejan las piezas malheridas, es cuando el
berserker y el gigante empiezan a rendir de verdad.

Es la facción que mejor lleva **una partida larga y sucia**, y la que peor
lleva que no la dejen pelear.

Sus dos debilidades, deliberadas:

1. **Un tablero pequeño la apaga.** Si el rival juega criaturas modestas y
   evita el combate, Desafío no se activa casi nunca y media facción son
   cuerpos correctos sin nada más.
2. **Necesita que la hieran.** Furor exige haber comido daño, y contra
   removales limpios —Arcano, Duna— sus criaturas mueren enteras sin llegar a
   encenderse.

Mazo inicial sugerido (50 cartas): 20 Fuente de Fimbul, 3 Escudero del Thing,
3 Doncella Escudo, 2 Cuervo de la Horca, 2 Berserker de Piel de Oso,
2 Arquera de Hielo, 2 Húscarle del Rey, 1 Skald de las Sagas,
1 Jinete del Drakkar, 1 Draugr del Túmulo, 1 Jarl de la Costa,
1 Herrero de los Enanos, 1 Lobo de Fenrir, 1 Valquiria de la Elección,
1 Gigante de la Escarcha, 1 Serpiente del Mundo, 2 Holmgang,
2 Martillo que Vuelve, 1 Runa de la Victoria, 1 Invierno de Fimbul,
1 Lanza que no Falla, 1 Ocaso de los Dioses, 1 Muro de Escudos,
1 Salón de los Caídos, 1 Piedra Rúnica, 1 Fresno del Mundo.

---

## 6. Checklist de entrega

Nombres de archivo exactos para `tools/art-inbox/` (sin tildes ni ñ):

```
fuente-fimbul               escudero-del-thing         doncella-escudo
cuervo-de-la-horca          berserker-de-piel-de-oso   skald-de-las-sagas
arquera-de-hielo            huscarle-del-rey           jinete-del-drakkar
draugr-del-tumulo           jarl-de-la-costa           herrero-de-los-enanos
lobo-de-fenrir              gigante-de-la-escarcha     valquiria-de-la-eleccion
serpiente-del-mundo         holmgang                   martillo-que-vuelve
runa-de-la-victoria         hidromiel-de-la-poesia     invierno-de-fimbul
lanza-que-no-falla          juramento-del-anillo       niebla-de-niflheim
ocaso-de-los-dioses         muro-de-escudos            salon-de-los-caidos
fresno-del-mundo            piedra-runica              fragua-de-los-enanos
barco-funerario             hildr-la-que-elige
```

Aviso de estilo para toda la facción: **crudo, no bárbaro**. Nada de cascos con
cuernos —no existieron—, nada de musculación aceitada, nada de rojo saturado.
Esta gente navega, comercia, redacta leyes y talla madera con una paciencia
enorme; lo que llevan puesto está bien hecho y muy usado. La paleta es casi
monocroma: hierro, lana, nieve y madera, con el color reservado al oro de un
brazalete y a la pintura descascarillada de un escudo. La referencia es el
hallazgo arqueológico real —Oseberg, Gokstad, las piedras de Gotland— antes que
cualquier película.
