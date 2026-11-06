import type { FactionId } from '../game'

/** Contorno compartido por la corona 3D y el relieve de duelo, en un plano
 * de −1 a +1. El hueco de las piezas anulares es geometría real. */
export const NEXUS_FORMS = {
  fury: { name: 'Corazón de la Caldera', tint: '#ff702c', metal: '#61342e', outline: '-1,-.7 -.8,.1 -.5,-.05 -.53,.72 -.12,.35 .17,1 .32,.28 .73,.61 .68,.03 1,-.42 .63,-.86 -.58,-.91' },
  arcane: { name: 'Prisma del Éter', tint: '#6bc9ff', metal: '#3b6490', outline: '0,1 .44,.59 .95,.3 .67,-.18 .5,-.64 0,-1 -.5,-.64 -.67,-.18 -.95,.3 -.44,.59' },
  nature: { name: 'Semilla Primigenia', tint: '#b3e674', metal: '#415b35', outline: '-.83,-.7 -.96,-.28 -.86,.21 -.58,.51 -.23,.51 .2,1 .68,.69 .91,.23 .88,-.27 .57,-.74 .03,-1' },
  order: { name: 'Custodia del Alba', tint: '#ffe098', metal: '#a87643', outline: '-.92,.56 -.65,.78 -.24,.79 0,1 .24,.79 .65,.78 .92,.56 .82,-.27 .51,-.65 0,-1 -.51,-.65 -.82,-.27' },
  shadow: { name: 'Portal del Claustro', tint: '#b885e8', metal: '#4e355d', hole: .31, outline: '-.97,-.9 -.97,.36 -.67,.67 -.35,.8 0,1 .35,.8 .67,.67 .97,.36 .97,-.9 .57,-.7 -.57,-.7' },
  void: { name: 'Ojo de la Fractura', tint: '#ba68ff', metal: '#4e3775', hole: .37, outline: '-1,.24 -.77,.7 -.38,.94 .13,.78 .57,1 .77,.54 1,.2 .74,-.09 .9,-.54 .39,-.91 .02,-.71 -.52,-1 -.73,-.59 -.96,-.25' },
  duna: { name: 'Obelisco del Tribunal', tint: '#f5bd62', metal: '#a26945', outline: '0,1 .33,.66 .48,-.56 .77,-.68 .93,-.91 -.93,-.91 -.77,-.68 -.48,-.56 -.33,.66' },
  fimbul: { name: 'Monolito del Invierno', tint: '#91e6ff', metal: '#436883', outline: '-1,-.81 -.8,-.1 -.59,-.31 -.46,.54 -.12,1 .13,.54 .47,.77 .62,.1 .91,.32 1,-.82 .35,-.93 -.47,-1' },
  samsara: { name: 'Rueda de los Retornos', tint: '#ffa875', metal: '#9d563f', hole: .43, outline: '0,1 .21,.76 .67,.79 .7,.47 1,.16 .8,-.15 .83,-.59 .48,-.67 .18,-1 -.14,-.81 -.6,-.83 -.66,-.49 -1,-.17 -.79,.17 -.78,.61 -.42,.66' },
  jade: { name: 'Disco del Mandato', tint: '#59e3aa', metal: '#488767', hole: .42, outline: '0,1 .5,.87 .87,.5 1,0 .87,-.5 .5,-.87 0,-1 -.5,-.87 -.87,-.5 -1,0 -.87,.5 -.5,.87' },
  olimpo: { name: 'Trono del Trueno', tint: '#abbcff', metal: '#8a7880', outline: '0,1 .98,.44 .75,.23 .67,-.48 .92,-.63 .92,-.89 -.92,-.89 -.92,-.63 -.67,-.48 -.75,.23 -.98,.44' },
  sol: { name: 'Disco del Quinto Sol', tint: '#ffd152', metal: '#b17637', hole: .19, outline: '0,1 .24,.66 .72,.79 .69,.32 1,0 .69,-.32 .72,-.79 .24,-.66 0,-1 -.24,-.66 -.72,-.79 -.69,-.32 -1,0 -.69,.32 -.72,.79 -.24,.66' },
  bestiario: { name: 'Mandíbula del Coloso', tint: '#d9de87', metal: '#706444', outline: '-1,.7 -.72,.24 -.49,.43 -.31,.02 -.03,.15 .14,-.12 .42,.12 .66,.23 1,.75 .96,-.07 .68,-.59 .23,-.91 -.43,-.85 -.85,-.49' },
  plaga: { name: 'Incensario de la Plaga', tint: '#c3e961', metal: '#576136', outline: '-.31,1 .32,1 .32,.53 .73,.27 .94,-.12 .72,-.65 .27,-.92 -.31,-.91 -.73,-.65 -.94,-.12 -.73,.27 -.31,.53' },
  marea: { name: 'Cresta de Nerith', tint: '#65efea', metal: '#386f79', outline: '-1,-.79 -.84,-.29 -.66,.26 -.29,.75 .18,.98 .66,.84 .94,.48 .83,.09 .57,.32 .24,.35 .05,.01 .27,-.37 .92,-.66 .58,-.89 -.62,-.94' },
  forja: { name: 'Cámara del Gran Yunque', tint: '#ff9951', metal: '#87634f', hole: .27, outline: '-1,.82 1,.82 .8,.35 .44,.23 .34,-.38 .82,-.58 .93,-.88 -.93,-.88 -.82,-.58 -.34,-.38 -.44,.23 -.8,.35' },
  goblins: { name: 'Reactor Chispeante', tint: '#d8f151', metal: '#798041', outline: '-.78,-.79 -.91,.29 -.55,.51 -.55,.92 -.21,.92 -.21,.47 .28,.47 .28,.72 .67,.72 .67,.48 .93,.27 .79,-.79 .42,-.94 -.42,-.94' },
  tercios: { name: 'Baluarte de las Picas', tint: '#ffd18e', metal: '#8e5451', outline: '-1,.66 -.66,.66 -.66,.34 -.39,.34 0,1 .39,.34 .66,.34 .66,.66 1,.66 1,-.28 .68,-.28 .72,-.86 -.72,-.86 -.68,-.28 -1,-.28' },
  kalevala: { name: 'Santuario del Sampo', tint: '#8bf3e0', metal: '#54796d', outline: '-.91,.76 -.4,.54 0,.94 .4,.54 .91,.76 .82,-.32 .4,-.66 0,-1 -.4,-.66 -.82,-.32' },
} as const satisfies Record<FactionId, { readonly name: string; readonly tint: string; readonly metal: string; readonly outline: string; readonly hole?: number }>

export type NexusForm = { readonly name: string; readonly tint: string; readonly metal: string; readonly outline: string; readonly hole?: number }

export const nexusWear = (integrity: number) => integrity > .75 ? 0 : integrity > .5 ? 1 : integrity > .25 ? 2 : 3
