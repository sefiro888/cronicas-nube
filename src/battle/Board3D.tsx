import { factionForScenario } from './scenarioForFaction'
import { isFactionStage } from './scenarios/factionStages'
import { cardFrameFor } from '../presentation/cardFrames'
import { useCardFaceTexture } from './useCardFaceTexture'
import { Html, OrbitControls, Sparkles, useCursor, useTexture } from '@react-three/drei'
import { Canvas, type ThreeElements, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AdditiveBlending, DoubleSide, MathUtils, PerspectiveCamera as ThreePerspectiveCamera, Plane, Raycaster, SRGBColorSpace, Vector2, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, Texture } from 'three'
import { BOARD_CELL_COUNT, BOARD_SIZE, CARD_BY_ID, COMMANDER_BY_ID } from '../game'
import type { AnimationEvent, BoardPiece, FactionId, MatchState, PlayerId, Position } from '../game'
import { runoAttackBonus } from '../game/kalevala'
import { formationAttackBonus } from '../game/tercios'
import type { MovementHazard } from '../game/movementHazard'
import { MovementHazardMarker } from './grid/MovementHazardMarker'
import type { GraphicsQuality, ScenarioId } from '../store/preferences'
import { withBase } from '../utils/assets'
import { GameIcon } from '../components/GameIcon'
import { boardSlabGeometry } from './grid/boardSlabGeometry'
import { BoardRim } from './grid/BoardRim'
import { stoneMaps } from './materials/stoneMaterial'
import { forgedMetalMaps } from './materials/forgedMetal'
import { DamageNumbers } from './DamageNumbers'
import { ImpactMarks } from './ImpactMarks'
import { Epitaphs } from './Epitaphs'
import type { CastImpact } from './castImpact'
import { FallenPieces } from './FallenPieces'
import { RecentHits } from './RecentHits'
import { EventEffects } from './EventEffects'
import {
  BOARD_WORLD_HALF,
  CAMERA_FOV,
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  CAMERA_POSITION,
  CAMERA_TARGET,
  BOARD_WORLD_SIZE,
  CELL_SIZE,
  gridToWorldX,
  gridToWorldZ,
  nexusWorldZ,
  TILE_SIZE,
  worldToGrid,
} from './grid/gridCoordinates'
import { combatPose, impulsesForEvent, type Impulse } from './combatImpulse'
import { BOARD_TILE_VARIANTS, boardTileNormal, boardTileRoughness, boardTileTexture, contactShadowTexture, glowTexture, masonryTexture, type BoardTileStyle } from './textures'
import styles from './Board3D.module.css'
import { BoardDrift } from './BoardDrift'
import { TerrainMarks } from './terrain/TerrainMarks'
import { CardFrameTrim, CardPlinth, CardSurfaceWear, CardWard } from './CardFinish'
import { RitualSeal } from './RitualSeal'
import { NexusFractures } from './NexusFractures'
import { NexusCrown } from './NexusCrown'
import { BattleSkies } from './BattleSkies'
import type { PreviewVerdict } from './ui/battleHints'
import { ThreatArrows, type ThreatFocus } from './ThreatOverlay'
import { TraitFlourishes, type TraitFx } from './TraitFlourish'
import { FactionFrame } from './FactionFrame'
import { LavaRiver } from './LavaRiver'
import { MaterialEnvironment } from './MaterialEnvironment'
import { arrivalMotion } from './arrivalMotion'
import { FACTION_BY_ID } from '../game/factions'
import { NexusRupture } from './NexusRupture'
import { useVisualTimers } from './useVisualTimers'
import { battleStrain, BattleClimateProvider } from './scenarios/BattleClimate'
import { ScenarioAtmosphere } from './scenarios/ScenarioAtmosphere'
import { NexusFocus } from './NexusFocus'

const FactionStage = lazy(() => import('./scenarios/FactionStage'))
const AetherCitadel = lazy(() =>
  import('./scenarios/AetherCitadel').then((m) => ({ default: m.AetherCitadel })),
)
const SanctuaryScenario = lazy(() =>
  import('./scenarios/SanctuaryScenario').then((m) => ({ default: m.SanctuaryScenario })),
)
const CalderaScenario = lazy(() =>
  import('./scenarios/CalderaScenario').then((m) => ({ default: m.CalderaScenario })),
)
const DunaNecropolis = lazy(() =>
  import('./scenarios/DunaNecropolis').then((m) => ({ default: m.DunaNecropolis })),
)
const FimbulFjord = lazy(() =>
  import('./scenarios/FimbulFjord').then((m) => ({ default: m.FimbulFjord })),
)
const WheelGhat = lazy(() =>
  import('./scenarios/WheelGhat').then((m) => ({ default: m.WheelGhat })),
)
const JadeCourt = lazy(() =>
  import('./scenarios/JadeCourt').then((m) => ({ default: m.JadeCourt })),
)
const ForgeYard = lazy(() =>
  import('./scenarios/ForgeYard').then((m) => ({ default: m.ForgeYard })),
)
const TidalShore = lazy(() =>
  import('./scenarios/TidalShore').then((m) => ({ default: m.TidalShore })),
)
const VerdantGrove = lazy(() =>
  import('./scenarios/VerdantGrove').then((m) => ({ default: m.VerdantGrove })),
)
const SolarCourt = lazy(() =>
  import('./scenarios/SolarCourt').then((m) => ({ default: m.SolarCourt })),
)
const BestiaryRavine = lazy(() =>
  import('./scenarios/BestiaryRavine').then((m) => ({ default: m.BestiaryRavine })),
)

interface Board3DProps {
  state: MatchState
  /** Bando de la partida que controla este navegador: decide qué Nexo queda cerca de la cámara. */
  localPlayerId: PlayerId
  selectedPieceId?: string
  validCells: readonly Position[]
  movementHazards?: ReadonlyMap<string, MovementHazard>
  /**
   * Qué significan las casillas iluminadas ahora mismo. Antes «mover aquí» y
   * «desplegar aquí» compartían el mismo azul, aunque son acciones distintas
   * y llegan desde sitios distintos (una unidad del tablero o una carta de la
   * mano).
   */
  cellIntent: 'move' | 'deploy'
  /** Cambia el verde de despliegue por ámbar: no choca con el rojo de amenaza para daltonismo rojo-verde. */
  colorblindMode?: boolean
  /** Escala del texto sobre las cartas del tablero (nombre, ATQ/VID, estados). */
  boardTextScale?: number
  validTargets: readonly string[]
  /** Unidades propias con acciones disponibles: reciben el anillo de listas. */
  readyPieceIds: ReadonlySet<string>
  onCell: (position: Position) => void
  onPiece: (pieceId: string) => void
  onNexus: (playerId: PlayerId) => void
  /** Doble clic en una ficha del tablero: abre su ilustración completa, igual que en la mano. */
  onInspectPiece?: (cardId: string, pieceId?: string) => void
  /** Casilla bajo el puntero, para saber dónde se suelta una carta arrastrada. */
  onCellHover?: (position?: Position) => void
  /** Ficha/Nexo bajo el cursor: alimenta la vista previa de daño. */
  onHoverPiece?: (pieceId?: string) => void
  onHoverNexus?: (playerId?: PlayerId) => void
  /** Objetivo (ficha o Nexo) sobre el que mostrar la vista previa, con sus líneas de texto ya redactadas. */
  attackPreview?: { readonly targetId: string; readonly attackerId?: string; readonly lines: readonly string[]; readonly target?: readonly PreviewVerdict[]; readonly attacker?: readonly PreviewVerdict[] }
  /** Hay una carta en la mano siendo arrastrada: la cámara no debe orbitar. */
  dragging?: boolean
  /** Modo foto: cámara libre para admirar el tablero, sin límites de ángulo/distancia ni clics de juego. */
  photoMode?: boolean
  reducedMotion: boolean
  /** Una interfaz opaca cubre el campo: no gastar fotogramas detrás de ella. */
  renderPaused?: boolean
  quality: GraphicsQuality
  scenario: ScenarioId
  /** Evento visual en reproducción, entregado por el director de animaciones. */
  activeEvent?: AnimationEvent
  /** A quién afectó la carta o poder de `activeEvent`, si es un lanzamiento. */
  castImpact?: CastImpact
  /** Unidad señalada y sus amenazas (flechas). */
  threatFocus?: ThreatFocus
  /** Animaciones de palabras clave que acaban de actuar. */
  traitFx?: readonly TraitFx[]
  /** Casilla enfocada con el teclado (flechas). Undefined = se está jugando con ratón. */
  cursorCell?: Position
  /** Cola de animaciones aún por reproducir: sirve para saber qué piezas van a morir. */
  pendingEvents?: readonly AnimationEvent[]
}

/** Referencia estable para cuando no hay cola: evita re-renderizar por una lista nueva vacía. */
const EMPTY_EVENTS: readonly AnimationEvent[] = []

const boardX = gridToWorldX
const boardZ = gridToWorldZ

/** Posiciones de las 64 casillas, estables entre renders para memoizar celdas. */
const CELL_POSITIONS: readonly Position[] = Array.from({ length: BOARD_CELL_COUNT }, (_, index) => ({
  x: index % BOARD_SIZE,
  y: Math.floor(index / BOARD_SIZE),
}))
const cellKey = (position: Position) => `${position.x},${position.y}`

/** Las cartas se diseñaron para un paso de casilla de 1.18; se reescalan al actual.
    Subido dos veces (1.18 → 1.08 → 1.0) porque en una captura real del tablero las
    unidades eran rectángulos de ~30 px frente a las cartas de la mano de ~150:
    no se distinguía qué había desplegado sin leer el nombre. El marco mide 0.83
    de ancho, así que a esta escala sigue dejando junta libre con la casilla vecina. */
const CARD_SCALE = CELL_SIZE / 1.0

/**
 * Inclinación tipo «standee»: 0 = tumbada del todo, PI/2 = de pie recta.
 *
 * Enderezada de 60° a ~70°: la cámara mira desde unos 35° sobre el horizonte,
 * así que cuanto más vertical esté la carta más superficie de arte le ofrece
 * sin ocupar ni un milímetro más de casilla — la huella en el suelo es
 * `alto × cos(inclinación)`, que ENCOGE al enderezarla.
 */
const CARD_STAND_TILT = 1.22
/** Compensa que, al inclinar la carta desde su centro, el borde inferior se hunda en la casilla. */
const CARD_STAND_RISE = 0.51 * CARD_SCALE * Math.sin(Math.abs(CARD_STAND_TILT))

/**
 * Mitad del tablero que pertenece a quien mira la pantalla. El jugador
 * despliega en la fila 7 y el rival en la 0, así que las filas 4-7 son «casa»
 * para 'player' y las 0-3 lo son para el invitado ('ai').
 */
const isOwnHalf = (y: number, localPlayerId: PlayerId): boolean =>
  localPlayerId === 'player' ? y >= BOARD_SIZE / 2 : y < BOARD_SIZE / 2

/**
 * Tinte de territorio: cálido en tu mitad, frío en la del rival.
 *
 * El tablero eran 64 losas idénticas y no había forma de saber de un vistazo
 * dónde acababa tu campo — con 8 filas y unidades que avanzan una casilla por
 * turno, eso es información que hace falta en cada jugada. Se mantiene la
 * variación por casilla para que el suelo no quede plano.
 *
 * La relación cálido/frío se respeta en las cinco escenas (es la pista de
 * juego y no se toca), pero los tonos concretos salen de la paleta de cada
 * sitio: el ámbar genérico sobre hielo azul hacía que tu mitad pareciera
 * SUCIA frente a la del rival, en vez de simplemente más cálida.
 */
const ZONE_TINTS_BY_STYLE: Readonly<Record<BoardTileStyle, { readonly own: readonly string[]; readonly enemy: readonly string[] }>> = {
  stone: {
    own: ['#fff3df', '#f5e8d5', '#f1e4d1'],
    enemy: ['#dee8f1', '#d3e0eb', '#cddbe7'],
  },
  // En la lava todo es cálido: el bando se marca con la BRASA, no con el frío.
  basalt: {
    own: ['#ffd9b0', '#ffcc9c', '#f7c28e'],
    enemy: ['#c9c4d6', '#bcb8cc', '#b2aec4'],
  },
  // Con el granito musgoso fotográfico (oscuro y verde) el azul pálido
  // anterior se perdía y las dos mitades se leían iguales: el rival baja a
  // un azul pizarra claramente más frío y el propio sube a crema.
  moss: {
    own: ['#fff5dc', '#f6ecd0', '#ece2c4'],
    enemy: ['#9fb6d6', '#94abcc', '#8aa1c2'],
  },
  // La piedra rosada ya calienta el bando propio: un tinte azafrán fuerte
  // convertía toda la terraza en óxido. El rival conserva el índigo del río.
  sandstone: {
    own: ['#efddc9', '#e7d1bd', '#d8c3b1'],
    enemy: ['#adb3c8', '#a0a9c3', '#949db6'],
  },
  // El celadón ya contiene cálidos de su esmalte; el dorado anterior volvía
  // amarilla toda la mitad propia. Un crema apagado preserva el jade, con
  // la mitad rival más fría para que el límite siga leyéndose.
  glaze: {
    own: ['#eee9d6', '#e5e1cb', '#dad8c1'],
    // Azul de porcelana, un punto más saturado que en las otras escenas: la
    // luz de este patio es de amanecer y se come los tintes fríos suaves.
    enemy: ['#9db6e2', '#90a9d8', '#859ecd'],
  },
  // Sobre acero, el bando propio va con el ámbar del metal caliente y el rival
  // con un acero azulado, frío. Los dos tienen que seguir leyéndose como
  // plancha, no como pintura de color.
  forge: {
    own: ['#ffd9a0', '#f5cc93', '#e8c088'],
    enemy: ['#b6c2d2', '#a9b6c8', '#9eabbe'],
  },
  // La pizarra ya aporta azul verdoso. El ámbar anterior se multiplicaba
  // sobre ella y convertía el bando propio en una veta amarilla de madera;
  // un gris cálido discreto mantiene la separación del rival más azulado.
  // La pizarra fotográfica es verdosa y oscura: el rival necesita un azul
  // más hondo para separarse. El propio sigue en gris cálido (el ámbar la
  // volvía madera).
  tide: {
    own: ['#fbf8ec', '#f1efe0', '#e7e6d6'],
    enemy: ['#8fb2d2', '#84a7c8', '#7b9dbe'],
  },
  // El tablero de Duna quedaba EXACTAMENTE del mismo tono que la arena del
  // patio, asi que la zona de juego no se separaba del fondo. Los tintes bajan
  // un escalon: sigue siendo arena, pero pisada y algo mas oscura que el
  // desierto abierto que la rodea.
  sand: {
    own: ['#e9cda2', '#dfc094', '#d4b489'],
    enemy: ['#b6c2d8', '#aab6cd', '#a1adc4'],
  },
  // Sobre hielo, «cálido» es un blanco crema, no ámbar: los dos lados tienen
  // que seguir leyéndose como hielo limpio.
  ice: {
    own: ['#f6f0e6', '#efe8db', '#e6dfd2'],
    enemy: ['#d2e4f4', '#c4d9ee', '#b9d0e8'],
  },
  // En el claro, «cálido» es la luz del sol que entra por el dosel y «frío»
  // la penumbra verde de debajo de los árboles.
  // Bestiario usa este estilo con su piedra musgosa oscura; el verde pálido
  // del rival desaparecía sobre ella. Un verde azulado más frío separa las
  // mitades también en el Claro, que ya se leía bien y sigue haciéndolo.
  forest: {
    own: ['#fff3d2', '#f6e9c4', '#ecdfb8'],
    enemy: ['#a9c6c4', '#9dbab9', '#93afae'],
  },
}

