import { CARD_BY_ID } from './cards'
import { COMMANDER_BY_ID, STARTER_DECKS } from './decks'
import { createMatch } from './engine'
import { FACTION_BY_ID } from './factions'
import type { AnimationEvent, FactionId, MatchState } from './types'

export type AdventureKind = 'campaign' | 'boss' | 'series'
export type BossId = 'corazon-caldera' | 'centinela-alba' | 'hambre-vacio'
export interface BossDefinition {
  readonly id: BossId
  readonly name: string
  readonly faction: FactionId
  readonly health: number
  readonly secondWind: number
  readonly phaseName: string
  readonly rule: string
}
export const ADVENTURE_BOSSES: readonly BossDefinition[] = [
  {
    id: 'corazon-caldera',
    name: 'El Corazón Despierto',
    faction: 'fury',
    health: 44,
    secondWind: 12,
    phaseName: 'Erupción',
    rule: 'Al bajar a la mitad de Vida, recupera 12. Desde entonces inflige 2 al Nexo rival al comenzar cada turno suyo.',
  },
  {
    id: 'centinela-alba',
    name: 'El Centinela del Alba',
    faction: 'order',
    health: 46,
    secondWind: 14,
    phaseName: 'Bastión eterno',
    rule: 'Al bajar a la mitad de Vida, recupera 14 y protege sus unidades con 3 de escudo. Después renueva 1 de escudo al comenzar cada turno suyo.',
  },
  {
    id: 'hambre-vacio',
    name: 'El Hambre entre Mundos',
    faction: 'void',
    health: 42,
    secondWind: 10,
    phaseName: 'Singularidad',
    rule: 'Al bajar a la mitad de Vida, recupera 10 y añade dos fuentes disponibles. Después drena 1 de Vida al Nexo rival al comenzar cada turno suyo.',
  },
]
export const bossById = (id?: string): BossDefinition | undefined =>
  ADVENTURE_BOSSES.find((boss) => boss.id === id)

const STORIES: Readonly<Record<FactionId, readonly [place: string, threat: string, vow: string]>> =
  {
    fury: [
      'las puertas de la Caldera',
      'una fragua que late bajo la montaña',
      'Que ninguna brasa se apague sin responder',
    ],
    arcane: [
      'el Archivo de la Séptima Runa',
      'un signo borrado de todos los libros',
      'Toda respuesta exige atravesar una pregunta',
    ],
    nature: [
      'las raíces del Árbol Primigenio',
      'una herida que impide brotar al bosque',
      'La vida encontrará un camino',
    ],
    order: [
      'las vidrieras del Bastión del Alba',
      'un juramento quebrado en el corazón de la guardia',
      'Ningún escudo abandona a quien protege',
    ],
    shadow: [
      'las escaleras del Claustro Velado',
      'un nombre que responde desde las tumbas',
      'También las sombras guardan memoria',
    ],
    void: [
      'el Umbral de los Mundos Rotos',
      'una puerta que devora sus propias llaves',
      'Lo imposible también tiene un borde',
    ],
    duna: [
      'el Tribunal bajo las Dunas',
      'un veredicto robado a los muertos',
      'Toda ofrenda será recordada',
    ],
    fimbul: [
      'las piedras del Thing',
      'un invierno que ha olvidado su final',
      'Resistiremos mientras quede alguien que cante',
    ],
    samsara: [
      'los peldaños del Ghat Eterno',
      'una rueda detenida entre dos vidas',
      'Nada termina donde empieza el fuego',
    ],
    jade: [
      'el Palacio del Mandato Celestial',
      'un sello que ya no reconoce a su portador',
      'El mandato se sostiene con actos',
    ],
    olimpo: [
      'los escalones de la Acrópolis',
      'una tormenta nacida del orgullo de los dioses',
      'La gloria exige conocer el límite',
    ],
    sol: [
      'el patio de la Quinta Aurora',
      'un eclipse que no figura en ninguna cuenta',
      'Mientras el Sol recuerde, el mundo continúa',
    ],
    bestiario: [
      'la garganta de las Bestias Antiguas',
      'un cazador que encadena a los guardianes',
      'Ninguna jaula contiene todas las formas de la vida',
    ],
    plaga: [
      'las criptas del Jardín Enfermo',
      'una semilla que ha perdido a su huésped',
      'Toda ruina alimenta algo que aún respira',
    ],
    marea: [
      'los arrecifes de la Corona Hundida',
      'una campana que llama desde un mar sin fondo',
      'La marea devuelve lo que el mundo olvida',
    ],
    forja: [
      'el Gran Yunque de la Fundición',
      'un autómata que trabaja sin creador',
      'Hasta el hierro guarda la huella de una mano',
    ],
    goblins: [
      'los puentes del Desguace Chispeante',
      'una máquina que apuesta contra sus inventores',
      'Si todavía humea, todavía puede funcionar',
    ],
    tercios: [
      'el Baluarte de los Estandartes',
      'un paso cerrado por una fuerza sin bandera',
      'Ninguna fila se rompe mientras resista la siguiente',
    ],
    kalevala: [
      'las orillas del Lago de los Cantores',
      'una palabra arrancada al primer canto',
      'El nombre verdadero vuelve incluso del fondo',
    ],
  }

