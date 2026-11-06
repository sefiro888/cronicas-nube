export const FACTION_IDS = ['fury', 'arcane', 'nature', 'order', 'shadow', 'void', 'duna', 'fimbul', 'samsara', 'jade', 'olimpo', 'sol', 'bestiario', 'plaga', 'marea', 'forja', 'goblins', 'tercios', 'kalevala'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const CARD_TYPES = [
  'mana',
  'unit',
  'instant',
  'structure',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const RARITIES = ['common', 'uncommon', 'rare', 'mythic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const KEYWORDS = [
  'impulse',
  'swift-strike',
  'guard',
  'flying',
  /** Perforar: el daño que sobra al destruir a la defensora golpea el Nexo enemigo. */
  'pierce',
  /** Vínculo vital: el daño de combate que reparte cura tu Nexo en la misma cantidad. */
  'lifelink',
  /** Aturdir: la unidad golpeada no puede atacar en su próximo turno. */
  'stun',
] as const;
export type Keyword = (typeof KEYWORDS)[number];

export interface FactionDefinition {
  readonly id: FactionId;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly accentColor: string;
  readonly icon: string;
  readonly unlocked: boolean;
  readonly themes: readonly string[];
}

export interface ManaCost {
  readonly generic: number;
  readonly colored: Readonly<Partial<Record<FactionId, number>>>;
}

export interface CardArt {
  readonly webp: string;
  readonly fallback: string;
  readonly alt: string;
}

export interface CardVfx {
  readonly summonEffect?: string;
  readonly attackEffect?: string;
  readonly impactEffect?: string;
  readonly deathEffect?: string;
  readonly persistentEffect?: string;
}

export interface CardSfx {
  readonly play?: string;
  readonly attack?: string;
  readonly impact?: string;
  readonly death?: string;
}

export type CardEffect =
  | { readonly kind: 'spark'; readonly face: 'cara' | 'cruz' }
  | { readonly kind: 'damage'; readonly amount: number; readonly target: 'enemy-piece' | 'any-piece' }
  | { readonly kind: 'sink' }
  | { readonly kind: 'gain-runo'; readonly amount: number }
  | { readonly kind: 'damage-enemy-nexus'; readonly amount: number }
  | { readonly kind: 'sink-low-health'; readonly maximumHealth: number }
  | { readonly kind: 'choose-formation'; readonly count: number }
  | { readonly kind: 'choose-moves'; readonly count: number; readonly distance: number }
  | { readonly kind: 'choose-sinks'; readonly count: number; readonly adjacent: boolean }
  | { readonly kind: 'choose-line'; readonly amount: number; readonly enemiesOnly: boolean; readonly unitsOnly: boolean; readonly rowsOnly: boolean }
  | { readonly kind: 'grant-formation' }
  | { readonly kind: 'formation-march' }
  | { readonly kind: 'boost-discharge'; readonly amount: number }
  | { readonly kind: 'forbid-own-attacks' }
  | { readonly kind: 'formation-protection'; readonly amount: number }
  | { readonly kind: 'rocroi' }
  | { readonly kind: 'mine-structure'; readonly splash: number }
  | { readonly kind: 'silence-unit' }
  | { readonly kind: 'heal-unit'; readonly amount: number; readonly nexusRunoThreshold?: number }
  | { readonly kind: 'grant-petardazo-all' }
  | { readonly kind: 'damage-all-enemies'; readonly amount: number; readonly scorch?: boolean; readonly includeAllies?: boolean }
  | { readonly kind: 'freeze'; readonly duration: number }
  /** Aturde a la unidad señalada: no podrá atacar en su próximo turno, pero sí moverse. */
  | { readonly kind: 'stun' }
  /** Presta una palabra clave a una unidad aliada hasta el final del turno. */
  | { readonly kind: 'grant-keyword'; readonly keyword: Keyword }
  | { readonly kind: 'draw'; readonly amount: number }
  | { readonly kind: 'discard'; readonly amount: number; readonly target?: 'own-hand' | 'enemy-hand' }
  | { readonly kind: 'heal-nexus'; readonly amount: number }
  | {
      readonly kind: 'adjacent-damage';
      readonly amount: number;
      readonly includeAllies: boolean;
      /** Cuándo se dispara: al entrar en juego (por defecto) o al atacar. */
      readonly trigger?: 'entry' | 'attack';
    }
  | { readonly kind: 'buff-self-on-attack'; readonly attack: number }
  | { readonly kind: 'scry'; readonly amount: number }
  | { readonly kind: 'scorch'; readonly duration: number }
  | { readonly kind: 'refresh-move' }
  /** Devuelve el ataque a una unidad aliada que ya hubiera atacado este turno. */
  | { readonly kind: 'refresh-attack' }
  /** Escudo a TODAS las unidades propias, del mismo valor cada una. */
  | { readonly kind: 'shield-all-allies'; readonly amount: number }
  /** Poder de Hildr: +N de Ataque hasta el final del turno a TODAS las unidades propias. */
  | { readonly kind: 'buff-all-allies-attack'; readonly amount: number }
  /** Poder de Hildr: devuelve el ataque a TODAS las unidades propias que ya hubieran atacado. */
  | { readonly kind: 'refresh-attack-all' }
  | { readonly kind: 'splash-weakest-enemy'; readonly amount: number }
  | { readonly kind: 'destroy-all-enemy-structures'; readonly gainEssencePerResistance: boolean }
  /**
   * Duna — Ofrenda N: coste opcional en Vida del propio Nexo. Los efectos que
   * vienen DESPUÉS en la lista solo se resuelven si se ha pagado.
   */
  | { readonly kind: 'offering'; readonly cost: number }
  /**
   * Duna — Juicio: los efectos que vienen después solo se resuelven si tu Nexo
   * tiene menos Vida que el del rival. Es la contrapartida de Ofrenda: cuanto
   * más has pagado, más cerca estás de que el Tribunal falle a tu favor.
   */
  | { readonly kind: 'judgement' }
  /** Rama alternativa: se resuelve cuando la condición anterior NO se cumplió. */
  | { readonly kind: 'otherwise' }
  /** Marca de fin de las ramas condicionales: lo que sigue se resuelve siempre. */
  | { readonly kind: 'always' }
  /** Resta Movimiento a todas las unidades enemigas hasta que termine su turno. */
  | { readonly kind: 'slow-all-enemies'; readonly amount: number }
  /** Destruye la unidad enemiga con más Ataque. */
  | { readonly kind: 'destroy-strongest-enemy' }
  /** Danzante de la Destrucción: destruye TODAS las unidades (de los dos bandos) con poca Vida. */
  | { readonly kind: 'destroy-low-health-all'; readonly threshold: number }
  /** Ofrenda de Fuego: más daño si ya ha muerto una unidad propia este turno (Samsara). */
  | { readonly kind: 'conditional-damage-all-enemies'; readonly baseAmount: number; readonly deathAmount: number }
  /** Karma: devuelve a la mano todas las unidades propias destruidas este turno, con bono. */
  | { readonly kind: 'return-fallen-allies'; readonly bonus: number }
  /** Poder de Indrayani: devuelve del cementerio toda unidad con Renacer que aún no lo gastó. */
  | { readonly kind: 'return-graveyard-renacer' }
  /** Jade — abre una rama que solo cuenta si el jugador tiene el Mandato Celestial. */
  | { readonly kind: 'mandate' }
  /**
   * Jade: reclama el Mandato Celestial para quien juega o despliega la carta.
   * Mandato Revocado: si se lo arrebata al rival, además roba `bonusDrawIfRivalHeld`.
   */
  | { readonly kind: 'claim-mandate'; readonly bonusDrawIfRivalHeld?: number }
  /** Hybris (Olimpo): +N/+N permanentes a TODAS las unidades propias a la vez. */
  | { readonly kind: 'buff-all-allies-permanent'; readonly amount: number }
  /** Poder de Némesis: pone la Hybris propia a cero y cura al Nexo lo que borró. */
  | { readonly kind: 'reset-hybris-and-heal' }
  /**
   * Quinto Sol — Sacrificio: coste adicional OBLIGATORIO de destruir una
   * unidad propia para poder jugar esta carta. Si no tienes ninguna, no se
   * puede jugar — a diferencia de la Ofrenda de Duna, que es opcional.
   */
  | { readonly kind: 'sacrifice' }
  /**
   * Inflige a cada unidad enemiga daño igual a la Cuenta del Sol propia
   * (poder de Itzpapálotl, sin tope) o hasta el tope que diga `cap` (Cuenta
   * de los Días).
   */
  | { readonly kind: 'damage-all-enemies-by-sun-count'; readonly cap?: number }
  /**
   * Marea — el ciclo: abre una rama que solo cuenta si estamos en esa fase.
   * Pleamar en los turnos pares, bajamar en los impares. Mismo patrón de rama
   * que la Ofrenda de Duna o el Mandato de Jade.
   */
  | { readonly kind: 'tide'; readonly phase: 'high' | 'low' }
  /**
   * Marea — mueve la unidad señalada `amount` casillas: hacia atrás por
   * defecto, o hacia quien lanza con `toward: 'pusher'` (el Canto de la
   * Sirena, que atrae en vez de rechazar).
   */
  | { readonly kind: 'push-target'; readonly amount: number; readonly toward?: 'away' | 'pusher' }
  /**
   * Marea — empuja a TODAS las unidades enemigas. `toward` decide si retroceden
   * ('away') o si las arrastra hacia quien lanza ('pusher', la Vorágine).
   * Con `stunIfBlocked`, las que no tienen hueco donde ir quedan aturdidas: es
   * lo que convierte un tablero saturado en una trampa en vez de en un efecto
   * desperdiciado.
   */
  | {
      readonly kind: 'push-all-enemies';
      readonly amount: number;
      readonly toward: 'away' | 'pusher';
      readonly stunIfBlocked?: boolean;
    }
  /**
   * Forja — abre una rama que solo cuenta si controlas al menos `count`
   * estructuras (una por defecto). Mismo patrón que el Juicio de Duna.
   */
  | { readonly kind: 'has-structure'; readonly count?: number }
  /** Forja — da cuerda: +N de Ataque (y opcionalmente Vida) permanente a tus autómatas. */
  | { readonly kind: 'buff-automata'; readonly attack: number; readonly health?: number }
  /** Forja — el Plano Maestro: tus estructuras recuperan toda su Resistencia. */
  | { readonly kind: 'restore-structures' }
  | { readonly kind: 'passive'; readonly id: string; readonly value?: number };

/** Jade — los cinco elementos: cada uno genera al siguiente en el ciclo fijo. */
export const ELEMENTS = ['madera', 'fuego', 'tierra', 'metal', 'agua'] as const;
export type Element = (typeof ELEMENTS)[number];

export interface CardDefinition {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionId;
  readonly color: string;
  readonly type: CardType;
  readonly subtype?: string;
  readonly rarity: Rarity;
  readonly cost: ManaCost;
  readonly rules: string;
  readonly flavor: string;
  /** Jade — Generación: qué elemento lleva esta carta, si es que lleva alguno. */
  readonly element?: Element;
  readonly attack?: number;
  readonly health?: number;
  readonly resistance?: number;
  readonly range?: number;
  readonly movement?: number;
  readonly keywords: readonly Keyword[];
  readonly set: string;
  readonly collectorNumber: number;
  readonly artist: string;
  readonly aiTags: readonly string[];
  readonly art: CardArt;
  readonly vfx: CardVfx;
  readonly sfx: CardSfx;
  readonly unlocked: boolean;
  readonly unique: boolean;
  readonly effects: readonly CardEffect[];
}

/**
 * Poder de comandante: una jugada grande que se paga con Esencia y se usa UNA
 * vez por partida. Las pasivas de comandante siempre han sido automáticas, así
 * que no daban ninguna decisión; esto añade un momento de «¿ahora o luego?»
 * sin necesidad de cartas nuevas.
 */
export interface CommanderPower {
  readonly name: string;
  readonly description: string;
  readonly cost: ManaCost;
  /** Necesita señalar una unidad enemiga (p. ej. congelarla). */
  readonly needsEnemyTarget?: boolean;
  readonly effects: readonly CardEffect[];
  readonly effectId: string;
}

export interface CommanderDefinition {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly faction: FactionId;
  readonly nexusHealth: number;
  readonly rules: string;
  readonly flavor: string;
  readonly art: CardArt;
  readonly vfx: CardVfx;
  readonly power: CommanderPower;
}

export interface DeckEntry {
  readonly cardId: string;
  readonly count: number;
}

export interface DeckDefinition {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionId;
  readonly commanderId: string;
  readonly cards: readonly DeckEntry[];
}

export type PlayerId = 'player' | 'ai';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface ResourceState {
  readonly temporary?: boolean;
  readonly instanceId: string;
  readonly cardId: string;
  readonly faction: FactionId;
  readonly exhausted: boolean;
}

export interface CardInstance {
  readonly instanceId: string;
  readonly cardId: string;
  /**
   * Samsara — Renacer/Karma: bonos permanentes que trae de vuelta una unidad
   * que ha muerto y regresado a la mano, para aplicarlos cuando se despliegue
   * de nuevo (una copia de mazo normal nunca los lleva).
   */
  readonly bonusAttack?: number;
  readonly bonusHealth?: number;
  /** Samsara — Renacer: ya se gastó su única revivificación, no puede volver a activarse. */
  readonly renacerSpent?: boolean;
  /** Samsara — Pira del Ghat: coste genérico reducido para su próximo despliegue. */
  readonly costDiscount?: number;
}

export type PieceStatus =
  | { readonly kind: 'silenced'; readonly expiresOnTurn: number }
  | { readonly kind: 'anchored'; readonly expiresOnTurn: number }
  | { readonly kind: 'frozen'; readonly expiresOnTurn: number }
  | { readonly kind: 'shielded'; readonly amount: number }
  /** Maldición Sombra: pierde 1 Vida al final de cada turno hasta que muere. */
  | { readonly kind: 'cursed'; readonly amount: number }
  /**
   * Aturdir: no puede atacar, pero sí moverse — a diferencia de Congelado, que
   * bloquea ambas cosas. Se mide con el contador de turno compartido, igual que
   * Congelado: aturdir en el turno N pone `expiresOnTurn` en N+2, de modo que
   * cubre exactamente el siguiente turno de su dueño.
   */
  | { readonly kind: 'stunned'; readonly expiresOnTurn: number }
  /**
   * Plaga — Contagio: pierde 1 de Vida al final de CADA turno (de cualquiera
   * de los dos jugadores, no solo su dueño). Si muere estando así, se
   * convierte en un Zombi Contagiado bajo `infectorId` en vez de irse al
   * cementerio de su dueño original.
   */
  | { readonly kind: 'infected'; readonly infectorId: PlayerId };

/**
 * Marca temporal que deja un efecto sobre una casilla (hoy solo el fuego).
 * Caduca sola en el turno indicado.
 */
export interface TileEffect {
  readonly kind: 'scorched';
  readonly position: Position;
  readonly sourceOwner: PlayerId;
  readonly expiresOnTurn: number;
}

/**
 * Terreno del campo de batalla: parte del mapa, no un efecto pasajero.
 *
 * Hasta ahora las 64 casillas eran idénticas y la posición solo importaba por
 * las distancias. Con terreno, el tablero tiene sitios que valen más que otros:
 * hay que rodear, disputar y elegir dónde plantarse.
 *
 * - `rubble` (ruinas): nadie puede entrar ni desplegar ahí, y corta la línea de
 *   los ataques a distancia. Son los muros del mapa.
 * - `cover` (cobertura): quien esté encima recibe 1 de daño menos de los
 *   ataques a distancia. Premia adelantar y quedarse.
 */
export type TerrainKind = 'rubble' | 'cover';

export interface TerrainTile {
  readonly kind: TerrainKind;
  readonly position: Position;
}

export interface BoardPiece {
  readonly sparkFace?: 'cara' | 'cruz';
  readonly instanceId: string;
  readonly cardId: string;
  readonly owner: PlayerId;
  readonly position: Position;
  readonly currentHealth: number;
  readonly attackModifier: number;
  /** Casillas de Movimiento restadas hasta que su dueño termine su turno (p. ej. Horror Abisal). */
  readonly movementModifier?: number;
  readonly movedThisTurn: boolean;
  readonly attackedThisTurn: boolean;
  readonly enteredOnTurn: number;
  /** Turno en el que la pieza ya consumió su reducción de primer daño (pasiva del Gólem Azur). */
  readonly reductionUsedOnTurn?: number;
  /** Pégaso Celestial: si ya curó en su primer ataque (solo ocurre una vez por pieza). */
  readonly firstAttackHealUsed?: boolean;
  /**
   * Palabras clave prestadas hasta que su dueño termine el turno (Salto de
   * Umbral). Van aparte de las de la carta porque son temporales: la
   * definición de la carta es inmutable y compartida por todas sus copias.
   */
  readonly grantedKeywords?: readonly Keyword[];
  /**
   * Parte de `attackModifier` que NO caduca al terminar el turno (Necrópolis).
   * Va aparte porque el modificador normal se pone a cero cada turno, y sin
   * esta marca un +1 «permanente» duraría exactamente un turno.
   */
  readonly permanentAttackBonus?: number;
  /** Samsara — Renacer: si esta unidad ya gastó su única revivificación. */
  readonly renacerSpent?: boolean;
  /** Olimpo — Metamorfosis: si esta unidad ya se transformó (Pegaso de Corinto, una vez). */
  readonly metamorphosed?: boolean;
  /** Petardazo prestado; el temporal caduca al finalizar el turno del dueño. */
  readonly grantedPetardazo?: 'turn' | 'permanent';
  readonly grantedFormation?: boolean;
  /** Vida temporal de Formación ya incorporada a currentHealth. */
  readonly formationHealthApplied?: number;
  readonly grantedDischarge?: boolean;
  readonly formationMarch?: boolean;
  readonly permanentHealthPenalty?: number;
  readonly permanentHealthBonus?: number;
  readonly statuses: readonly PieceStatus[];
}

export interface PlayerStats {
  readonly cardsPlayed: number;
  readonly damageDealt: number;
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly commanderId: string;
  readonly nexusHealth: number;
  readonly deck: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly discard: readonly CardInstance[];
  readonly resources: readonly ResourceState[];
  readonly resourcePlayedThisTurn: boolean;
  readonly spellsCastThisTurn: number;
  readonly towerLootUsedThisTurn: boolean;
  readonly forgeBuffUsedThisTurn: boolean;
  /** Marca de la pasiva de Kaela: el Nexo ya recibió su primer daño este turno. */
  readonly nexusDamagedThisTurn: boolean;
  /** Pasiva de Kaela armada: la siguiente unidad cuesta 1 genérico menos. */
  readonly unitDiscountPending: boolean;
  /** Pasiva de Nyxaris y de Zeph: la primera unidad del turno ya entró en juego. */
  readonly firstUnitDeployedThisTurn: boolean;
  /** Pasiva de Borrán: la primera unidad destruida este turno ya curó al Nexo. */
  readonly commanderKillHealUsedThisTurn?: boolean;
  /** Pasiva de Síalu: ya se robó por el primer congelar/aturdir del turno. */
  readonly commanderControlDrawUsedThisTurn?: boolean;
  /** Pasiva de Orén: cuántas veces ha drenado ya este turno (tope de 2). */
  readonly commanderDrainCountThisTurn?: number;
  /** Duna: cuántas Ofrendas se han pagado ya este turno (Khaeris y la Mesa miran esto). */
  readonly offeringsPaidThisTurn?: number;
  /** Fimbul: si alguna unidad propia ganó un Desafío este turno (lo mira el Skald). */
  readonly challengedThisTurn?: boolean;
  /** Fimbul: si alguna unidad propia murió este turno (lo mira el Salón de los Caídos). */
  readonly unitDiedThisTurn?: boolean;
  /** Samsara: cuántas unidades propias han muerto este turno (Asceta de la Ceniza, Avatar). */
  readonly unitsDiedThisTurn?: number;
  /** Samsara — Karma: ids de las cartas propias destruidas este turno, para devolverlas a la mano. */
  readonly unitsDiedThisTurnLog?: readonly string[];
  /** Pasiva de Indrayani: ya se robó por la primera muerte propia de este turno. */
  readonly firstUnitDeathDrawUsedThisTurn?: boolean;
  /** Pasiva de Xiwangmu: ya se aplicó el descuento a la primera carta de este turno. */
  readonly firstCardDiscountUsedThisTurn?: boolean;
  /** Olimpo — Hybris: contador de desmesura por jugador. NO se reinicia con el turno. */
  readonly hybris?: number;
  /** Quinto Sol — la Cuenta del Sol: sube con cada Sacrificio. NO se reinicia con el turno. */
  readonly sunCount?: number;
  /** Kalevala — acumulado de Runo; no se gasta ni se reinicia al cambiar de turno. */
  readonly runo?: number;
  /** La primera Chispa del turno de Bromuro ya consumió su doble tirada. */
  readonly sparkRolledThisTurn?: boolean;
  readonly dischargeDamageBonusThisTurn?: number;
  readonly attacksForbiddenThisTurn?: boolean;
  readonly formationInvulnerableTurn?: number;
  readonly rocroiEndDamage?: number;
  /** Quinto Sol: cuántas unidades propias se han sacrificado este turno (Señora de la Falda de Jade, Templo Mayor). */
  readonly sacrificesThisTurn?: number;
  /** Pasiva de Itzpapálotl: ya se aplicó el daño al Nexo enemigo por el primer Sacrificio de este turno. */
  readonly firstSacrificeDamageUsedThisTurn?: boolean;
  /** Pasiva de Kessra: ya se robó por la primera infección de este turno. */
  readonly firstInfectionDrawUsedThisTurn?: boolean;
  /** Plaga — Monumento a la Plaga: si una Infectada enemiga suya murió así este turno. */
  readonly infectedEnemyDiedThisTurn?: boolean;
  readonly mulliganTaken: boolean;
  /** El poder del comandante solo se puede usar una vez por partida. */
  readonly commanderPowerUsed: boolean;
  readonly stats: PlayerStats;
}

export type TurnPhase = 'start' | 'draw' | 'main' | 'combat' | 'end' | 'finished';

export type AnimationEventType =
  | 'draw'
  | 'resource'
  | 'mana-flow'
  | 'summon'
  | 'spell'
  | 'move'
  | 'attack'
  | 'damage'
  | 'shield'
  | 'destroy'
  | 'freeze'
  | 'reveal'
  | 'nexus-damage'
  | 'turn'
  | 'victory';

export interface AnimationEvent {
  readonly id: string;
  readonly type: AnimationEventType;
  readonly actorId?: string;
  readonly targetId?: string;
  readonly from?: Position;
  readonly to?: Position;
  readonly amount?: number;
  readonly effectId?: string;
  /** Carta asociada: origen del ataque/hechizo, o víctima al destruirse. */
  readonly cardId?: string;
  /** Conserva el material de la víctima aunque ya no esté en el tablero. */
  readonly targetCardId?: string;
  /** Vida al abrir el duelo, antes de reproducir sus impactos. */
  readonly openingHealth?: { readonly attacker: number; readonly defender: number };
  readonly renacerBonus?: number;
  readonly retaliation?: true;
  readonly attackAbility?: 'desafio';
  readonly spellPayment?: { readonly offering: number; readonly judged: boolean };
  readonly sparkFace?: 'cara' | 'cruz';
  readonly spellTide?: 'high' | 'low';
  /** Vida de la pieza inmediatamente antes y después del impacto. */
  readonly pieceHealth?: { readonly before: number; readonly after: number };
  /**
   * La presentación no debe adivinar la facción por palabras inglesas del
   * effectId: los impactos genéricos se comparten entre cartas muy distintas.
   */
  readonly faction?: FactionId;
  /**
   * Marca el evento que abre la jugada de una carta o poder que merece
   * presentarse en grande. La interfaz no puede deducirlo: hay muchos 'spell'
   * secundarios (escrutinio, Canto, botín) que no son una carta lanzada.
   */
  readonly cast?: { readonly kind: 'spell' | 'structure' | 'power'; readonly sourceId: string };
  readonly durationMs: number;
}

export interface MatchState {
  readonly pendingDecisions?: readonly BoardDecision[];
  readonly pendingSpark?: { readonly owner: PlayerId; readonly cardInstanceId: string; readonly position?: Position; readonly offering: boolean; readonly faces: readonly ('cara' | 'cruz')[] };
  readonly seed: number;
  /** Estado aleatorio de Chispa; la semilla original sigue identificando la partida. */
  readonly sparkRandomState?: number;
  readonly combatRandomState?: number;
  readonly nextId: number;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  readonly board: readonly BoardPiece[];
  readonly tileEffects: readonly TileEffect[];
  /** Terreno fijo de la partida: se reparte al crearla y no cambia. */
  readonly terrain: readonly TerrainTile[];
  readonly animations: readonly AnimationEvent[];
  readonly winner?: PlayerId;
  readonly startedAtTurn: number;
  /** Jade — el Mandato Celestial: un único favor que está en poder de un jugador, o de ninguno. */
  readonly mandate?: PlayerId;
  /** Canto: piezas retiradas sin morir, pendientes del final del turno indicado. */
  readonly sunkenUnits?: readonly SunkenUnit[];
}

export interface SunkenUnit {
  readonly permanentHealthPenalty?: number;
  readonly instanceId: string;
  readonly cardId: string;
  readonly owner: PlayerId;
  readonly origin: Position;
  readonly returnTurn: number;
  readonly cantoDelayApplied?: boolean;
  readonly renacerSpent?: boolean;
  readonly metamorphosed?: boolean;
  readonly firstAttackHealUsed?: boolean;
}

export type SpellTarget =
  | { readonly kind: 'piece'; readonly pieceId: string }
  | { readonly kind: 'nexus'; readonly playerId: PlayerId }
  | { readonly kind: 'none' };

export type GameAction =
  | { readonly type: 'resolve-choice'; readonly playerId: PlayerId; readonly decisionId: string; readonly pieceId?: string; readonly to?: Position; readonly axis?: 'row' | 'column'; readonly index?: number; readonly skip?: boolean }
  | { readonly type: 'choose-spark'; readonly playerId: PlayerId; readonly face: 'cara' | 'cruz'; readonly target?: SpellTarget }
  | { readonly type: 'draw'; readonly playerId?: PlayerId }
  | { readonly type: 'play-resource'; readonly playerId: PlayerId; readonly cardInstanceId: string }
  | {
      readonly type: 'play-card';
      readonly playerId: PlayerId;
      readonly cardInstanceId: string;
      readonly position?: Position;
      readonly target?: SpellTarget;
      /**
       * Duna — Ofrenda: pagar Vida del propio Nexo para obtener el efecto
       * mejorado de la carta. Es una decisión del jugador, así que viaja en la
       * acción y no en la definición de la carta.
       */
      readonly offering?: boolean;
    }
  | { readonly type: 'move'; readonly playerId: PlayerId; readonly pieceId: string; readonly to: Position }
  | {
      readonly type: 'attack-piece';
      readonly playerId: PlayerId;
      readonly attackerId: string;
      readonly defenderId: string;
    }
  | { readonly type: 'attack-nexus'; readonly playerId: PlayerId; readonly attackerId: string }
  | {
      readonly type: 'commander-power';
      readonly playerId: PlayerId;
      /** Unidad señalada, si el poder la pide. */
      readonly target?: SpellTarget;
    }
  | { readonly type: 'end-turn'; readonly playerId: PlayerId };

export interface ActionResult {
  readonly ok: boolean;
  readonly state: MatchState;
  readonly error?: GameError;
}

export interface BoardDecision {
  readonly id: string;
  readonly owner: PlayerId;
  readonly sourceCardId: string;
  readonly kind: 'formation' | 'move' | 'sink' | 'line';
  readonly remaining: number;
  readonly chosenIds: readonly string[];
  readonly optional: boolean;
  readonly distance?: number;
  readonly anchor?: Position;
  readonly adjacent?: boolean;
  readonly amount?: number;
  readonly enemiesOnly?: boolean;
  readonly unitsOnly?: boolean;
  readonly rowsOnly?: boolean;
}

export type GameErrorCode =
  | 'game-finished'
  | 'wrong-turn'
  | 'wrong-phase'
  | 'card-not-found'
  | 'invalid-card-type'
  | 'resource-already-played'
  | 'insufficient-mana'
  | 'position-required'
  | 'target-required'
  | 'out-of-bounds'
  | 'occupied'
  | 'piece-not-found'
  | 'not-owner'
  | 'cannot-move'
  | 'cannot-attack'
  | 'out-of-range'
  | 'blocked-line';

export interface GameError {
  readonly code: GameErrorCode;
  readonly message: string;
}

export interface DeckValidationIssue {
  readonly code:
    | 'wrong-size'
    | 'wrong-mana-count'
    | 'unknown-card'
    | 'wrong-faction'
    | 'too-many-copies'
    | 'too-many-unique'
    | 'unknown-commander'
    | 'wrong-commander-faction';
  readonly message: string;
  readonly cardId?: string;
}

export interface DeckValidationResult {
  readonly valid: boolean;
  readonly issues: readonly DeckValidationIssue[];
  readonly totalCards: number;
  readonly manaCards: number;
  readonly nonManaCards: number;
}

export interface PaymentPlan {
  readonly payable: boolean;
  readonly resourceIds: readonly string[];
  readonly missingGeneric: number;
  readonly missingColored: Readonly<Partial<Record<FactionId, number>>>;
}
