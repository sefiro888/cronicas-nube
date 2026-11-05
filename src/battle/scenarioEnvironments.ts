import type { FactionId } from '../game'
import type { ScenarioId } from '../store/preferences'
import { SCENARIO_PRESENTATION } from './scenarioPresentation'

export type SceneId = Exclude<ScenarioId, 'auto'>
export type BorderFamily = 'embers' | 'snow' | 'leaves' | 'motes' | 'dust' | 'spores' | 'spray'
interface SceneIdentity {
  readonly faction: FactionId
  readonly panorama: string
  readonly floor: string
  readonly material: { readonly roughness: number; readonly metalness: number; readonly bumpScale: number; readonly environment: number }
  readonly family: BorderFamily
  readonly lore: string
  readonly details: readonly string[]
}
const stone = { roughness: .87, metalness: .035, bumpScale: .012, environment: .65 }
const marble = { roughness: .66, metalness: .045, bumpScale: .009, environment: .8 }
const metal = { roughness: .72, metalness: .42, bumpScale: .014, environment: .95 }
const wet = { roughness: .57, metalness: .035, bumpScale: .011, environment: .8 }
const identity = (faction: FactionId, panorama: string, floor: string, family: BorderFamily, material: SceneIdentity['material'], lore: string, details: readonly string[]): SceneIdentity => ({ faction, panorama: `/assets/scenarios/${panorama}-vista-v1.webp`, floor: `/assets/terrain/${floor}.webp`, family, material, lore, details })

/** Un catálogo común permite revisar arte y materiales sin cambiar la facción
 * del suelo cuando se escoge un mapa manualmente. */