/**
 * Casilla del tablero. Memoizada: con los conjuntos precalculados y el handler
 * estable solo se re-renderiza cuando cambia su propio estado (válida,
 * ocupada, abrasada), no en cada evento visual de la partida.
 */
/**
 * Marco de foco del cursor de teclado. Late despacio para que se distinga de
 * los realces de "casilla válida" (que son fijos) sin llamar más la atención
 * que la propia jugada; con movimiento reducido se queda quieto.
 */
const CursorMarker = memo(function CursorMarker({ position, reducedMotion, hazard }: { position: Position; reducedMotion: boolean; hazard?: MovementHazard }) {
  const color = hazard ? hazard.deaths > 0 ? '#ff554a' : '#ffbc4a' : '#ffe27a'
  const ring = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ring.current || reducedMotion) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.4) * 0.06
    ring.current.scale.setScalar(pulse)
  })
  return (
    <group position={[boardX(position.x), 0.16, boardZ(position.y)]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TILE_SIZE * 0.46, TILE_SIZE * 0.56, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} depthWrite={false} depthTest={false} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[0, TILE_SIZE * 0.5, 24]} />
        <meshBasicMaterial color={color} transparent opacity={hazard ? .32 : .16} depthWrite={false} depthTest={false} side={DoubleSide} />
      </mesh>
    </group>
  )
})

/** Piedra de cada escenario para la losa de la casilla. */
const TERRAIN_STYLE: Readonly<Record<Exclude<ScenarioId, 'auto'>, BoardTileStyle>> = {
  'aether-citadel': 'stone',
  caldera: 'basalt',
  sanctuary: 'moss',
  duna: 'sand',
  fimbul: 'ice',
  grove: 'forest',
  shore: 'tide',
  foundry: 'forge',
  'jade-court': 'glaze',
  'wheel-ghat': 'sandstone',
  'solar-court': 'stone',
  'bestiary-ravine': 'forest',
  'bastion-alba': 'stone',
  'acropolis-olimpo': 'stone',
  'baluarte-tercios': 'sand',
  'umbral-vacio': 'moss',
  'cripta-plaga': 'moss',
  'desguace-goblin': 'forge',
  'lago-kalevala': 'forest',
}

/**
 * Qué dibujo de losa le toca a cada casilla. Los dos factores son primos
 * entre sí y con el número de variantes, así que el patrón no se alinea con
 * las filas ni con las columnas: mirando el tablero no se encuentra la
 * repetición aunque solo haya seis dibujos distintos.
 */
const tileVariantFor = (position: Position): number =>
  (position.x * 5 + position.y * 11) % BOARD_TILE_VARIANTS

const photographicTileVariants = new WeakMap<Texture, readonly Texture[]>()
const NATURAL_TILE_MAPS = {
  ice: '/assets/terrain/hielo-fiordo-v1.webp',
  stone: '/assets/terrain/marmol-ciudadela-v1.webp',
  // Roca de lava creada por el propietario (Gemini), recortada de una imagen
  // suya sin el río; el río va aparte en la costura central (LavaRiver).
  basalt: '/assets/terrain/lava-caldera-roca-v1.webp',
  moss: '/assets/terrain/granito-santuario-v1.webp',
  sand: '/assets/terrain/arenisca-duna-v1.webp',
  forest: '/assets/terrain/suelo-bosque-v1.webp',
  bestiary: '/assets/terrain/piedra-bestiario-v1.webp',
  tide: '/assets/terrain/pizarra-rompiente-v1.webp',
  forge: '/assets/terrain/hierro-gremio-v1.webp',
  glaze: '/assets/terrain/celadon-jade-v1.webp',
  sandstone: '/assets/terrain/arenisca-escalinata-v2.webp',
} as const
/** Los 24 recortes girados y desplazados de una foto de terreno (uno por variante de losa). */
const tileVariantsOf = (source: Texture): readonly Texture[] => {
  let cached = photographicTileVariants.get(source)
  if (!cached) {
    cached = Array.from({ length: 24 }, (_, index) => {
      const map = source.clone()
      map.colorSpace = SRGBColorSpace
      map.anisotropy = 4
      map.repeat.set(0.48, 0.48)
      // Girar el recorte dentro de la textura evita que las vetas de las
      // 64 casillas formen diagonales repetidas. No se cruza el borde del
      // mapa, de modo que no aparecen costuras en mitad de una losa.
      map.center.set(0.5, 0.5)
      map.rotation = Math.floor(index / 6) * Math.PI / 2
      map.offset.set((index % 3) * 0.26 - 0.26, (Math.floor(index / 3) % 2) * 0.52 - 0.26)
      map.needsUpdate = true
      return map
    })
    photographicTileVariants.set(source, cached)
  }
  return cached
}

const FACTION_FLOORS: Partial<Record<FactionId, string>> = {
  arcane: 'suelo-arcane-v1.webp',
  bestiario: 'suelo-bestiario-v1.webp',
  duna: 'suelo-duna-v1.webp',
  fimbul: 'suelo-fimbul-v1.webp',
  forja: 'suelo-forja-v1.webp',
  goblins: 'suelo-goblins-v1.webp',
  jade: 'suelo-jade-v1.webp',
  kalevala: 'suelo-kalevala-v1.webp',
  marea: 'suelo-marea-v1.webp',
  nature: 'suelo-nature-v1.webp',
  olimpo: 'suelo-olimpo-v1.webp',
  order: 'suelo-order-v1.webp',
  plaga: 'suelo-plaga-v1.webp',
  sol: 'suelo-sol-v1.webp',
  shadow: 'suelo-shadow-v1.webp',
  tercios: 'suelo-tercios-v1.webp',
  void: 'suelo-void-v1.webp',
}

const DARK_FACTION_FLOORS = new Set([
  FACTION_FLOORS.forja, FACTION_FLOORS.goblins, FACTION_FLOORS.marea,
  FACTION_FLOORS.plaga, FACTION_FLOORS.shadow,
])

const factionTileMaps = new WeakMap<Texture, readonly Texture[]>()

// Cada losa muestra su fragmento de la talla completa. Las juntas siguen
// perteneciendo a la geometría del tablero y separan también los resaltados.
function FactionTileMaterial({ floor, position, material }: { floor: string; position: Position; material: ThreeElements['meshStandardMaterial'] }) {
  const source = useTexture(withBase(`/assets/terrain/${floor}`))
  let maps = factionTileMaps.get(source)
  if (!maps) {
    maps = Array.from({ length: BOARD_CELL_COUNT }, (_, index) => {
      const map = source.clone()
      const { x, y } = CELL_POSITIONS[index]!
      map.colorSpace = SRGBColorSpace
      map.anisotropy = 4
      map.repeat.set(1 / BOARD_SIZE, 1 / BOARD_SIZE)
      map.offset.set(x / BOARD_SIZE, 1 - (y + 1) / BOARD_SIZE)
      map.needsUpdate = true
      return map
    })
    factionTileMaps.set(source, maps)
  }
  const map = maps[position.y * BOARD_SIZE + position.x]
  // Un poco de luz del propio mapa recupera el grabado en los suelos oscuros.
  // En casillas con aviso, el color de juego tiene prioridad sobre el dibujo.
  if (material.emissiveIntensity === 0 && DARK_FACTION_FLOORS.has(floor)) {
    return <meshStandardMaterial key="relief" {...material} map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.26} />
  }
  return <meshStandardMaterial key="markers" {...material} map={map} emissiveMap={null} />
}

/** Mapa de brillo de las grietas de lava de la Caldera (mismos recortes que la roca). */
const LAVA_GLOW_MAP = '/assets/terrain/lava-caldera-brillo-v1.webp'

function DetailedTileMaterial({ variant, material, terrainStyle }: { variant: number; material: ThreeElements['meshStandardMaterial']; terrainStyle: keyof typeof NATURAL_TILE_MAPS }) {
  const source = useTexture(withBase(NATURAL_TILE_MAPS[terrainStyle]))
  const maps = useMemo(() => tileVariantsOf(source), [source])
  // En la Caldera, en reposo, solo brillan las grietas de lava. Cuando la
  // losa se resalta (despliegue, movimiento, peligro...) vuelve al brillo de
  // siempre en toda la losa, para que el resaltado se lea igual que en el
  // resto de escenarios. Va en un componente aparte para cargar el mapa de
  // brillo solo en la Caldera: cargarlo en todos los tableros retrasaba la
  // aparición de las fichas varios segundos en equipos lentos.
  const highlighted = typeof material.emissiveIntensity === 'number' && material.emissiveIntensity > 0
  if (terrainStyle === 'basalt' && !highlighted) {
    // Mientras llega el mapa de brillo, la losa se pinta con su roca sin
    // brillo: así la carga de la lava no detiene todo el tablero.
    return (
      <Suspense fallback={<meshStandardMaterial {...material} map={maps[variant]} />}>
        <LavaTileMaterial map={maps[variant]!} variant={variant} material={material} />
      </Suspense>
    )
  }
  return <meshStandardMaterial {...material} map={maps[variant]} emissiveMap={maps[variant]} />
}

function LavaTileMaterial({ map, variant, material }: { map: Texture; variant: number; material: ThreeElements['meshStandardMaterial'] }) {
  const glowSource = useTexture(withBase(LAVA_GLOW_MAP))
  const glows = useMemo(() => tileVariantsOf(glowSource), [glowSource])
  return <meshStandardMaterial {...material} map={map} emissiveMap={glows[variant]} emissive="#ff7a2a" emissiveIntensity={1.4} />
}

/**
 * Monta lo decorativo un momento después que el tablero. Con todo lo nuevo
 * (clima, coronas, marco, estandartes...) el primer fotograma tardaba tanto
 * en dibujarse que las fichas aparecían segundos tarde en equipos lentos.
 * Así se juega igual de pronto que antes y la decoración entra después.
 */
const DECOR_DELAY_MS = 1200
function useDeferredDecor(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), DECOR_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])
  return ready
}