export interface CampaignChapter {
  readonly index: number
  readonly title: string
  readonly introduction: string
  readonly dialogue: string
  readonly objective: string
  readonly conclusion: string
  readonly opponentDeckId: string
  readonly bossId?: BossId
}

export const campaignChapters = (faction: FactionId): readonly CampaignChapter[] => {
  const own = STARTER_DECKS.findIndex((deck) => deck.faction === faction)
  const [place, threat, vow] = STORIES[faction]
  const boss = ADVENTURE_BOSSES[Math.max(0, own) % ADVENTURE_BOSSES.length]!
  const bossDeck = STARTER_DECKS.find((deck) => deck.faction === boss.faction)!
  const first = STARTER_DECKS[(own + 1) % STARTER_DECKS.length]!
  const second = STARTER_DECKS[(own + 7) % STARTER_DECKS.length]!
  return [
    {
      index: 0,
      title: 'I · La llamada',
      introduction: `Algo ha cambiado en ${place}. Los vigías hablan de ${threat}. Una fuerza de ${FACTION_BY_ID[first.faction].name} ocupa el camino.`,
      dialogue: `«${vow}. Primero recuperaremos el paso.»`,
      objective: 'Derrota al comandante rival para abrir el camino.',
      conclusion: `El paso a ${place} vuelve a estar abierto. Entre los restos aparece la señal de un segundo ejército.`,
      opponentDeckId: first.id,
    },
    {
      index: 1,
      title: 'II · El precio del umbral',
      introduction: `La señal conduce hasta un umbral custodiado por ${FACTION_BY_ID[second.faction].name}. Más allá espera el origen de ${threat}.`,
      dialogue:
        '«Podemos regresar con una respuesta incompleta. O cruzar y terminar lo que empezamos.»',
      objective: 'Derrota al guardián del umbral.',
      conclusion: `El umbral se abre. ${boss.name} responde desde el otro lado y la amenaza deja de ser un rumor.`,
      opponentDeckId: second.id,
    },
    {
      index: 2,
      title: 'III · El eco del Nexo',
      introduction: `${boss.name} concentra la energía que amenaza ${place}. Al herirlo despertará una segunda fase: ${boss.phaseName}.`,
      dialogue: `«${vow}. Esta vez lo escuchará el Nexo.»`,
      objective: 'Supera las dos fases y destruye el Nexo del jefe.',
      conclusion: `La energía vuelve a fluir por ${place}. La crónica de ${FACTION_BY_ID[faction].name} conserva tu victoria y el nombre de quienes cruzaron contigo.`,
      opponentDeckId: bossDeck.id,
      bossId: boss.id,
    },
  ]
}

export interface AdventureBattleSpec {
  readonly playerDeckId: string
  readonly opponentDeckId: string
  readonly seed: number
  readonly bossId?: BossId
}

export const createAdventureMatch = (spec: AdventureBattleSpec): MatchState => {
  const player = STARTER_DECKS.find((deck) => deck.id === spec.playerDeckId)
  const opponent = STARTER_DECKS.find((deck) => deck.id === spec.opponentDeckId)
  if (!player || !opponent) throw new Error('Falta un mazo válido para esta aventura.')
  const boss = bossById(spec.bossId)
  return createMatch(player, opponent, spec.seed, boss ? { aiNexusHealth: boss.health } : {})
}

export interface BossResolution {
  readonly state: MatchState
  readonly phase: 1 | 2
  readonly changed: boolean
}