export const SCENARIO_ENVIRONMENTS: Readonly<Record<SceneId, SceneIdentity>> = {
  'aether-citadel': identity('arcane', 'aether-citadel', 'suelo-arcane-v1', 'motes', marble, 'Las terrazas suspendidas conservan los sellos de quienes estudiaron las corrientes del Nexo. Bajo sus puentes, las nubes ocultan bibliotecas perdidas.', ['Mandala arcano tallado', 'Puentes suspendidos', 'Piedra y bronce celeste']),
  caldera: identity('fury', 'caldera', 'lava-caldera-roca-v1', 'embers', stone, 'La Fragua abre sus puertas al latido de la montaña. Cada grieta guarda el calor de antiguas batallas y cada cadena resuena sobre la lava.', ['Río de lava original', 'Columnas basálticas', 'Yunque y cadenas volcánicas']),
  sanctuary: identity('shadow', 'sanctuary', 'suelo-shadow-v1', 'motes', stone, 'Las piedras del santuario recuerdan nombres que nadie pronuncia. La luz de las runas acompaña a quienes cruzan el umbral entre juramento y sombra.', ['Monolitos rúnicos', 'Piedra púrpura', 'Bruma entre las islas']),
  duna: identity('duna', 'duna', 'suelo-duna-v1', 'dust', stone, 'Los patios funerarios reciben al viajero entre relieves y sombras de obeliscos. Aquí la memoria tiene el peso de una ofrenda.', ['Relieves funerarios propios', 'Obeliscos y necrópolis', 'Arenisca y oro envejecido']),
  fimbul: identity('fimbul', 'fimbul', 'suelo-fimbul-v1', 'snow', { ...wet, roughness: .62 }, 'Los cascos antiguos yacen presos en el hielo del fiordo. Las runas azules arden bajo la nieve mientras el invierno exige valor a sus guardianes.', ['Runas bajo el hielo', 'Drakkar encallado', 'Glaciares del fiordo']),
  grove: identity('nature', 'grove', 'suelo-nature-v1', 'leaves', stone, 'Las raíces enlazan las piedras del claro con un bosque más antiguo que las crónicas. Cada hoja sigue la respiración de los árboles.', ['Raíces entre las losas', 'Dosel vivo', 'Hongos y hojas en la orla']),
  shore: identity('marea', 'shore', 'suelo-marea-v1', 'spray', wet, 'El mar pule el basalto de la rompiente y deja conchas en sus heridas. El faro de hueso vigila las rutas que solo revela la marea.', ['Faro de hueso', 'Basalto costero', 'Mar y espuma exterior']),
  foundry: identity('forja', 'foundry', 'suelo-forja-v1', 'embers', metal, 'La fundición nunca duerme. Entre hierro remachado y hornos encendidos, el gremio mide el mundo por el ritmo de sus martillos.', ['Suelo de hierro y horno', 'Maquinaria de fundición', 'Tuberías y acero templado']),
  'jade-court': identity('jade', 'jade', 'suelo-jade-v1', 'leaves', { ...marble, roughness: .58 }, 'Dragones y nubes custodian los jardines del palacio. Sus baldosas de jade reciben las primeras luces sobre los estandartes del Mandato.', ['Dragón del pavimento', 'Palacio y celosías', 'Cerámica verde y oro']),
  'wheel-ghat': identity('samsara', 'wheel', 'suelo-samsara-v2', 'motes', marble, 'Las escalinatas descienden al agua mientras la rueda conserva las huellas de todos los retornos. La luz del alba enciende el mandala del patio.', ['Mandala propio de Samsara', 'Escalinatas sobre el agua', 'Pabellones y rueda sagrada']),
  'solar-court': identity('sol', 'sol', 'suelo-sol-v2', 'dust', stone, 'El patio recibe el paso del sol entre piedra verde y pigmentos vivos. La arquitectura custodia la cuenta de los días y el pulso de las ofrendas.', ['Pavimento propio del Quinto Sol', 'Recinto ceremonial', 'Piedra, jade y pigmentos']),
  'bestiary-ravine': identity('bestiario', 'bestiary', 'suelo-bestiario-v1', 'dust', stone, 'Los vestigios de bestias colosales sobresalen de la caliza. Cada grieta de la garganta recuerda la fuerza que abrió sus paredes.', ['Piedra moteada propia', 'Vestigios colosales', 'Garganta de caliza']),
  'bastion-alba': identity('order', 'bastion-alba', 'suelo-order-v1', 'motes', marble, 'Los vitrales del bastión convierten la primera luz en juramentos de oro. Sus guardianes velan junto al patio de mármol donde se forman las filas.', ['Mármol cálido de Orden', 'Vitrales originales', 'Fortaleza y sellos solares']),
  'acropolis-olimpo': identity('olimpo', 'acropolis-olimpo', 'suelo-olimpo-v1', 'dust', stone, 'El santuario se alza sobre el Egeo, entre columnas y roca antigua. El ocaso revela en sus cornisas las historias de quienes desafiaron a los dioses.', ['Piedra propia de Olimpo', 'Templos sobre el Egeo', 'Columnas y grecas de bronce']),
  'baluarte-tercios': identity('tercios', 'baluarte-tercios', 'suelo-tercios-v1', 'dust', stone, 'El fortín guarda el horizonte con madera reforzada y piedra castigada. A sus pies, las marcas del camino sobreviven al humo de los cañones.', ['Tablas y piedra del fortín', 'Carros de artillería', 'Baluarte castellano']),
  'umbral-vacio': identity('void', 'umbral-vacio', 'suelo-void-v1', 'motes', { ...stone, metalness: .12 }, 'Los fragmentos del umbral flotan donde el espacio dejó de obedecer. La luz violeta de las fracturas dibuja caminos que no existían un instante antes.', ['Suelo púrpura fracturado', 'Arcos suspendidos', 'Cristales del abismo']),
  'cripta-plaga': identity('plaga', 'cripta-plaga', 'suelo-plaga-v1', 'spores', wet, 'El agua estancada recoge el eco de la necrópolis. Entre piedras húmedas y fisuras verdes, una vida obstinada devora los antiguos sellos.', ['Losas húmedas propias', 'Cripta y mausoleos', 'Esporas en los márgenes']),
  'desguace-goblin': identity('goblins', 'desguace-goblin', 'suelo-goblins-v1', 'embers', metal, 'Las vías del barranco desaparecen bajo piezas que esperan un nuevo invento. Una lámpara chispeante basta para poner el desguace entero en movimiento.', ['Vías y residuos alquímicos', 'Engranajes de chatarra', 'Lámparas chispeantes']),
  'lago-kalevala': identity('kalevala', 'lago-kalevala', 'suelo-kalevala-v1', 'snow', wet, 'El Sampo canta sobre el agua azul del santuario. Las runas del pavimento acompañan a las costas de granito y a los pinos del crepúsculo.', ['Runas propias de Kalevala', 'Lago y costas de granito', 'Sampo y pinos nórdicos']),
}

export function scenarioMaterialForFloor(floor: string) {
  return Object.values(SCENARIO_ENVIRONMENTS).find((profile) => profile.floor.endsWith(`/${floor}`))?.material ?? stone
}
export const SCENARIO_ATLAS = Object.entries(SCENARIO_ENVIRONMENTS).map(([id, environment]) => ({ id: id as SceneId, ...SCENARIO_PRESENTATION[id as SceneId], ...environment }))