const BoardCell = memo(function BoardCell({ position, valid, hazard, occupied, scorched, rubble, cover, terrainStyle, floor, organicForest, own, deployRow, threatened, intent, colorblindMode, reducedMotion, onCell, onHover }: { position: Position; valid: boolean; hazard?: MovementHazard; occupied: boolean; scorched: boolean; rubble: boolean; cover: boolean; terrainStyle: BoardTileStyle; floor?: string; organicForest: boolean; own: boolean; deployRow: boolean; threatened: boolean; intent: 'move' | 'deploy'; colorblindMode?: boolean; reducedMotion: boolean; onCell: (position: Position) => void; onHover?: (position?: Position) => void }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && valid)
  const onClick = () => onCell(position)
  const zone = own ? 'own' : 'enemy'
  // Desplegar se marca en verde y mover en azul: son acciones distintas y
  // antes compartían color, así que la casilla iluminada no decía cuál era.
  // En modo daltonismo el verde de despliegue pasa a ámbar: puede aparecer
  // en el tablero a la vez que el rojo de "casilla amenazada" (en casillas
  // distintas), justo el par más difícil de distinguir para la forma más
  // común de daltonismo.
  const validColor = intent === 'deploy' ? (colorblindMode ? '#ffb648' : '#7ee6a8') : '#8fd4ff'
  const validEmissive = intent === 'deploy' ? (colorblindMode ? '#8a5411' : '#1c7a4a') : '#1f6f9e'
  // La losa es una piedra tallada de verdad: dibujo propio por casilla (seis
  // variantes repartidas para que no se vea el patrón), sombra de contacto
  // horneada en los bordes y mapa de rugosidad para que el material se lea
  // como la sustancia que es — basalto vitrificado, granito mojado o arena
  // seca reflejan la luz de forma muy distinta.
  const variant = tileVariantFor(position)
  const slab = boardTileTexture(terrainStyle, variant)
  const rough = boardTileRoughness(terrainStyle, variant)
  const normal = boardTileNormal(terrainStyle, variant)
  const tint = ZONE_TINTS_BY_STYLE[terrainStyle][zone][(position.x * 7 + position.y * 13) % 3]!
  const hazardColor = hazard ? hazard.deaths > 0 ? '#ff5c52' : '#ffc04d' : undefined
  const color = hazardColor ?? (valid ? (hovered ? '#ffe9a8' : validColor) : scorched ? '#c96a4a' : hovered && !occupied ? '#ffe9c0' : tint)
  const emissive = hazard ? (hazard.deaths > 0 ? '#a91e19' : '#8a4e0a') : valid
    ? validEmissive
    : scorched ? '#7a2c12'
    : hovered && !occupied ? '#4a3c22'
    : threatened ? '#5e1414'
    : deployRow ? '#4a3410'
    : '#000000'
  // Grosor real (antes 0.06-0.13 según estado): con más profundidad de losa
  // el canto lateral capta luz rasante y separa mejor una casilla de la
  // siguiente en vez de leerse como un plano pintado.
  const height = valid ? 0.16 : 0.11
  const material: ThreeElements['meshStandardMaterial'] = {
    map: slab, normalMap: normal, roughnessMap: rough, emissiveMap: slab,
    color, roughness: 1, metalness: terrainStyle === 'forge' ? 0.58 : 0.05,
    envMapIntensity: terrainStyle === 'forge' ? 2.2 : 1, emissive,
    emissiveIntensity: hazard ? 1.3 : valid ? 1.15 : scorched ? 1 : hovered ? 0.62 : threatened ? 0.7 : deployRow ? 0.38 : 0,
  }
  return (
    <mesh
      position={[boardX(position.x), 0, boardZ(position.y)]}
      receiveShadow
      castShadow
      userData={{ validCell: valid }}
      onClick={(event) => { event.stopPropagation(); onClick() }}
      onPointerEnter={() => { setHovered(true); onHover?.(position) }}
      onPointerLeave={() => { setHovered(false); onHover?.(undefined) }}
    >
      {terrainStyle === 'stone' || terrainStyle === 'basalt' || terrainStyle === 'moss' || terrainStyle === 'sand' || terrainStyle === 'ice' || terrainStyle === 'forest' || terrainStyle === 'tide' || terrainStyle === 'forge' || terrainStyle === 'glaze' || terrainStyle === 'sandstone'
        ? <primitive attach="geometry" object={boardSlabGeometry(height)} />
        : <boxGeometry args={[TILE_SIZE, height, TILE_SIZE]} />}
      {/* La normal se genera aparte: el color claro de una veta no debe
          convertirse en un relieve falso. El resplandor conserva el dibujo. */}
      <Suspense fallback={<meshStandardMaterial {...material} />}>
        {floor ? <FactionTileMaterial floor={floor} position={position} material={material} /> : <DetailedTileMaterial terrainStyle={terrainStyle === 'forest' && !organicForest ? 'bestiary' : terrainStyle} variant={((Math.imul(position.x + 1, 73856093) ^ Math.imul(position.y + 1, 19349663)) >>> 0) % 24} material={material} />}
      </Suspense>
      {(terrainStyle === 'basalt' || terrainStyle === 'forest' || floor) && valid && !hazard && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.003, 0]} raycast={() => null}>
        <planeGeometry args={[TILE_SIZE * 0.94, TILE_SIZE * 0.94]} />
        {/* El azul desaparecía al multiplicarse por superficies oscuras.
            La veladura conserva el material y distingue el destino. */}
        <meshBasicMaterial color={validColor} transparent opacity={0.32} depthWrite={false} toneMapped={false} />
      </mesh>}
      {hazard && <MovementHazardMarker hazard={hazard} surfaceY={height / 2 + .016} />}
      <TerrainMarks rubble={rubble} cover={cover} position={position} terrainStyle={terrainStyle} />
      {scorched && <ScorchMarks position={position} reducedMotion={reducedMotion} />}
    </mesh>
  )
})

/**
 * Terreno dibujado sobre la casilla: bloques de escombro para las ruinas y una
 * empalizada baja para la cobertura. Va como hijo de la losa, así que hereda su
 * posición y se mueve con ella.
 *
 * Las formas se derivan de la posición (no del azar) para que el mismo mapa se
 * vea siempre igual sin guardar nada extra en el estado.
 */
/**
 * Casilla abrasada: brasas subiendo y un rescoldo que respira en el suelo.
 *
 * Hasta ahora «abrasada» era solo un cambio de color de la losa. Es un efecto
 * que PERSISTE varios turnos y que cambia cómo se juega esa casilla, así que
 * merece leerse como fuego de verdad y no como una losa pintada de naranja —
 * sobre todo ahora que el resaltado sigue la textura y tiñe menos.
 *
 * Va como hijo de la losa, igual que el terreno, así que hereda su posición.
 */
const ScorchMarks = memo(function ScorchMarks({ position, reducedMotion }: { position: Position; reducedMotion: boolean }) {
  const embers = useRef<Group>(null)
  const glow = useRef<Mesh>(null)
  const texture = useMemo(() => glowTexture('ember'), [])
  // El desfase por casilla evita que todas las brasas del tablero suban a la vez.
  const offset = useMemo(() => ((position.x * 7 + position.y * 13) % 10) / 10, [position.x, position.y])
  const seeds = useMemo(
    () => Array.from({ length: 5 }, (_, index) => ({
      x: Math.cos(index * 2.1 + offset * 6) * 0.22,
      z: Math.sin(index * 1.6 + offset * 6) * 0.22,
      speed: 0.5 + (index % 3) * 0.22,
      phase: (index / 5 + offset) % 1,
    })),
    [offset],
  )
  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    embers.current?.children.forEach((child, index) => {
      const seed = seeds[index]!
      // Ciclo propio por brasa: sube, se apaga y vuelve a nacer abajo.
      const life = (t * seed.speed + seed.phase) % 1
      child.position.set(seed.x * (1 + life * 0.6), 0.06 + life * 0.5, seed.z * (1 + life * 0.6))
      child.scale.setScalar(Math.max(0.001, Math.sin(life * Math.PI) * 0.13))
    })
    if (glow.current) {
      const material = glow.current.material as MeshBasicMaterial
      material.opacity = 0.24 + Math.sin(t * 1.8 + offset * 6) * 0.1
    }
  })
  return (
    <group position={[0, 0.06, 0]}>
      {/* Rescoldo a ras: la mancha caliente sobre la piedra. */}
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.36, 20]} />
        <meshBasicMaterial map={texture} color="#ff7a2e" transparent opacity={0.24} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {!reducedMotion && (
        <group ref={embers}>
          {seeds.map((_, index) => (
            <sprite key={index}>
              <spriteMaterial map={texture} color="#ffb14d" transparent blending={AdditiveBlending} depthWrite={false} />
            </sprite>
          ))}
        </group>
      )}
    </group>
  )
})

/**
 * Piedra del pedestal del Nexo, por escena. Era el ÚLTIMO elemento genérico
 * del tablero: el mismo granito azulado en las seis, mientras el suelo, los
 * obstáculos, la costura y la atmósfera ya eran propios de cada sitio. Un
 * Nexo tallado en piedra azul oscura en mitad de una cueva de lava o de un
 * claro del bosque se lee como traído de fuera.
 */
const NEXUS_STONE: Readonly<Record<BoardTileStyle, { readonly base: string; readonly shaft: string; readonly crown: string }>> = {
  stone: { base: '#78818a', shaft: '#8c949a', crown: '#a0a4a3' },
  basalt: { base: '#505563', shaft: '#646a77', crown: '#7c808a' },
  // La piedra fría del Santuario conserva tono propio bajo el cristal ámbar.
  moss: { base: '#586c72', shaft: '#708080', crown: '#8b9690' },
  sand: { base: '#9b825b', shaft: '#b89c70', crown: '#d2b589' },
  ice: { base: '#576a73', shaft: '#6b7d84', crown: '#8c9da1' },
  forest: { base: '#646755', shaft: '#858573', crown: '#aaa28b' },
  tide: { base: '#53666b', shaft: '#728487', crown: '#92a2a0' },
  // El mapa ya aporta el bronce: multiplicarlo por gris oscuro duplicaba
  // el tinte y borraba las caras del pedestal, sobre todo al deteriorarse.
  forge: { base: '#b7b09c', shaft: '#c7c0ad', crown: '#d5cbb5' },
  glaze: { base: '#91978a', shaft: '#aeb8a8', crown: '#c2c9b6' },
  sandstone: { base: '#8e837e', shaft: '#b5a194', crown: '#c9b2a0' },
}


/**
 * Atmósfera a ras del tablero: lo que hace que el suelo esté VIVO y no sea
 * una foto. Cada escena tiene la suya, y va justo por encima de las losas —
 * los efectos que ya existen viven a nivel de escenario (a 4 unidades de
 * altura o en el horizonte) y desde la cámara no se leen como parte del
 * campo de juego.
 *
 * Deliberadamente MUY sutil y lento: esto está debajo de las fichas durante
 * toda la partida, así que cualquier cosa vistosa cansaría a los diez
 * minutos y competiría con los avisos de daño, que sí tienen que llamar la
 * atención.
 */
const BoardAtmosphere = memo(function BoardAtmosphere({ terrainStyle, quality, reducedMotion }: { terrainStyle: BoardTileStyle; quality: GraphicsQuality; reducedMotion: boolean }) {
  // En calidad baja no se dibuja: es lo primero que sobra si hay que ahorrar.
  if (quality === 'low') return null
  const span = BOARD_WORLD_SIZE * 0.98
  const look = {
    // Pavesas subiendo de las juntas calientes.
    basalt: { count: 26, color: '#ff8a3d', size: 3.4, speed: 0.5, opacity: 0.6, height: 1.5, y: 0.55 },
    // Nieve fina barriendo el hielo, casi a ras.
    ice: { count: 40, color: '#eaf6ff', size: 2.2, speed: 0.28, opacity: 0.55, height: 0.9, y: 0.35 },
    // Polvo de arena levantándose del patio.
    sand: { count: 30, color: '#f0d9a8', size: 2.6, speed: 0.34, opacity: 0.4, height: 1.1, y: 0.4 },
    // Bruma baja entre las losas del santuario.
    moss: { count: 22, color: '#9fc4d8', size: 4.2, speed: 0.16, opacity: 0.32, height: 0.8, y: 0.3 },
    // Motas de luz flotando en la plaza al amanecer.
    stone: { count: 24, color: '#ffe6b0', size: 2.8, speed: 0.2, opacity: 0.42, height: 1.3, y: 0.5 },
    // Polen y bichillos subiendo por los haces de luz del claro.
    forest: { count: 34, color: '#f2ffc4', size: 2.6, speed: 0.19, opacity: 0.5, height: 1.4, y: 0.5 },
    // Salpicadura en suspensión sobre la roca mojada.
    tide: { count: 30, color: '#bff0ea', size: 2.4, speed: 0.24, opacity: 0.44, height: 1.2, y: 0.42 },
    // Chispas de la fragua, cortas y vivas.
    forge: { count: 32, color: '#ffc069', size: 2.6, speed: 0.42, opacity: 0.6, height: 1.6, y: 0.45 },
    // Pavesas de incienso: pocas, lentas y doradas.
    glaze: { count: 22, color: '#ffe0a0', size: 2.2, speed: 0.16, opacity: 0.42, height: 1.5, y: 0.5 },
    // Ceniza sagrada y polvo dorado del templo.
    sandstone: { count: 26, color: '#ffd08a', size: 2.4, speed: 0.18, opacity: 0.44, height: 1.4, y: 0.46 },
  }[terrainStyle]
  return (
    <Sparkles
      count={quality === 'high' ? look.count : Math.round(look.count * 0.55)}
      scale={[span, look.height, span]}
      position={[0, look.y, 0]}
      size={look.size}
      speed={reducedMotion ? 0 : look.speed}
      opacity={look.opacity}
      color={look.color}
    />
  )
})

/**
 * Costura del mediocampo: separa visualmente las dos mitades del tablero.
 * Cae exactamente en z=0 (entre las filas 3 y 4) por cómo está centrada la
 * cuadrícula, así que no hace falta calcular nada.
 */
