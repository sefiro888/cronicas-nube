import type { FactionId } from '../game'

/**
 * Frases de los comandantes, con la voz de su facción. Textos originales del
 * proyecto. El retrato «habla» con un bocadillo en tres momentos: al usar su
 * poder, al recibir un golpe fuerte en su Nexo y al ganar. Hay varias por
 * momento y se eligen por el id del evento, así que no se repite siempre la
 * misma y la elección es estable (el mismo golpe dice siempre lo mismo).
 */
export type QuoteMoment = 'power' | 'hurt' | 'win'

type Quotes = Readonly<Record<QuoteMoment, readonly string[]>>

export const FACTION_QUOTES: Readonly<Record<FactionId, Quotes>> = {
  fury: {
    power: ['¡Que arda todo lo que se mueva!', 'La caldera ha despertado.'],
    hurt: ['¿Eso es todo? Me has hecho cosquillas.', 'Cada golpe aviva el fuego.'],
    win: ['Cenizas. Solo quedan cenizas.', 'El fuego nunca pierde.'],
  },
  arcane: {
    power: ['Silencio. Ahora hablan las runas.', 'La séptima runa lo ha previsto.'],
    hurt: ['Una grieta en el cálculo... la corregiré.', 'Interesante. Doloroso, pero interesante.'],
    win: ['Todo ocurrió como estaba escrito.', 'La ecuación está resuelta.'],
  },
  nature: {
    power: ['Las raíces responden a mi llamada.', 'Crece. Crece y no te detengas.'],
    hurt: ['El bosque sangra, pero no cae.', 'Rompe una rama y brotarán diez.'],
    win: ['La tierra reclama lo que es suyo.', 'Volverás a ser abono.'],
  },
  order: {
    power: ['¡Por la Luz Eterna!', 'Que la égida nos cubra a todos.'],
    hurt: ['Mi fe no se resquebraja tan fácil.', 'La luz se tambalea... pero no se apaga.'],
    win: ['El orden ha sido restaurado.', 'La Luz no conoce derrota.'],
  },
  shadow: {
    power: ['Paga tu diezmo a la oscuridad.', 'Las sombras tienen hambre.'],
    hurt: ['El dolor me recuerda que sigo aquí.', 'Me has herido. Lo recordaré.'],
    win: ['Tu nombre ya pertenece a la sombra.', 'Nadie escapa del luto.'],
  },
  void: {
    power: ['Mira el vacío. Te devuelve la mirada.', 'Aquí termina la orilla del mundo.'],
    hurt: ['El vacío no siente... casi.', 'Has abierto una grieta. Error.'],
    win: ['Nada. Eso es lo que queda de ti.', 'El vacío te ha tragado.'],
  },
  duna: {
    power: ['Pongamos tu corazón en la balanza.', 'La arena juzga, y no perdona.'],
    hurt: ['Cada herida inclina la balanza a mi favor.', 'La arena guarda memoria de esto.'],
    win: ['Tu corazón pesaba más que la pluma.', 'El juicio ha concluido.'],
  },
  fimbul: {
    power: ['Yo elijo quién cae hoy.', '¡El invierno de los dioses ha llegado!'],
    hurt: ['¡Así se pelea! ¡Otra vez!', 'Un buen golpe. Lo cantarán en el salón.'],
    win: ['Los caídos te esperan en el salón.', 'El campo ha sido elegido.'],
  },
  samsara: {
    power: ['La rueda gira. Siempre gira.', 'Muere y vuelve. Esa es la ley.'],
    hurt: ['Esta herida ya la sufrí en otra vida.', 'Caer es solo el principio de volver.'],
    win: ['Vuelta completa. Hasta la próxima vida.', 'La rueda te ha aplastado.'],
  },
  jade: {
    power: ['El Cielo concede su favor a quien lo merece.', 'Prueba el melocotón de la inmortalidad.'],
    hurt: ['Una mancha en el jade. Se pulirá.', 'El Mandato no se pierde por un golpe.'],
    win: ['El Mandato Celestial es mío.', 'La corte celebra mi victoria.'],
  },
  olimpo: {
    power: ['Restitución. Todo exceso se paga.', 'Los dioses miden cada acto.'],
    hurt: ['¿Osas tocar a un inmortal?', 'Tu hybris tendrá castigo.'],
    win: ['Así cae quien desafía al Olimpo.', 'La balanza vuelve a estar en paz.'],
  },
  sol: {
    power: ['¡Que caigan las estrellas!', 'El quinto sol exige su ofrenda.'],
    hurt: ['Mi sangre alimenta al sol.', 'Cada herida es un sacrificio más.'],
    win: ['El sol se alza sobre tus restos.', 'Tu corazón será la ofrenda.'],
  },
  bestiario: {
    power: ['¡A cazar, hermanos!', 'Que hable el instinto.'],
    hurt: ['La presa muerde. Mejor.', 'Herida, pero aún de pie.'],
    win: ['La manada ha comido bien.', 'Cazada.'],
  },
  plaga: {
    power: ['El brote está listo. Respira hondo.', 'Toses, ¿verdad? Ya es tarde.'],
    hurt: ['El contagio no se detiene por un golpe.', 'Me has tocado... y ahora tú también lo llevas.'],
    win: ['Paciente cero, paciente final.', 'Todos acaban enfermando.'],
  },
  marea: {
    power: ['La resaca se lo lleva todo.', 'Escucha el mar. Viene a por ti.'],
    hurt: ['La ola rompe y vuelve.', 'El mar no olvida.'],
    win: ['El mar te ha arrastrado al fondo.', 'Marea alta. Fin.'],
  },
  forja: {
    power: ['¡Dad cuerda a las máquinas!', 'El yunque canta. ¡Golpead!'],
    hurt: ['Una abolladura. Se martillea y listo.', '¡Más carbón a la fragua!'],
    win: ['Forjado, templado y terminado.', 'El metal siempre gana.'],
  },
  goblins: {
    power: ['¿Y si... funciona? ¡Ja!', '¡Mecha encendida! ¡Corred!'],
    hurt: ['¡Ay! ¡Eso no estaba en el plan!', 'Perdí otra ceja. Da igual, ¡seguimos!'],
    win: ['¡Lo sabía! ¡Bueno, casi!', '¡Gané! ¿Alguien ha visto mi dedo?'],
  },
  tercios: {
    power: ['¡Cerrad filas! ¡El cuadro no se rompe!', '¡Picas al frente, arcabuces detrás!'],
    hurt: ['¡Firmes! ¡Que nadie retroceda!', 'Herida de guerra. Seguimos en formación.'],
    win: ['El cuadro no se ha roto.', 'Victoria, y en buen orden.'],
  },
  kalevala: {
    power: ['Escucha mi canto... y húndete.', 'El pantano te llama por tu nombre.'],
    hurt: ['Un verso roto. Cantaré otro.', 'El canto no se calla tan fácil.'],
    win: ['El canto ha terminado. Tú también.', 'Duerme bajo el agua.'],
  },
}

/** Elige una frase estable para un evento: el mismo id siempre da la misma. */
export const quoteFor = (faction: FactionId, moment: QuoteMoment, eventId: string): string => {
  const options = FACTION_QUOTES[faction][moment]
  const seed = [...eventId].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return options[seed % options.length]!
}

/** Daño al Nexo a partir del cual el comandante se queja. */
export const HURT_QUOTE_DAMAGE = 3