/** La transición vive junto a las reglas de modalidad, antes de reproducir los eventos. */
export const resolveBossAction = (
  before: MatchState,
  after: MatchState,
  boss: BossDefinition,
  phase: 1 | 2,
): BossResolution => {
  if (before.winner || after.winner === 'ai') return { state: after, phase, changed: false }
  const awaken = phase === 1 && after.players.ai.nexusHealth <= Math.floor(boss.health / 2)
  const nextPhase = awaken ? 2 : phase
  const pulse =
    !awaken &&
    nextPhase === 2 &&
    before.activePlayer !== after.activePlayer &&
    after.activePlayer === 'ai' &&
    !after.winner
  if (!awaken && !pulse) return { state: after, phase, changed: false }
  let state = after
  const drafts: Omit<AnimationEvent, 'id'>[] = []
  if (awaken) {
    state = {
      ...state,
      winner: undefined,
      phase: state.phase === 'finished' ? 'main' : state.phase,
      players: {
        ...state.players,
        ai: {
          ...state.players.ai,
          nexusHealth: Math.min(
            boss.health,
            Math.max(0, state.players.ai.nexusHealth) + boss.secondWind,
          ),
        },
      },
      animations: state.animations.filter((event) => event.type !== 'victory'),
    }
    drafts.push({
      type: 'spell',
      actorId: 'ai',
      targetId: 'ai-nexus',
      amount: boss.secondWind,
      effectId: `boss-awaken-${boss.id}`,
      faction: boss.faction,
      durationMs: 900,
    })
  }
  if (boss.id === 'centinela-alba') {
    const shield = awaken ? 3 : 1
    state = {
      ...state,
      board: state.board.map((piece) =>
        piece.owner === 'ai'
          ? {
              ...piece,
              statuses: [
                ...piece.statuses.filter((status) => status.kind !== 'shielded'),
                {
                  kind: 'shielded' as const,
                  amount: Math.max(
                    shield,
                    ...piece.statuses
                      .filter((status) => status.kind === 'shielded')
                      .map((status) => status.amount),
                  ),
                },
              ],
            }
          : piece,
      ),
    }
    for (const piece of state.board.filter((piece) => piece.owner === 'ai'))
      drafts.push({
        type: 'shield',
        actorId: 'ai',
        targetId: piece.instanceId,
        amount: shield,
        effectId: 'boss-aegis',
        faction: boss.faction,
        durationMs: 400,
      })
  }
  if (boss.id === 'hambre-vacio' && awaken) {
    const mana = Object.values(CARD_BY_ID).find(
      (card) => card.faction === boss.faction && card.type === 'mana',
    )!
    state = {
      ...state,
      players: {
        ...state.players,
        ai: {
          ...state.players.ai,
          resources: [
            ...state.players.ai.resources,
            ...[0, 1].map((index) => ({
              instanceId: `boss-source-${state.nextId}-${index}`,
              cardId: mana.id,
              faction: boss.faction,
              exhausted: false,
            })),
          ],
        },
      },
    }
  }
  if (pulse && boss.id !== 'centinela-alba') {
    const damage = boss.id === 'corazon-caldera' ? 2 : 1
    const health = Math.max(0, state.players.player.nexusHealth - damage)
    state = {
      ...state,
      players: {
        player: { ...state.players.player, nexusHealth: health },
        ai: {
          ...state.players.ai,
          nexusHealth: Math.min(
            boss.health,
            state.players.ai.nexusHealth + (boss.id === 'hambre-vacio' ? 1 : 0),
          ),
        },
      },
      ...(health === 0 ? { winner: 'ai' as const, phase: 'finished' as const } : {}),
    }
    drafts.push({
      type: 'nexus-damage',
      actorId: 'ai',
      targetId: 'player-nexus',
      amount: damage,
      effectId: `boss-pulse-${boss.id}`,
      faction: boss.faction,
      durationMs: 650,
    })
    if (health === 0)
      drafts.push({
        type: 'victory',
        actorId: 'ai',
        targetId: 'player-nexus',
        effectId: `${boss.faction}-victory`,
        durationMs: 900,
      })
  }
  let nextId = state.nextId
  return {
    state: {
      ...state,
      nextId: nextId + drafts.length,
      animations: [
        ...state.animations,
        ...drafts.map((draft) => ({ ...draft, id: `event-${nextId++}` })),
      ],
    },
    phase: nextPhase,
    changed: true,
  }
}

export const adventureCommanderName = (deckId: string): string => {
  const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId)
  return (deck && COMMANDER_BY_ID[deck.commanderId]?.name) ?? 'Rival'
}