function Midline({ terrainStyle }: { terrainStyle: BoardTileStyle }) {
  // Altura: al engrosar las losas (0,11 normales y 0,16 resaltadas) esta
  // costura se quedó en 0,045, o sea POR DEBAJO de la cara superior de las
  // casillas — solo asomaba por la junta y perdía casi toda su fuerza. Sube
  // por encima de la losa más alta.
  const tone = {
    stone: '#e8c98a',
    basalt: '#ff9a4d',
    moss: '#9fd8c4',
    sand: '#f0d9a0',
    ice: '#b6e4ff',
    forest: '#cbe89a',
    tide: '#7fe3d4',
    forge: '#ffb347',
    glaze: '#f2c14e',
    sandstone: '#ffb454',
  }[terrainStyle]
  return (
    <group position={[0, 0.092, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Línea principal, del color de la escena en vez del ámbar de siempre:
          sobre el hielo del Fiordo el dorado desentonaba con todo lo demás. */}
      <mesh>
        <planeGeometry args={[BOARD_WORLD_HALF * 2, 0.045]} />
        <meshBasicMaterial color={tone} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Halo tenue a los lados: sin él la línea se corta en seco contra la
          piedra y parece pegada; así se funde con el suelo. */}
      <mesh>
        <planeGeometry args={[BOARD_WORLD_HALF * 2, 0.16]} />
        <meshBasicMaterial color={tone} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Carta física sobre el tablero. Memoizada: el deslizamiento y los pulsos
 * viven en useFrame, así que el re-render solo hace falta cuando cambian
 * la pieza o sus marcas (selección, objetivo, disponibilidad).
 */
/** Cuánto dura cada salto de un paso de movimiento, en milisegundos. */
const HOP_STEP_MS = 190
/** Altura del arco de cada salto: sutil, solo para separar visualmente cada casilla cruzada. */
const HOP_HEIGHT = 0.16

interface HopPath {
  /** Casillas cruzadas, incluida la de salida y la de llegada. Siempre en línea recta: el motor nunca permite mover en diagonal. */
  readonly cells: readonly Position[]
  index: number
  segmentStart: number
}

/** Icono de cada veredicto de la previsión. */
const VERDICT_ICON: Readonly<Record<PreviewVerdict['tone'], string>> = {
  kill: '☠', hurt: '♥', counterKill: '☠', counter: '↩', safe: '✓', sink: '≈', pierce: '➶', nexus: '◆', lethal: '☠',
}

/**
 * Sellos de la previsión al apuntar: «Muere», «Sobrevive con 2», «Devuelve
 * 3»… cada uno con su color. Van sobre las dos fichas para que el jugador
 * vea de un vistazo qué gana y qué arriesga antes de confirmar el ataque.
 */
function VerdictBadges({ verdicts }: { verdicts: readonly PreviewVerdict[] }) {
  return (
    <div className={styles.verdicts}>
      {verdicts.map((verdict) => (
        <div key={verdict.title} className={styles.verdict} data-tone={verdict.tone}>
          <span className={styles.verdictIcon}>{VERDICT_ICON[verdict.tone]}</span>
          <strong>{verdict.title}</strong>
          {verdict.detail && <small>{verdict.detail}</small>}
        </div>
      ))}
    </div>
  )
}

/**
 * Ficha a la que va de verdad el puntero cuando hay varias cartas de pie una
 * detrás de otra: la primera que sea objetivo válido o, si ninguna lo es, la
 * más cercana. Cada grupo de ficha lleva en userData su id y si es objetivo.
 */
const preferredPiece = (event: ThreeEvent<MouseEvent | PointerEvent>): string | undefined => {
  let first: string | undefined
  for (const hit of event.intersections) {
    let node: Object3D | null = hit.object
    while (node && node.userData?.pieceId === undefined) node = node.parent
    if (!node) continue
    const id = node.userData.pieceId as string
    if (node.userData.targetable) return id
    first ??= id
  }
  return first
}

const BoardCard = memo(function BoardCard({ deploying = false, piece, runo, formationBonus, selected, targetable, ready, active, mine, crowded, stackSafe, onPiece, onInspect, onHover, previewLines, reducedMotion, impulse, impact, arrival, waiting }: { deploying?: boolean; piece: BoardPiece; runo: number; formationBonus: number; selected: boolean; targetable: boolean; ready: boolean; active: boolean; mine: boolean; crowded: boolean; stackSafe: boolean; onPiece: (pieceId: string) => void; onInspect?: (cardId: string, pieceId?: string) => void; onHover?: (pieceId?: string) => void; previewLines?: readonly PreviewVerdict[]; reducedMotion: boolean; impulse?: Impulse; impact?: AnimationEvent; arrival?: AnimationEvent; waiting: boolean }) {
  const card = CARD_BY_ID[piece.cardId]
  const displayedAttack = Math.max(0, (card?.attack ?? 0) + piece.attackModifier + (card?.type === 'unit' ? runoAttackBonus(runo) : 0) + formationBonus)
  const factionFrame = cardFrameFor(card?.faction)
  const texture = useCardFaceTexture(card, card?.art.webp ?? '/assets/cards/art/fuente-furia.webp',
    card?.type === 'unit' ? displayedAttack : undefined, piece.currentHealth)
  const group = useRef<Group>(null)
  const presentation = useRef<Group>(null)
  const arrivalGroup = useRef<Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const arrivingSince = useRef<number | null>(null)
  useEffect(() => {
    arrivingSince.current = arrival && !reducedMotion ? performance.now() : null
  }, [arrival, reducedMotion])
  const frame = useRef<Mesh>(null)
  const readyRing = useRef<Mesh>(null)
  const stunOrbit = useRef<Group>(null)
  const contactShadow = useRef<Mesh>(null)
  const plinth = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const target = useMemo(() => ({ x: boardX(piece.position.x), z: boardZ(piece.position.y) }), [piece.position.x, piece.position.y])
  /**
   * Trayectoria de salto: antes un movimiento de varias casillas se veía como
   * un deslizamiento continuo hacia el destino final, sin distinguir cuántas
   * casillas cruzaba. Como el motor nunca permite mover en diagonal
   * (`pathIsClear` lo rechaza), la ruta entre la posición anterior y la
   * nueva es siempre una línea recta de casillas — se anima cruzándolas una
   * a una, con un pequeño arco por salto, en vez de una sola línea continua.
   */
  const prevGridPos = useRef(piece.position)
  const hop = useRef<HopPath | null>(null)
  /** Grupo intermedio del golpe: se desplaza sobre la posición de la casilla,
      sin tocarla — el amortiguado de `group` la persigue cada fotograma y
      sumarle el desplazamiento ahí lo haría converger de vuelta a medias. */
  const strike = useRef<Group>(null)
  /** Grupo que encara la ficha hacia la cámara girando solo sobre su eje vertical. */
  const facing = useRef<Group>(null)
  const impulseRun = useRef<{ start: number; dx: number; dz: number; kind: Impulse['kind']; durationMs: number } | null>(null)
  useEffect(() => {
    if (!impulse || reducedMotion) return
    impulseRun.current = { start: performance.now(), dx: impulse.dx, dz: impulse.dz, kind: impulse.kind, durationMs: impulse.durationMs }
  }, [impulse, reducedMotion])
  useEffect(() => {
    const prev = prevGridPos.current
    prevGridPos.current = piece.position
    if (reducedMotion || (prev.x === piece.position.x && prev.y === piece.position.y)) return
    const dx = Math.sign(piece.position.x - prev.x)
    const dy = Math.sign(piece.position.y - prev.y)
    const cells: Position[] = [prev]
    let x = prev.x
    let y = prev.y
    // Tope de seguridad (BOARD_SIZE pasos): si algún día un efecto teletransporta
    // en vez de mover, esto evita un bucle infinito en vez de una animación rara.
    for (let steps = 0; steps < BOARD_SIZE && (x !== piece.position.x || y !== piece.position.y); steps += 1) {
      x += dx
      y += dy
      cells.push({ x, y })
    }
    hop.current = { cells, index: 0, segmentStart: performance.now() }
    // Depende de x/y sueltos, no del objeto `piece.position`: MatchState es
    // inmutable, así que solo cambia de referencia cuando de verdad cambia el
    // valor, pero depender del objeto entero perdería la comparación
    // primitiva y volvería a disparar el efecto en cualquier otro cambio de
    // la ficha (Vida, estados...) que reconstruya `piece` sin mover nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.position.x, piece.position.y, reducedMotion])
  const frozen = piece.statuses.some((status) => status.kind === 'frozen')
  const stunned = piece.statuses.some((status) => status.kind === 'stunned')
  const cursed = piece.statuses.some((status) => status.kind === 'cursed')
  const infected = piece.statuses.some((status) => status.kind === 'infected')
  const shielded = piece.statuses.reduce((total, status) => total + (status.kind === 'shielded' ? status.amount : 0), 0)
  const spent = active && piece.attackedThisTurn
  const flyer = Boolean(card?.keywords.includes('flying') || piece.grantedKeywords?.includes('flying'))
  const idlePhase = useMemo(() => [...piece.instanceId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 628 / 100, [piece.instanceId])
  useFrame(({ clock, camera }, delta) => {
    const node = group.current
    if (!node) return
    const pose = arrival && arrivingSince.current !== null && !reducedMotion && card
      ? arrivalMotion(card.faction, Math.min(1, (performance.now() - arrivingSince.current) / Math.max(1, arrival.durationMs)), card.type === 'structure')
      : undefined
    const visible = reducedMotion || (!waiting && (pose?.visible ?? !arrival))
    if (presentation.current) presentation.current.visible = visible
    // Html tiene su propia capa DOM y no hereda Group.visible de Three.
    if (label.current) {
      const visibility = visible ? 'visible' : 'hidden'
      const opacity = String(pose?.labelOpacity ?? 1)
      if (label.current.style.visibility !== visibility) label.current.style.visibility = visibility
      if (label.current.style.opacity !== opacity) label.current.style.opacity = opacity
    }
    if (arrivalGroup.current) {
      arrivalGroup.current.position.y = pose?.height ?? 0
      arrivalGroup.current.scale.setScalar(pose?.scale ?? 1)
      arrivalGroup.current.rotation.set(pose?.lean ?? 0, pose?.turn ?? 0, 0)
    }
    const speed = 8
    const lift = selected ? 0.3 : hovered ? 0.22 : 0.15
    const path = hop.current
    if (reducedMotion) {
      // Bajo demanda puede haber un solo fotograma. Amortiguar muy rápido
      // aún dejaba un pequeño desplazamiento pendiente hasta otro evento.
      hop.current = null
      impulseRun.current = null
      node.position.set(target.x, lift, target.z)
    } else if (path && path.index < path.cells.length - 1) {
      const elapsed = performance.now() - path.segmentStart
      const progress = Math.min(1, elapsed / HOP_STEP_MS)
      const from = path.cells[path.index]!
      const to = path.cells[path.index + 1]!
      node.position.x = MathUtils.lerp(boardX(from.x), boardX(to.x), progress)
      node.position.z = MathUtils.lerp(boardZ(from.y), boardZ(to.y), progress)
      // Arco por salto: sube y baja dentro de cada casilla cruzada, para que
      // se lean como pasos separados en vez de un deslizamiento continuo.
      node.position.y = MathUtils.damp(node.position.y, lift + Math.sin(progress * Math.PI) * HOP_HEIGHT, speed, delta)
      if (progress >= 1) {
        path.index += 1
        path.segmentStart = performance.now()
        if (path.index >= path.cells.length - 1) hop.current = null
      }
    } else {
      node.position.x = MathUtils.damp(node.position.x, target.x, speed, delta)
      node.position.z = MathUtils.damp(node.position.z, target.z, speed, delta)
      // Reposo vivo: las voladoras flotan más altas y se mecen; el resto
      // respira apenas. El desfase por ficha evita que todo el tablero suba
      // y baje a la vez como un único bloque.
      const idle = flyer
        ? 0.09 + Math.sin(clock.elapsedTime * 1.7 + idlePhase) * 0.05
        : Math.sin(clock.elapsedTime * 1.1 + idlePhase) * 0.012
      node.position.y = MathUtils.damp(node.position.y, lift + idle, speed, delta)
    }
    const turnAngle = selected ? (piece.owner === 'player' ? -0.08 : 0.08) : 0
    node.rotation.y = reducedMotion ? turnAngle : MathUtils.damp(node.rotation.y, turnAngle, speed, delta)
    // La ficha encara a la cámara girando SOLO sobre su eje vertical, como un
    // standee de mesa al que se le da la vuelta para mirarlo: desde un lateral
    // exacto, una lámina plana se vería de canto y la ilustración desaparecía.
    // Va en un grupo propio, por dentro del que hace la embestida: si girase el
    // grupo exterior, el desplazamiento del golpe giraría con él y saldría
    // disparado en la dirección equivocada.
    const face = facing.current
    if (face && face.parent) {
      const local = face.parent.worldToLocal(camera.position.clone())
      const wanted = Math.atan2(local.x, local.z)
      // Camino más corto: sin esto, cruzar ±PI da una vuelta entera de más.
      const current = face.rotation.y
      const shortest = current + Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current))
      face.rotation.y = reducedMotion ? wanted : MathUtils.damp(current, shortest, 6, delta)
    }
    // Agotada: la carta descansa ligeramente girada, como una carta «tapeada».
    node.rotation.z = reducedMotion ? (spent ? 0.16 : 0) : MathUtils.damp(node.rotation.z, spent ? 0.16 : 0, speed, delta)
    if (contactShadow.current) {
      // La sombra vive en el mundo, fuera del giro y la elevación de la carta:
      // así tampoco se inclina al agotarse ni acompaña la embestida.
      contactShadow.current.position.set(node.position.x, 0.103, node.position.z + 0.04)
      const height = Math.max(0, node.position.y - 0.15 + (pose?.height ?? 0))
      contactShadow.current.scale.setScalar(1 + height * 0.6)
      ;(contactShadow.current.material as MeshBasicMaterial).opacity = 0.72 / (1 + height * 2)
    }
    if (plinth.current) {
      plinth.current.position.set(node.position.x, 0.15, node.position.z)
      plinth.current.rotation.y = node.rotation.y + (facing.current?.rotation.y ?? 0)
    }
    if (frame.current && !reducedMotion) {
      const material = frame.current.material as MeshStandardMaterial
      if (targetable) material.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 5.2) * 0.28
    }
    if (readyRing.current) {
      const material = readyRing.current.material as MeshBasicMaterial
      material.opacity = reducedMotion ? 0.32 : 0.24 + (Math.sin(clock.elapsedTime * 2.1) + 1) * 0.09
    }
    // Aturdida: chispas dando vueltas por encima, la señal de siempre para
    // «esta no va a poder pegar». Giran despacio y suben y bajan un poco.
    if (stunOrbit.current && !reducedMotion) {
      const t = clock.elapsedTime
      stunOrbit.current.rotation.y = t * 1.6
      stunOrbit.current.children.forEach((child, index) => {
        child.position.y = Math.sin(t * 3 + index * 2.1) * 0.06
        // Escala del primer intento: 0,10. A la distancia real de la cámara
        // las chispas eran puntitos que no se distinguían del ruido de la
        // escena; hay que irse a más del doble para que se lean como chispas.
        child.scale.setScalar(0.24 + Math.sin(t * 4 + index * 1.7) * 0.06)
      })
    }
    // Embestida / retroceso: ida y vuelta con seno, para que salga y regrese
    // en el mismo gesto sin dejar la ficha descolocada si se corta a medias.
    const strikeNode = strike.current
    if (strikeNode) {
      const run = impulseRun.current
      if (reducedMotion) {
        strikeNode.position.set(0, 0, 0)
        strikeNode.rotation.set(0, 0, 0)
      } else if (run) {
        const progress = Math.min(1, (performance.now() - run.start) / Math.max(1, run.durationMs))
        const pose = combatPose(run.kind, progress)
        strikeNode.position.set(run.dx * pose.reach, pose.lift, run.dz * pose.reach)
        strikeNode.rotation.set(run.dz * pose.lean, 0, -run.dx * pose.lean)
        if (progress >= 1) impulseRun.current = null
      } else if (strikeNode.position.lengthSq() > 0.00001) {
        strikeNode.position.set(0, 0, 0)
        strikeNode.rotation.set(0, 0, 0)
      }
    }
  })
  if (!card) return null
  const onClick = () => onPiece(piece.instanceId)
  const onDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onInspect?.(piece.cardId, piece.instanceId)
  }
  const maxHealth = Math.max(1, (card.health ?? card.resistance ?? 1) + (piece.formationHealthApplied ?? 0) + (piece.permanentHealthBonus ?? 0) - (piece.permanentHealthPenalty ?? 0))
  const damaged = piece.currentHealth < maxHealth
  // El marco distingue "mía" de "del rival" a simple vista (a petición del
  // usuario: costaba distinguirlas) — dorado/bronce para las propias, rojo
  // oscuro para las rivales. Antes salía de la facción (solo Furia vs. resto),
  // que no decía nada sobre quién la controla.
  const frameColor = mine ? '#6b4a1e' : '#5a1a1a'
  const glow = selected || targetable
  const glowColor = targetable ? '#ffd257' : mine ? '#f1c15f' : '#ff6b65'
  // Brillo ambiental permanente y suave (no solo al seleccionar/objetivo):
  // así se distingue mío/rival incluso en reposo, sin esperar a interactuar.
  const ownershipGlow = mine ? '#caa04a' : '#ff5a4d'
  return (
    <group ref={presentation} visible={reducedMotion || (!waiting && !arrival)}>
      {card.type === 'structure' && <group ref={plinth} position={[target.x, 0.15, target.z]}><CardPlinth mine={mine} /></group>}
      <mesh ref={contactShadow} rotation={[-Math.PI / 2, 0, 0]} position={[target.x, 0.103, target.z + 0.04]}>
        <planeGeometry args={[0.92, 0.92]} />
        <meshBasicMaterial map={contactShadowTexture()} transparent depthWrite={false} opacity={0.72} />
      </mesh>
    <group
      ref={group}
      position={[target.x, 0.15, target.z]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        // Al colocar una carta desde la mano ninguna ficha es objetivo: el
        // clic sobre una carta de pie que tapa una casilla válida sigue hasta
        // la casilla (si no, no se podía desplegar entre dos fichas).
        if (deploying && !targetable && event.intersections.some((hit) => hit.object.userData?.validCell)) return
        // Un objetivo tapado por otra carta (la propia atacante, casi siempre:
        // el rival está justo detrás desde la cámara) tiene prioridad. Esta
        // ficha deja pasar el clic y lo recibe el objetivo de detrás.
        const preferred = preferredPiece(event)
        if (preferred && preferred !== piece.instanceId) return
        event.stopPropagation()
        onClick()
      }}
      onDoubleClick={onDoubleClick}
      onPointerEnter={(event: ThreeEvent<PointerEvent>) => { setHovered(true); onHover?.(preferredPiece(event) ?? piece.instanceId) }}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        // Se recalcula al moverse: al pasar por encima de dos cartas solapadas
        // el aviso de ataque sale para el objetivo aunque asome poco.
        const preferred = preferredPiece(event)
        if (preferred) onHover?.(preferred)
      }}
      onPointerLeave={() => { setHovered(false); onHover?.(undefined) }}
      userData={{ pieceId: piece.instanceId, targetable }}
    >
      <group ref={strike}>
      <group ref={arrivalGroup}>
      {/* Aura de rareza en reposo: la rara suelta alguna mota; la mítica, un
          enjambre dorado. Así una mítica se reconoce en el tablero de lejos. */}
      {card && !reducedMotion && (card.rarity === 'mythic' || card.rarity === 'rare') && (
        // Sin raycast: los puntos cuentan como parte de la ficha para el clic y
        // three los toca con un margen de 1 unidad de mundo, así que el aura se
        // tragaba los clics y el hover de las casillas y fichas vecinas.
        <Sparkles count={card.rarity === 'mythic' ? 14 : 5} scale={[0.9, 1.1, 0.5]} position={[0, 0.55, 0]} size={card.rarity === 'mythic' ? 3.2 : 2.2}
          speed={0.35} opacity={0.8} color={card.rarity === 'mythic' ? '#ffd76a' : '#9fd0ff'} raycast={() => null} />
      )}
      <group ref={facing}>
      {/* Standee: frame + arte, inclinados (prueba) en vez de tumbados del todo.
          Se eleva CARD_STAND_RISE para que, al girar desde su centro, el borde
          inferior quede a ras de la casilla en vez de hundirse en ella. */}
      <group position={[0, CARD_STAND_RISE, 0]} scale={CARD_SCALE} rotation={[CARD_STAND_TILT, 0, 0]}>
        <mesh ref={frame} castShadow receiveShadow>
          <boxGeometry args={[0.83, 0.07, 1.02]} />
          <meshStandardMaterial
            color={frozen ? '#2b4a63' : frameColor}
            metalness={0.04}
            roughness={card.type === 'structure' ? 0.72 : 0.58}
            emissive={glow ? glowColor : frozen ? '#79e7ff' : ownershipGlow}
            emissiveIntensity={glow ? 0.4 : frozen ? 0.2 : 0.06}
          />
        </mesh>
        <CardFrameTrim mine={mine} unique={card.unique} structure={card.type === 'structure'} accent={FACTION_BY_ID[card.faction].accentColor} />
        {/* El arte NUNCA se gira según el dueño de la pieza: sin rotación del
            grupo exterior (partida en solitario, o el anfitrión en PvP), la
            orientación de este plano es independiente de dónde esté en el
            tablero — solo depende de su propia jerarquía de rotaciones, no
            de la posición. Un giro condicionado al dueño ("pieza rival →
            180°") llevaba tiempo dejando el arte de las piezas rivales al
            revés tanto en solitario como en PvP (confirmado por captura del
            usuario), verificado numéricamente con Three.js real antes de
            quitarlo: con el giro fijo en 0 para TODAS las piezas, los cuatro
            casos (propia/rival × anfitrión/invitado) dan la misma
            orientación "hacia arriba", la correcta. */}
        {/* El arte se auto-ilumina (emissiveMap con el mismo mapa): con solo
            `map` dependía de la luz del escenario y en Aether Citadel o la
            Caldera las unidades salían casi negras — ilegibles en la captura
            real. Así la ilustración se lee igual en los tres escenarios sin
            tocar la iluminación de ninguno. */}
        {/*
            DOS caras con arte, una a cada lado de la losa del marco.

            Antes había un solo plano apoyado sobre la cara superior, con
            `side={DoubleSide}`. Eso no bastaba: la losa del marco es SÓLIDA y
            tapa el plano desde el otro lado, así que al orbitar la cámara (o
            simplemente siendo el invitado de una partida en línea, que ve la
            escena girada 180°) la ficha se veía como un rectángulo dorado liso
            sin ilustración — reportado con capturas por el usuario.

            La cara de atrás va rotada [-PI/2, PI, 0], verificado con Three.js
            real: dejar la normal opuesta a la del frente manteniendo el mismo
            vector "arriba" solo lo consigue esa rotación (y su equivalente
            [PI/2, 0, PI]). Al ser una rotación pura, no hay reflexión: la
            ilustración se ve DERECHA desde los dos lados, no en espejo, que es
            lo que pasaba antes con la cara doble del plano único.
        */}
        {[
          { key: 'front', y: 0.038, spin: 0 },
          { key: 'back', y: -0.038, spin: Math.PI },
        ].map(({ key, y, spin }) => (
          <mesh key={key} position={[0, y, 0]} rotation={[-Math.PI / 2, spin, 0]}>
            <planeGeometry args={[factionFrame ? 0.60 : 0.73, 0.9]} />
            <meshStandardMaterial
              map={texture}
              emissiveMap={texture}
              emissive="#ffffff"
              emissiveIntensity={spent ? 0.3 : 0.6}
              roughness={0.62}
              color={frozen ? '#9fd4ef' : spent ? '#8f8f96' : '#ffffff'}
            />
          </mesh>
        ))}
        <CardSurfaceWear damage={Math.max(0, 1 - piece.currentHealth / maxHealth)} frozen={frozen} infected={infected}
          cursed={cursed} impact={impact} reducedMotion={reducedMotion} />
      </group>
      {/* Escudo: cúpula traslúcida alrededor de la ficha.

          Llevar escudo solo se veía en una insignia HTML diminuta encima de
          la carta, y es información que hace falta ANTES de decidir un
          ataque — de un vistazo al tablero no había forma de saber qué
          unidades absorbían daño. La opacidad sube con los puntos de escudo
          (tope a los 4), así que un escudo grande se nota más que uno de 1.

          Va fuera del grupo del arte y con `depthWrite={false}` para no
          tapar la ilustración ni pelearse con ella por la profundidad. */}
      {shielded > 0 && <CardWard strength={shielded} scale={CARD_SCALE} reducedMotion={reducedMotion} />}
      {/* Aturdida: chispas orbitando por encima de la ficha. */}
      {stunned && !reducedMotion && (
        <group ref={stunOrbit} position={[0, 0.78, 0]} scale={CARD_SCALE}>
          {[0, 1, 2].map((index) => {
            const angle = (index / 3) * Math.PI * 2
            return (
              <sprite key={index} position={[Math.cos(angle) * 0.34, 0, Math.sin(angle) * 0.34]}>
                <spriteMaterial map={glowTexture('gold')} color="#ffe27a" transparent blending={AdditiveBlending} depthWrite={false} />
              </sprite>
            )
          })}
        </group>
      )}
      </group>
      </group>
      </group>
      {/* Anillos de selección/disponibilidad: se quedan tumbados en la casilla
          aunque la carta se incline — y tampoco acompañan a la embestida: son
          marcas del tablero, no parte de la ficha. */}
      <group scale={CARD_SCALE}>
        {selected && (
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.72, 36]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.85} depthWrite={false} />
          </mesh>
        )}
        {ready && !selected && (
          <mesh ref={readyRing} position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.56, 0.63, 36]} />
            <meshBasicMaterial color="#efe3bd" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* zIndexRange bajo: sin él, drei usa z-index millonarios que tapan los modales.
          A la altura del borde superior del standee (2×CARD_STAND_RISE), no de la
          carta tumbada de antes: si no, el nombre y las estadísticas quedan
          flotando muy por encima de la carta en vez de justo sobre ella. */}
      <Html center position={[0, CARD_STAND_RISE * 2 + 0.05, 0]} distanceFactor={8.6} zIndexRange={[14, 0]} className={styles.cardLabel}>
        {/* Contenedor propio para el marcador de «elegida»: `<Html>` de drei no
            propaga los data-* al div que crea, así que el atributo tiene que
            vivir aquí dentro para que el CSS pueda usarlo. */}
        <div ref={label} style={{ visibility: !reducedMotion && (waiting || arrival) ? 'hidden' : undefined }} className={styles.labelInner} data-selected={selected || hovered || targetable || undefined} data-crowded={crowded || undefined} data-compact={crowded && !selected && !hovered && !targetable || undefined} data-wide={stackSafe && (piece.currentHealth >= 10 || displayedAttack >= 10) || undefined}>
        <div className={styles.cardName} data-mine={mine || undefined} data-frozen={frozen || undefined} data-spent={spent || undefined}>{card.name}</div>
        <div className={styles.cardStats} data-unique={card.unique || undefined}>
          {card.unique && <span className={styles.uniqueMark} role="img" aria-label="Carta única">◆</span>}
          {card.attack !== undefined && <span className={styles.attackStat} aria-label={`Ataque ${displayedAttack}`}><GameIcon name="attack" /> {displayedAttack}</span>}
          <span className={damaged ? styles.damagedStat : styles.healthStat} aria-label={`Vida ${piece.currentHealth}`}><GameIcon name="health" /> {piece.currentHealth}</span>
        </div>
        {/* Estados: solo aparecen cuando los hay, en su propia fila para que no
            empujen a las estadísticas. «Aturdida» faltaba desde que se añadió
            la palabra clave: la unidad no podía atacar y nada lo indicaba. */}
        {(frozen || stunned || shielded > 0 || cursed || infected || spent) && (
          <div className={styles.cardStatuses}>
            {frozen && <span className={styles.frozenStat} title="Congelada: no puede mover ni atacar">❄</span>}
            {stunned && <span className={styles.stunnedStat} title="Aturdida: no puede atacar este turno (sí moverse)">✷</span>}
            {shielded > 0 && <span className={styles.shieldStat} title={`Escudo: absorbe ${shielded} de daño`}>⛨ {shielded}</span>}
            {cursed && <span className={styles.cursedStat} title="Maldita: pierde Vida al final de cada turno">☠</span>}
            {infected && <span className={styles.infectedStat} title="Infectada: pierde Vida al final de cada turno y puede convertirse al morir">☣</span>}
            {spent && <span className={styles.spentStat} title="Ya ha actuado este turno">◒</span>}
          </div>
        )}
        </div>
      </Html>
      {/* Vista previa de daño: solo aparece con el cursor encima de un objetivo
          válido mientras hay una ficha atacante seleccionada. Muestra el
          resultado real (con reducciones y escudos ya aplicados), no el
          Ataque impreso — para eso reutiliza `previewAttackPiece`. */}
      {previewLines && previewLines.length > 0 && (
        <Html center position={[0, CARD_STAND_RISE * 2 + 0.42, 0]} distanceFactor={8.6} zIndexRange={[15, 0]} className={styles.attackPreview}>
          <VerdictBadges verdicts={previewLines} />
        </Html>
      )}
    </group>
    </group>
  )
})

/**
 * Nexo: antes era ~20 mallas por bando rotando/pulsando cada fotograma sin
 * parar (icosaedro + núcleo + 3 anillos + 4 esquirlas orbitando, x2 Nexos),
 * lo que costaba fotogramas todo el partido para un adorno de fondo. Ahora
 * es un pedestal estático (sin useFrame) con el retrato del comandante como
 * superposición HTML —no como textura WebGL: cargar dos texturas más de
 * comandante saturaba el renderizado por software en equipos modestos—.
 * El destello al recibir daño es una clase CSS puntual, no una animación
 * continua en el hilo de render de Three.js.
 */
function Nexus({
  playerId,
  mine,
  health,
  maxHealth,
  targetable,
  onClick,
  onHover,
  previewLines,
  commanderArt,
  activeEvent,
  terrainStyle,
  reducedMotion,
  terminal,
}: {
  playerId: PlayerId
  /** Si este Nexo es el de quien mira la pantalla (no siempre coincide con el bando 'player' del motor: en multijugador el invitado es 'ai'). */
  mine: boolean
  health: number
  maxHealth: number
  targetable: boolean
  onClick: () => void
  onHover?: (playerId?: PlayerId) => void
  previewLines?: readonly PreviewVerdict[]
  commanderArt: string
  activeEvent?: AnimationEvent
  /** Piedra del sitio: el pedestal se talla en el material de la escena. */
  terrainStyle: BoardTileStyle
  reducedMotion: boolean
  terminal: boolean
}) {
  const decorReady = useDeferredDecor()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && targetable)
  const [justHit, setJustHit] = useState(false)
  const [collapse, setCollapse] = useState<{ id: string; durationMs: number; settled?: boolean }>()
  const schedule = useVisualTimers()
  const lastEvent = useRef<AnimationEvent | undefined>(undefined)
  /**
   * Golpe recibido: hasta ahora el Nexo solo cambiaba un dato en su etiqueta
   * HTML y en 3D no pasaba absolutamente nada — la parte más importante de la
   * partida (quitarle Vida al rival) era la menos vistosa. Ahora encaja el
   * golpe: se hunde, tiembla, sus cristales se encienden y sale una onda por
   * la base.
   */
  const structure = useRef<Group>(null)
  const shock = useRef<Mesh>(null)
  const crystals = useRef<Group>(null)
  const hitAt = useRef(-10)
  const hitDuration = useRef(620)
  const nexusLight = useRef<PointLight>(null)
  const portraitLabel = useRef<HTMLDivElement>(null)
  const portraitWorld = useMemo(() => new Vector3(), [])
  useEffect(() => {
    if (
      activeEvent &&
      activeEvent.id !== lastEvent.current?.id &&
      activeEvent.targetId === `${playerId}-nexus` &&
      (activeEvent.type === 'nexus-damage' || activeEvent.type === 'victory')
    ) {
      lastEvent.current = activeEvent
      hitAt.current = performance.now()
      hitDuration.current = Math.min(620, Math.max(1, activeEvent.durationMs))
      schedule(() => {
        setJustHit(true)
        if (activeEvent.type === 'victory' && health <= 0) {
          setCollapse({ id: activeEvent.id, durationMs: activeEvent.durationMs })
        }
      }, 0)
      schedule(() => {
        if (lastEvent.current?.id === activeEvent.id) setJustHit(false)
      }, Math.min(380, Math.max(40, activeEvent.durationMs)))
    }
    return undefined
  }, [activeEvent, playerId, health, schedule])
  useEffect(() => {
    if (health > 0 && collapse) {
      schedule(() => { setCollapse(undefined); setJustHit(false) }, 0)
      lastEvent.current = undefined
      hitAt.current = -10
    } else if (terminal && health <= 0 && !collapse) {
      // Fatiga y partidas restauradas pueden llegar sin un evento de victoria.
      // El resultado ya está resuelto: conservar la ruina, sin inventar daño.
      schedule(() => setCollapse({ id: `settled-${playerId}`, durationMs: 1, settled: true }), 0)
    }
  }, [health, collapse, terminal, playerId, schedule])
  const z = nexusWorldZ(playerId)
  const stone = NEXUS_STONE[terrainStyle]
  const nexusMetal = terrainStyle === 'forge' ? forgedMetalMaps('bronze') : undefined
  const stoneMap = terrainStyle === 'stone' || terrainStyle === 'moss' || terrainStyle === 'forest' || terrainStyle === 'glaze' ? stoneMaps('limestone').map : terrainStyle === 'basalt' ? stoneMaps('basalt').map : terrainStyle === 'sand' || terrainStyle === 'sandstone' ? stoneMaps('sandstone').map : terrainStyle === 'ice' || terrainStyle === 'tide' ? stoneMaps('granite').map : nexusMetal?.map ?? masonryTexture()
  const color = mine ? '#f2a24a' : '#58c9ff'
  const ringEmissive = mine ? '#9a7326' : '#3f7fb0'
  const integrity = MathUtils.clamp(health / Math.max(1, maxHealth), 0, 1)
  const damage = 1 - integrity
  useFrame(({ camera }) => {
    const since = performance.now() - hitAt.current
    // Html reinicia su estilo al conectar el portal y solo recalcula escala
    // cuando cambia la proyección. Con cámara quieta quedaba a tamaño CSS
    // hasta el primer movimiento: restaurar la escala que omite ese reinicio.
    const wrapper = portraitLabel.current?.parentElement
    if (wrapper && !wrapper.style.transform.includes('scale(') && camera instanceof ThreePerspectiveCamera) {
      portraitWorld.set(0, 0.66, 0)
      structure.current?.parent?.localToWorld(portraitWorld)
      wrapper.style.transform += ` scale(${6.5 / (2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.distanceTo(portraitWorld))})`
    }
    const progress = Math.min(1, since / hitDuration.current)
    const golpe = !reducedMotion && progress < 1 ? 1 - progress : 0
    const node = structure.current
    if (node) {
      node.visible = !collapse
      // Se hunde de golpe y vuelve, con una vibración que se apaga.
      node.position.y = -0.16 * golpe * golpe
      node.rotation.z = Math.sin(since * 0.06) * 0.05 * golpe
      node.position.x = Math.sin(since * 0.09) * 0.06 * golpe
    }
    if (crystals.current) {
      for (const [index, shard] of crystals.current.children.entries()) {
        const material = (shard as Mesh).material as MeshStandardMaterial
        material.emissiveIntensity = 0.25 + integrity * 0.6 + golpe * 3.2
        shard.rotation.z = 0.16 + Math.sin(index * 2.4) * damage * 0.25
        shard.position.y = 0.56 - (index % 3) * damage * 0.04
      }
    }
    if (shock.current) {
      // Onda que sale de la base y se desvanece.
      const material = shock.current.material as MeshBasicMaterial
      material.opacity = golpe * 0.55
      shock.current.scale.setScalar(0.6 + (1 - golpe) * 2.4)
      shock.current.visible = !collapse && golpe > 0.01
    }
    // La intensidad 5 teñía las piedras renovadas de un oro plano. La energía queda en los cristales; la piedra sigue recibiendo sol.
    if (nexusLight.current) nexusLight.current.intensity = collapse ? 0
      : terrainStyle === 'stone' || terrainStyle === 'basalt' || terrainStyle === 'moss' || terrainStyle === 'sand' || terrainStyle === 'ice' || terrainStyle === 'forest' || terrainStyle === 'tide' || terrainStyle === 'forge' || terrainStyle === 'glaze' || terrainStyle === 'sandstone' ? 0.65 + integrity * 0.35 + golpe * 1.4 : 3.5 + integrity * 1.5
  })

  return (
    <group position={[0, 0, z]}>
      {/* Onda expansiva del impacto, a ras de suelo. */}
      <mesh ref={shock} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 0.95, 40]} />
        <meshBasicMaterial color={mine ? '#ff9a5a' : '#8fdcff'} transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={structure}>
      {/* El bronce rugoso del Gremio quedaba casi negro con intensidad1.
          Recibe el mismo entorno2,2 que el hierro; no añadir emisión plana. */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.98, 1.2, 0.22, 8]} />
        <meshStandardMaterial map={stoneMap} bumpMap={nexusMetal?.bumpMap ?? stoneMap} roughnessMap={nexusMetal?.roughnessMap} bumpScale={nexusMetal ? 0.012 : 0.035} color={stone.base} roughness={0.9} metalness={nexusMetal ? 0.55 : 0.04} envMapIntensity={nexusMetal ? 2.2 : 1} emissive="#0a0e18" emissiveIntensity={nexusMetal ? 0 : 0.15} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.82, 0.3, 8]} />
        <meshStandardMaterial map={stoneMap} bumpMap={nexusMetal?.bumpMap ?? stoneMap} roughnessMap={nexusMetal?.roughnessMap} bumpScale={nexusMetal ? 0.012 : 0.035} color={stone.shaft} roughness={0.82} metalness={nexusMetal ? 0.55 : 0.04} envMapIntensity={nexusMetal ? 2.2 : 1} emissive="#0c1120" emissiveIntensity={nexusMetal ? 0 : 0.15} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.74, 0.6, 0.12, 8]} />
        <meshStandardMaterial map={stoneMap} roughnessMap={nexusMetal?.roughnessMap} color={stone.crown} roughness={0.7} metalness={nexusMetal ? 0.6 : 0.04} envMapIntensity={nexusMetal ? 2.2 : 1} emissive={ringEmissive} emissiveIntensity={nexusMetal ? 0.08 : 0.15 + integrity * 0.2} />
      </mesh>
      <NexusFractures damage={damage} />
      {/* Corona de esquirlas de cristal alrededor del borde del pedestal. */}
      <group ref={crystals}>
      {[...Array(8).keys()].map((index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.66, 0.56, Math.sin(angle) * 0.66]} rotation={[0, -angle, 0.16]}>
            <coneGeometry args={[0.07, 0.24, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.3} metalness={0.04} />
          </mesh>
        )
      })}
      </group>
      </group>
      {decorReady && !collapse?.settled && <NexusCrown color={color} damage={damage} hitAt={hitAt} collapsing={Boolean(collapse)} reducedMotion={reducedMotion} />}
      {collapse && <NexusRupture key={collapse.id} durationMs={collapse.durationMs} tone={color}
        stoneColors={[stone.base, stone.shaft, stone.crown]} reducedMotion={reducedMotion || Boolean(collapse.settled)} />}
      {/* Volumen invisible: conserva el clic/hover en 3D sin gastar una textura. */}
      <mesh
        position={[0, 0.66, 0]}
        visible={false}
        onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onClick() }}
        onPointerEnter={() => { setHovered(true); onHover?.(playerId) }}
        onPointerLeave={() => { setHovered(false); onHover?.(undefined) }}
      >
        <boxGeometry args={[0.9, 0.5, 1.1]} />
      </mesh>
      <Html ref={portraitLabel} center position={[0, 0.66, 0]} distanceFactor={6.5} zIndexRange={[14, 0]} className={styles.nexusCard}>
        <div data-targetable={targetable || undefined} data-hit={justHit || undefined} data-integrity={damage > 0.65 ? 'critical' : damage > 0.2 ? 'wounded' : undefined}
          data-collapsed={collapse ? true : undefined} data-reduced-motion={reducedMotion || collapse?.settled || undefined}
          style={collapse ? { '--rupture-duration': `${collapse.durationMs}ms` } as CSSProperties : undefined}>
          <img src={withBase(commanderArt)} alt="" />
        </div>
      </Html>
      <Html center position={[0, 1.28, 0]} distanceFactor={7} zIndexRange={[14, 0]} className={styles.nexusLabel}>
        <div data-targetable={targetable || undefined} data-fallen={collapse ? true : undefined}>{mine ? 'TU NEXO' : 'NEXO RIVAL'} · {collapse ? 'CAÍDO' : health}</div>
      </Html>
      {previewLines && previewLines.length > 0 && (
        <Html center position={[0, 1.7, 0]} distanceFactor={7} zIndexRange={[15, 0]} className={styles.attackPreview}>
          <VerdictBadges verdicts={previewLines} />
        </Html>
      )}
      <pointLight ref={nexusLight} position={[0, 1.1, 0]} color={color} intensity={5} distance={4} decay={2} />
    </group>
  )
}

/** Sacudida sutil de cámara en los golpes al Nexo. Respeta el movimiento reducido. */
/**
 * CAMERA_FOV/CAMERA_POSITION se afinaron mirando una pantalla ancha (desktop):
 * a ese aspect ratio el tablero llena el encuadre sin recortarse. En un móvil
 * en vertical el aspect ratio es muy estrecho (p. ej. 0.46) y una cámara en
 * perspectiva a esa misma distancia y FOV recorta los lados del tablero — solo
 * se ve entero si el jugador aleja la cámara a mano.
 *
 * En vertical sobra alto de sobra (la pantalla es más alta que ancha), así que
 * en vez de alejar la cámara (que encoge el tablero en pantalla) se acerca
 * (MOBILE_DISTANCE, menor que la distancia de escritorio) para que el tablero
 * se vea grande, y se ensancha el FOV vertical lo justo para que ese ancho
 * quepa entero a esa distancia más corta — el hueco vertical de sobra que deja
 * un FOV más ancho es justo el que regala una pantalla vertical.
 */
/**
 * Puntos que el encuadre debe contener sí o sí.
 *
 * Es una lista y no una caja a propósito: una caja obliga a meter en cuadro
 * las cuatro esquinas a la altura del Nexo, donde no hay absolutamente nada, y
 * eso empujaba la cámara casi un metro más atrás encogiendo el tablero un 8%
 * para nada. Aquí las esquinas del tablero solo piden el alto de una unidad
 * de pie, y los Nexos —que solo ocupan el centro en X— piden su altura
 * completa únicamente ahí.
 */
const FRAME_POINTS: readonly (readonly [number, number, number])[] = (() => {
  const points: [number, number, number][] = []
  const edge = BOARD_WORLD_HALF + 0.15
  /** Alto de una unidad de pie con su chapa de nombre encima. */
  const pieceTop = 1.05
  for (const x of [-edge, edge]) {
    for (const z of [-edge, edge]) {
      for (const y of [0, pieceTop]) points.push([x, y, z])
    }
  }
  const nexusZ = Math.abs(nexusWorldZ('player')) + 0.3
  for (const x of [-0.75, 0.75]) {
    for (const z of [-nexusZ, nexusZ]) {
      for (const y of [0, 1.45]) points.push([x, y, z])
    }
  }
  return points
})()
/** Aire alrededor del tablero: 1 = pegado al borde exacto. */
const FRAME_MARGIN = 1.05
/** FOV vertical máximo en pantallas muy estrechas, antes de que deforme. */
const MOBILE_FOV_MAX = 82

/**
 * Distancia mínima (a lo largo de la dirección de cámara) para que todos los
 * FRAME_POINTS entren en el encuadre.
 *
 * Antes esto eran dos casos cosidos a mano —un encuadre fijo para escritorio y
 * un apaño para móvil vertical—, y el fijo se quedaba corto: el Nexo propio
 * salía cortado por abajo. Aquí se calcula de verdad: para una cámara a
 * distancia `d` sobre una dirección fija, cada punto P impone
 * `d >= dot(P-objetivo, dir) + max(|x|/tanH, |y|/tanV)` en coordenadas de
 * cámara. El máximo sobre todos los puntos es la distancia buscada, exacta
 * para cualquier proporción de pantalla.
 */
const frameBasis = () => {
  const target = new Vector3(...CAMERA_TARGET)
  const dir = new Vector3(...CAMERA_POSITION).sub(target).normalize()
  const right = new Vector3(0, 1, 0).cross(dir).normalize()
  const up = new Vector3().copy(dir).cross(right).normalize()
  return { target, dir, right, up }
}

const fitDistance = (fovDegrees: number, aspect: number): number => {
  const { target, dir, right, up } = frameBasis()
  const tanV = Math.tan(MathUtils.degToRad(fovDegrees) / 2)
  const tanH = tanV * aspect
  let needed = 0
  for (const point of FRAME_POINTS) {
    const relative = new Vector3(...point).sub(target)
    const lateral = Math.abs(relative.dot(right)) / tanH
    const vertical = Math.abs(relative.dot(up)) / tanV
    needed = Math.max(needed, relative.dot(dir) + Math.max(lateral, vertical) * FRAME_MARGIN)
  }
  return needed
}

/** La otra cara del cálculo: ángulo mínimo para que todo quepa SIN alejarse más. */
const fitFov = (distance: number, aspect: number): number => {
  const { target, dir, right, up } = frameBasis()
  let tanV = 0
  for (const point of FRAME_POINTS) {
    const relative = new Vector3(...point).sub(target)
    const depth = distance - relative.dot(dir)
    if (depth <= 0.1) return MOBILE_FOV_MAX
    tanV = Math.max(
      tanV,
      (Math.abs(relative.dot(up)) * FRAME_MARGIN) / depth,
      (Math.abs(relative.dot(right)) * FRAME_MARGIN) / (depth * aspect),
    )
  }
  return MathUtils.radToDeg(Math.atan(tanV) * 2)
}

function ResponsiveCamera() {
  // Se aplica desde useFrame (no useEffect+useThree) a propósito: mutar
  // directamente el objeto `camera` que devuelve el hook useThree() choca con
  // la regla de lint react-hooks/immutability. Tomarlo del parámetro de
  // useFrame (como ya hace CameraRig más abajo) es el escape hatch estándar
  // de R3F para este tipo de mutación imperativa; la comparación con
  // appliedKey evita recalcular en cada frame, solo cuando cambia el tamaño.
  const appliedKey = useRef<string | null>(null)
  useFrame(({ camera, size, gl }) => {
    if (!(camera instanceof ThreePerspectiveCamera)) return
    const key = `${size.width}x${size.height}`
    if (appliedKey.current === key) return
    appliedKey.current = key
    // El escenario llega bajo los paneles, pero las esquinas jugables siguen
    // pidiendo el mismo ancho seguro que cuando el lienzo acababa junto a ellos.
    const inset = Number.parseFloat(getComputedStyle(gl.domElement).getPropertyValue('--scene-bleed')) || 0
    const aspect = Math.max(1, size.width - inset * 2) / size.height
    // Se prefiere SIEMPRE el ángulo estrecho por defecto y ajustar la
    // distancia: un ángulo ancho encoge todo lo que hay en pantalla. Solo si
    // ni retrocediendo al máximo cabe el tablero —el caso del móvil en
    // vertical, donde el ancho es lo que aprieta— se abre el ángulo, y solo
    // lo justo. Medido: en vertical, abrir el ángulo «porque sobra alto»
    // dejaba las casillas en 11 px; así se quedan en 17.
    let fov = CAMERA_FOV
    let distance = fitDistance(fov, aspect)
    if (distance > CAMERA_MAX_DISTANCE) {
      distance = CAMERA_MAX_DISTANCE
      fov = MathUtils.clamp(fitFov(distance, aspect), CAMERA_FOV, MOBILE_FOV_MAX)
    }
    distance = MathUtils.clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)
    const { target, dir } = frameBasis()
    camera.fov = fov
    camera.position.copy(target).addScaledVector(dir, distance)
    camera.updateProjectionMatrix()
  }, -0.75)
  return null
}

/**
 * Antes solo sacudía la cámara con el golpe al Nexo o un golpe de 4+ de
 * daño: la inmensa mayoría de los combates (la mayoría de las unidades
 * pegan 1-3) no sacudían nada, así que un ataque normal se sentía exigido
 * igual que antes de cualquier mejora. Ahora CUALQUIER daño sacude un poco,
 * y la magnitud crece con la cantidad — un golpazo se siente claramente más
 * fuerte que un pinchazo sin dejar de notarse ninguno de los dos.
 */
function CameraRig({ event, reducedMotion }: { event?: AnimationEvent; reducedMotion: boolean }) {
  const shakeStart = useRef(-10)
  const shakeMagnitude = useRef(0.05)
  const base = useRef(new Vector3())
  const captured = useRef(false)
  useEffect(() => {
    if (!event) return
    if (event.type === 'victory') {
      shakeStart.current = -10
      captured.current = false
    } else if (event.type === 'nexus-damage') {
      shakeStart.current = performance.now()
      shakeMagnitude.current = 0.09
    } else if (event.type === 'damage' && (event.amount ?? 0) > 0) {
      shakeStart.current = performance.now()
      shakeMagnitude.current = 0.03 + Math.min(1, (event.amount ?? 0) / 6) * 0.06
    } else if (event.type === 'spell' && /^commander-[a-z]+-power$/.test(event.effectId ?? '')) {
      // El poder de comandante también sacude un poco, a juego con el
      // destello más fuerte que le da ImpactBurst — es un momento raro
      // (una o dos veces por partida) y merece sentirse especial.
      shakeStart.current = performance.now()
      shakeMagnitude.current = 0.06
    }
  }, [event])
  useFrame(({ camera }) => {
    if (reducedMotion) return
    const since = (performance.now() - shakeStart.current) / 1000
    if (since > 0.5) {
      captured.current = false
      return
    }
    if (!captured.current) {
      base.current.copy(camera.position)
      captured.current = true
    }
    const decay = (1 - since / 0.5) * shakeMagnitude.current
    camera.position.set(
      base.current.x + (Math.random() - 0.5) * decay,
      base.current.y + (Math.random() - 0.5) * decay,
      base.current.z + (Math.random() - 0.5) * decay,
    )
  }, -0.6)
  return null
}

/**
 * Acercamiento breve de cámara en cada ataque. Usa `camera.zoom` y no la
 * posición: así no pelea con el encuadre calculado por ResponsiveCamera ni
 * con la sacudida de CameraRig, que sí mueven la posición. Un 7 % basta para
 * que el golpe «tire» de la vista; con un 15 % las esquinas del tablero se
 * salían de cuadro a 1366 × 768.
 */
const COMBAT_PUNCH = 0.07
function CombatPunch({ event, reducedMotion }: { event?: AnimationEvent; reducedMotion: boolean }) {
  const start = useRef<{ at: number; durationMs: number } | null>(null)
  useEffect(() => {
    // También la entrada de una mítica: llega con un rayo y la cámara se acerca.
    const mythicArrival = event?.type === 'summon' && event.cardId && CARD_BY_ID[event.cardId]?.rarity === 'mythic'
    if (event?.type === 'attack' || mythicArrival) start.current = { at: performance.now(), durationMs: Math.max(200, event!.durationMs) }
  }, [event])
  useFrame(({ camera }) => {
    if (!(camera instanceof ThreePerspectiveCamera)) return
    const run = start.current
    if (reducedMotion || !run) {
      if (camera.zoom !== 1) {
        camera.zoom = 1
        camera.updateProjectionMatrix()
      }
      return
    }
    const progress = (performance.now() - run.at) / run.durationMs
    if (progress >= 1) {
      start.current = null
      camera.zoom = 1
      camera.updateProjectionMatrix()
      return
    }
    // Entra rápido y sale despacio: el pico coincide con la embestida.
    const shape = progress < 0.35 ? Math.sin((progress / 0.35) * Math.PI / 2) : Math.cos(((progress - 0.35) / 0.65) * Math.PI / 2)
    camera.zoom = 1 + COMBAT_PUNCH * shape
    camera.updateProjectionMatrix()
  }, -0.55)
  return null
}

/**
 * Cámara que acompaña la acción: en cada jugada importante el encuadre se
 * desliza un poco hacia donde ocurre y vuelve. Usa `setViewOffset` (desplaza
 * el recorte de la imagen) en vez de mover la cámara, para no pelear con los
 * controles de órbita ni con el encuadre que elige el jugador.
 */
const ACTION_PAN = 0.11
function ActionCamera({ event, reducedMotion }: { event?: AnimationEvent; reducedMotion: boolean }) {
  const run = useRef<{ at: number; durationMs: number; point: Vector3 } | null>(null)
  const offset = useRef(new Vector2())
  const projected = useMemo(() => new Vector3(), [])
  useEffect(() => {
    if (!event?.to) return
    const important = event.type === 'attack' || event.type === 'destroy' || event.type === 'summon' || Boolean(event.cast)
    if (!important) return
    run.current = { at: performance.now(), durationMs: Math.max(600, event.durationMs * 1.6), point: new Vector3(boardX(event.to.x), 0.4, boardZ(event.to.y)) }
  }, [event])
  useFrame(({ camera, size }, delta) => {
    if (!(camera instanceof ThreePerspectiveCamera)) return
    const active = run.current
    let wantX = 0
    let wantY = 0
    if (active && !reducedMotion) {
      const progress = (performance.now() - active.at) / active.durationMs
      if (progress >= 1) run.current = null
      else {
        // Va hacia la acción y vuelve: pico en el primer tercio.
        const shape = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7
        projected.copy(active.point).project(camera)
        wantX = projected.x * size.width * 0.5 * ACTION_PAN * shape
        wantY = -projected.y * size.height * 0.5 * ACTION_PAN * shape
      }
    }
    const current = offset.current
    current.x = MathUtils.damp(current.x, wantX, 5, delta)
    current.y = MathUtils.damp(current.y, wantY, 5, delta)
    if (Math.abs(current.x) < 0.2 && Math.abs(current.y) < 0.2 && !run.current) {
      if (camera.view?.enabled) camera.clearViewOffset()
      return
    }
    camera.setViewOffset(size.width, size.height, current.x, current.y, size.width, size.height)
  }, -0.5)
  return null
}

/**
 * Casilla sobre la que se está soltando una carta arrastrada desde la mano.
 *
 * Lo calcula por su cuenta en vez de fiarse del `hover` de las casillas: el
 * gesto empieza en un elemento HTML fuera del lienzo, y en ese caso react-three
 * no llega a emitir los eventos de entrada/salida sobre las mallas, así que el
 * tablero nunca se enteraba de dónde estaba el puntero. Aquí se lanza un rayo
 * contra el plano del suelo y se traduce el punto a coordenadas de casilla.
 */
function DropTargeting({ active, localPlayerId, onCell }: { active: boolean; localPlayerId: PlayerId; onCell: (position?: Position) => void }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    if (!active) return
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    const ground = new Plane(new Vector3(0, 1, 0), 0)
    const hit = new Vector3()
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) {
        onCell(undefined)
        return
      }
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectPlane(ground, hit)) {
        onCell(undefined)
        return
      }
      // El invitado ve la escena girada 180°: el punto del mundo hay que
      // deshacerle ese giro antes de traducirlo a casilla.
      const flip = localPlayerId === 'ai' ? -1 : 1
      onCell(worldToGrid(hit.x * flip, hit.z * flip))
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      onCell(undefined)
    }
  }, [active, camera, gl, localPlayerId, onCell])
  return null
}

/** Base mínima mientras el GLB de Aether Citadel se descarga. */
function LoadingStage() {
  return (
    <>
      <ambientLight intensity={1.3} color="#aeb9d8" />
      <mesh position={[0, -0.58, 0]}>
        <boxGeometry args={[11.6, 1.1, 11.6]} />
        <meshStandardMaterial color="#5f6577" roughness={0.9} />
      </mesh>
    </>
  )
}

function Scene(props: Board3DProps) {
  const decorReady = useDeferredDecor()
  // Conjuntos O(1) precalculados una vez por cambio de estado: evitan el
  // barrido .some() por cada una de las 64 casillas en cada render.
  const validSet = useMemo(() => new Set(props.validCells.map(cellKey)), [props.validCells])
  const occupiedSet = useMemo(() => new Set(props.state.board.map((piece) => cellKey(piece.position))), [props.state.board])
  const scorchedSet = useMemo(
    () => new Set(props.state.tileEffects.filter((tile) => tile.kind === 'scorched').map((tile) => cellKey(tile.position))),
    [props.state.tileEffects],
  )
  // Terreno del mapa: parte fija del campo, no un efecto pasajero.
  const rubbleSet = useMemo(
    () => new Set(props.state.terrain.filter((tile) => tile.kind === 'rubble').map((tile) => cellKey(tile.position))),
    [props.state.terrain],
  )
  const coverSet = useMemo(
    () => new Set(props.state.terrain.filter((tile) => tile.kind === 'cover').map((tile) => cellKey(tile.position))),
    [props.state.terrain],
  )
  const targetSet = useMemo(() => new Set(props.validTargets), [props.validTargets])
  /**
   * Casillas que una unidad rival ya alcanza desde donde está: pisar ahí es
   * ofrecerse a que te golpeen. Antes esto solo se podía deducir contando
   * casillas a mano, carta por carta.
   *
   * Es una lectura geométrica (distancia Manhattan ≤ Alcance), no una
   * simulación del turno rival: no descuenta Guardias ni caminos bloqueados,
   * pero como aviso de «aquí te ven» acierta en lo que importa y se recalcula
   * gratis. Deliberadamente NO incluye a dónde podrían moverse antes de
   * atacar: marcaría medio tablero y dejaría de decir nada.
   */
  const threatenedSet = useMemo(() => {
    const cells = new Set<string>()
    for (const piece of props.state.board) {
      if (piece.owner === props.localPlayerId) continue
      const definition = CARD_BY_ID[piece.cardId]
      if (definition?.type !== 'unit' || definition.attack === undefined) continue
      const range = definition.range ?? 1
      for (let dx = -range; dx <= range; dx += 1) {
        for (let dy = -range; dy <= range; dy += 1) {
          const steps = Math.abs(dx) + Math.abs(dy)
          if (steps === 0 || steps > range) continue
          const x = piece.position.x + dx
          const y = piece.position.y + dy
          if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) continue
          cells.add(`${x},${y}`)
        }
      }
    }
    return cells
  }, [props.state.board, props.localPlayerId])
  const ownDeployRow = props.localPlayerId === 'player' ? BOARD_SIZE - 1 : 0
  const terrainStyle = TERRAIN_STYLE[props.scenario as Exclude<ScenarioId, 'auto'>] ?? 'stone'
  const faction = factionForScenario(props.scenario)
  const floor = faction ? FACTION_FLOORS[faction] : undefined

  /**
   * Quién se mueve en el golpe que está sonando ahora: el atacante embiste
   * hacia su objetivo y el que lo recibe retrocede. Solo las dos fichas
   * implicadas reciben una prop distinta, así que el resto no se
   * re-renderiza (`BoardCard` está memoizada).
   */
  const impulses = useMemo(
    () => impulsesForEvent(props.activeEvent, props.state.board),
    [props.activeEvent, props.state.board],
  )
  const waitingSummons = useMemo(() => new Set((props.pendingEvents ?? EMPTY_EVENTS)
    .filter((event) => event.type === 'summon').map((event) => event.targetId)), [props.pendingEvents])
  const terminal = Boolean(props.state.winner) && !props.activeEvent && (props.pendingEvents?.length ?? 0) === 0
  return (
    <>
      {/* Todo el contenido jugable gira 180° cuando el invitado ('ai') mira la
          escena: así su propio Nexo queda cerca de la cámara, igual que le
          pasa al anfitrión con el suyo. La cámara y sus controles no son
          hijos de este grupo, así que el punto de vista real no se mueve. */}
      <MaterialEnvironment quality={props.quality} />
      <ScenarioAtmosphere scenario={props.scenario} />
      {/* El tejado de Jade tapaba el Nexo del invitado al girar también el
          decorado. La arquitectura conserva la composición de cámara; solo
          el contenido táctico cambia de orientación para cada jugador. */}
      <BattleClimateProvider strain={battleStrain(props.state.turn, [
        { health: props.state.players.player.nexusHealth, maxHealth: COMMANDER_BY_ID[props.state.players.player.commanderId]?.nexusHealth ?? 35 },
        { health: props.state.players.ai.nexusHealth, maxHealth: COMMANDER_BY_ID[props.state.players.ai.commanderId]?.nexusHealth ?? 35 },
      ])}>
      <group name="scenario-stage">
      <Suspense fallback={<LoadingStage />}>
        {isFactionStage(props.scenario) ? (
          <FactionStage scenario={props.scenario} quality={props.quality} reducedMotion={props.reducedMotion} />
        ) : props.scenario === 'aether-citadel' ? (
          <AetherCitadel quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'caldera' ? (
          <CalderaScenario quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'duna' ? (
          <DunaNecropolis quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'fimbul' ? (
          <FimbulFjord quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'wheel-ghat' ? (
          <WheelGhat quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'jade-court' ? (
          <JadeCourt quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'foundry' ? (
          <ForgeYard quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'shore' ? (
          <TidalShore quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'solar-court' ? (
          <SolarCourt quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'bestiary-ravine' ? (
          <BestiaryRavine quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : props.scenario === 'grove' ? (
          <VerdantGrove quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        ) : (
          <SanctuaryScenario quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} />
        )}
      </Suspense>
      </group>
      {/* Clima, luz de tensión, criaturas lejanas y cicatrices: dentro del
          proveedor de clima porque leen su tensión. */}
      {decorReady && <BattleSkies style={terrainStyle} quality={props.quality} reducedMotion={props.reducedMotion} event={props.activeEvent} turn={props.state.turn} />}
      </BattleClimateProvider>
      <group name="battle-view" rotation={[0, props.localPlayerId === 'ai' ? Math.PI : 0, 0]}>
      <BoardRim style={terrainStyle} />
      <RitualSeal cell={{ x: 3, y: 4 }} tone="#ffffff" durationMs={1} reducedMotion={false} warmup />
      {CELL_POSITIONS.map((position) => {
        const key = cellKey(position)
        return (
          <BoardCell
            key={key}
            position={position}
            valid={validSet.has(key)}
            hazard={props.photoMode ? undefined : props.movementHazards?.get(key)}
            occupied={occupiedSet.has(key)}
            scorched={scorchedSet.has(key)}
            rubble={rubbleSet.has(key)}
            cover={coverSet.has(key)}
            terrainStyle={terrainStyle}
            floor={floor}
            organicForest={props.scenario === 'grove'}
            own={isOwnHalf(position.y, props.localPlayerId)}
            deployRow={position.y === ownDeployRow}
            threatened={!occupiedSet.has(key) && threatenedSet.has(key)}
            intent={props.cellIntent}
            colorblindMode={props.colorblindMode}
            reducedMotion={props.reducedMotion}
            onCell={props.onCell}
            onHover={props.onCellHover}
          />
        )
      })}
      {props.cursorCell && <CursorMarker position={props.cursorCell} reducedMotion={props.reducedMotion} hazard={props.movementHazards?.get(cellKey(props.cursorCell))} />}
      {/* En la Caldera, la costura es un río de lava que parte el tablero. */}
      {props.scenario === 'caldera' ? <Suspense fallback={<Midline terrainStyle={terrainStyle} />}><LavaRiver reducedMotion={props.reducedMotion} /></Suspense> : <Midline terrainStyle={terrainStyle} />}
      {decorReady && <FactionFrame
        factions={{
          player: COMMANDER_BY_ID[props.state.players.player.commanderId]?.faction,
          ai: COMMANDER_BY_ID[props.state.players.ai.commanderId]?.faction,
        }}
        reducedMotion={props.reducedMotion}
      />}
      <BoardAtmosphere terrainStyle={terrainStyle} quality={props.quality} reducedMotion={props.reducedMotion} />
      {/* Y encima, lo que se mueve con dirección: la brasa sube, la nieve cae
          de lado, la hoja baja dando tumbos. `BoardAtmosphere` solo titila en
          el sitio; esto es lo que hace que el aire del sitio se note. */}
      <BoardDrift terrainStyle={terrainStyle} quality={props.quality} reducedMotion={props.reducedMotion} />
      <Suspense fallback={null}>
        {props.state.board.map((piece) => (
          <BoardCard
            key={piece.instanceId}
            deploying={props.cellIntent === 'deploy' && props.validCells.length > 0}
            piece={piece}
            runo={props.state.players[piece.owner].runo ?? 0}
            formationBonus={formationAttackBonus(props.state, piece)}
            selected={piece.instanceId === props.selectedPieceId}
            targetable={targetSet.has(piece.instanceId)}
            ready={props.readyPieceIds.has(piece.instanceId)}
            active={piece.owner === props.state.activePlayer}
            mine={piece.owner === props.localPlayerId}
            crowded={props.state.board.some((other) => other.instanceId !== piece.instanceId && Math.abs(other.position.x - piece.position.x) <= 2 && Math.abs(other.position.y - piece.position.y) <= 1)}
            stackSafe={!props.state.board.some((other) => other.instanceId !== piece.instanceId && Math.abs(other.position.x - piece.position.x) <= 1 && Math.abs(other.position.y - piece.position.y) === 1)}
            onPiece={props.onPiece}
            onInspect={props.onInspectPiece}
            onHover={props.onHoverPiece}
            previewLines={props.attackPreview?.targetId === piece.instanceId ? props.attackPreview.target
              : props.attackPreview?.attackerId === piece.instanceId ? props.attackPreview.attacker : undefined}
            reducedMotion={props.reducedMotion}
            impulse={impulses.get(piece.instanceId)}
            impact={props.activeEvent?.targetId === piece.instanceId ? props.activeEvent : undefined}
            arrival={props.activeEvent?.type === 'summon' && props.activeEvent.targetId === piece.instanceId ? props.activeEvent : undefined}
            waiting={waitingSummons.has(piece.instanceId)}
          />
        ))}
      </Suspense>
      <Nexus
        key={`nexus-player-${props.state.seed}`}
        playerId="player"
        mine={props.localPlayerId === 'player'}
        health={props.state.players.player.nexusHealth}
        maxHealth={COMMANDER_BY_ID[props.state.players.player.commanderId]?.nexusHealth ?? 35}
        targetable={props.validTargets.includes('player-nexus')}
        onClick={() => props.onNexus('player')}
        onHover={props.onHoverNexus}
        previewLines={props.attackPreview?.targetId === 'player-nexus' ? props.attackPreview.target : undefined}
        commanderArt={COMMANDER_BY_ID[props.state.players.player.commanderId]?.art.webp ?? '/assets/cards/art/fuente-furia.webp'}
        activeEvent={props.activeEvent}
        terrainStyle={terrainStyle}
        reducedMotion={props.reducedMotion}
        terminal={terminal}
      />
      <Nexus
        key={`nexus-ai-${props.state.seed}`}
        playerId="ai"
        mine={props.localPlayerId === 'ai'}
        health={props.state.players.ai.nexusHealth}
        maxHealth={COMMANDER_BY_ID[props.state.players.ai.commanderId]?.nexusHealth ?? 35}
        targetable={props.validTargets.includes('ai-nexus')}
        onClick={() => props.onNexus('ai')}
        onHover={props.onHoverNexus}
        previewLines={props.attackPreview?.targetId === 'ai-nexus' ? props.attackPreview.target : undefined}
        commanderArt={COMMANDER_BY_ID[props.state.players.ai.commanderId]?.art.webp ?? '/assets/cards/art/fuente-arcana.webp'}
        activeEvent={props.activeEvent}
        terrainStyle={terrainStyle}
        reducedMotion={props.reducedMotion}
        terminal={terminal}
      />
      {props.activeEvent && <EventEffects key={props.activeEvent.id} event={props.activeEvent} reducedMotion={props.reducedMotion} impact={props.castImpact} />}
      <FallenPieces
        event={props.activeEvent}
        pendingEvents={props.pendingEvents ?? EMPTY_EVENTS}
        board={props.state.board}
        localPlayerId={props.localPlayerId}
        reducedMotion={props.reducedMotion}
      />
      <DamageNumbers event={props.activeEvent} reducedMotion={props.reducedMotion} />
      <ImpactMarks event={props.activeEvent} impact={props.castImpact} reducedMotion={props.reducedMotion} />
      <Epitaphs event={props.activeEvent} reducedMotion={props.reducedMotion} />
      {!props.photoMode && <ThreatArrows focus={props.threatFocus} board={props.state.board} nexusZ={nexusWorldZ} reducedMotion={props.reducedMotion} />}
      <TraitFlourishes effects={props.traitFx ?? []} reducedMotion={props.reducedMotion} />
      <RecentHits event={props.activeEvent} reducedMotion={props.reducedMotion} />
      </group>
      <CameraRig event={props.activeEvent} reducedMotion={props.reducedMotion} />
      <CombatPunch event={props.activeEvent} reducedMotion={props.reducedMotion} />
      <ActionCamera event={props.activeEvent} reducedMotion={props.reducedMotion} />
      <ResponsiveCamera />
      <NexusFocus event={props.activeEvent} localPlayerId={props.localPlayerId} reducedMotion={props.reducedMotion} photoMode={props.photoMode} />
      {props.onCellHover && (
        <DropTargeting active={Boolean(props.dragging)} localPlayerId={props.localPlayerId} onCell={props.onCellHover} />
      )}
      {/* Con una carta en la mano siendo arrastrada, orbitar convertiría el
          gesto de soltarla en un giro de cámara. */}
      {/* Modo foto: se sueltan los límites de ángulo/distancia (pensados para
          mantener siempre el tablero legible durante la partida) y se
          permite desplazar la cámara, no solo orbitar. */}
      <OrbitControls
        makeDefault
        enabled={!props.dragging}
        enablePan={Boolean(props.photoMode)}
        enableZoom
        minPolarAngle={props.photoMode ? 0.08 : 0.72}
        maxPolarAngle={props.photoMode ? Math.PI - 0.08 : 1.03}
        minDistance={props.photoMode ? 3 : CAMERA_MIN_DISTANCE}
        maxDistance={props.photoMode ? 26 : CAMERA_MAX_DISTANCE}
        target={[...CAMERA_TARGET]}
      />
    </>
  )
}

export function Board3D(props: Board3DProps) {
  const dpr: [number, number] = props.quality === 'high' ? [1, 2] : props.quality === 'medium' ? [1, 1.5] : [0.75, 1]
  return (
    <div
      className={styles.viewport}
      data-testid="battle-board"
      style={{ '--label-scale': props.boardTextScale ?? 1 } as CSSProperties}
    >
      {/* Con movimiento reducido el campo es estático; tras un modal opaco
          tampoco se ve. Dibujar sin pausa bloqueaba incluso el foco del
          inspector por software. React y OrbitControls invalidan los cambios. */}
      <Canvas style={{ position: 'absolute', left: 'calc(-1 * var(--scene-bleed, 0px))', width: 'calc(100% + 2 * var(--scene-bleed, 0px))' }}
        frameloop={props.reducedMotion || props.renderPaused ? 'demand' : 'always'}
        shadows={props.quality !== 'low'} dpr={dpr} camera={{ position: [...CAMERA_POSITION], fov: CAMERA_FOV }} gl={{ antialias: props.quality !== 'low', alpha: false }}>
        <Scene {...props} />
      </Canvas>
    </div>
  )
}
