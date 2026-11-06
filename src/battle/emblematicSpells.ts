import type { FactionId } from '../game'

/** Cada conjuro tiene su propio gesto espacial. p es el tiempo de la mota;
 * r su separación del eje, a su ángulo, y q su posición en el motivo. */
export const EMBLEMATIC_SPELLS = {
  'lluvia-ceniza': { faction: 'fury', name: 'Ascua de la Caldera', path: 'vec3(cos(a)*r*(.3+p), 2.8*(1.-p)*(1.-p)+.18, sin(a)*r+(1.-p)*1.2)' },
  'cometa-arcano': { faction: 'arcane', name: 'Órbita del cometa', path: 'mix(vec3(origin.x-site.x,.8,origin.y-site.z),vec3(0.,.3,0.),p)+vec3(cos(a+p*17.)*r*(1.-p),sin(p*PI)*2.+sin(a)*r,.25*sin(a+p*17.))' },
  'crecimiento-salvaje': { faction: 'nature', name: 'Raíces que florecen', path: 'vec3(cos(a+p*3.)*r*(1.-p*.6),.12+p*p*(.8+r),sin(a+p*3.)*r*(1.-p*.6))' },
  'juicio-divino': { faction: 'order', name: 'Veredicto de vitrales', path: 'vec3(sign(cos(a))*r*(1.-p),2.9*(1.-p)+.2,sign(sin(a))*r*(1.-p))' },
  'guadana-espectral': { faction: 'shadow', name: 'Filo espectral', path: 'vec3(cos(p*3.8+a*.14)*(1.+r*.34),.3+sin(p*PI)*(.5+r),sin(p*3.8+a*.14)*(.65+r*.22))' },
  'colapso-dimensional': { faction: 'void', name: 'Fractura imposible', path: 'vec3(cos(a+p*8.)*r*(1.4-p),.22+r*1.4*(1.-p)+.55*sin(a*3.+p*6.),sin(a+p*8.)*r*(1.4-p))' },
  'tormenta-de-arena': { faction: 'duna', name: 'Vendaval de la necrópolis', path: 'vec3((p-.5)*2.45+cos(a+p*16.)*r*.44,.14+sin(p*PI)*r*.67,sin(a+p*16.)*r*.64)' },
  'rueda-que-gira': { faction: 'samsara', name: 'Retorno de la rueda', path: 'vec3(cos(a+p*8.)*(.32+r*.6),.84+sin(a+p*8.)*(.32+r*.6),sin(p*PI)*.5-.23)' },
  'rayo-del-olimpo': { faction: 'olimpo', name: 'Ramas del trueno', path: 'vec3((sin(p*35.)*.13+cos(a)*r*.55)*(1.-p),3.3*(1.-p)+.23,(cos(p*27.)*.12+sin(a)*r*.48)*(1.-p))' },
  'lluvia-de-obsidiana': { faction: 'sol', name: 'Dientes del sol', path: 'vec3(cos(a)*(r*.6+.12)*(1.1-p),3.1*(1.-p)+.13,sin(a)*(r*.6+.12)*(1.1-p)+.85*(1.-p))' },
  estampida: { faction: 'bestiario', name: 'Pisadas de coloso', path: 'vec3((step(.5,q)-.5)*.78+r*.27*cos(a),.13+abs(sin(p*PI*4.+q*3.))*.33,(p-.5)*2.2+r*.35*sin(a))' },
  'niebla-infecciosa': { faction: 'plaga', name: 'Esporas de la cripta', path: 'vec3(cos(a+p*4.)*r*p*1.65,.2+r*.45+sin(p*PI)*q*.67,sin(a+p*4.)*r*p*1.65)' },
  sobrecarga: { faction: 'forja', name: 'Pistones al rojo', path: 'vec3(cos(a)*r,.18+abs(sin(p*PI*3.+q*3.))*r*1.6,sin(a)*r)' },
  chispazo: { faction: 'goblins', name: 'Mecha de Bromuro', path: 'p<.46?vec3((p-.46)*1.4,.2+abs(sin(p*41.))*.14,q*.18):vec3(cos(a)*r*p*(.6+spark*.7),.22+sin(p*PI)*r*(1.5-spark*.5),sin(a)*r*p*(.6+spark*.7))' },
  'descarga-cerrada': { faction: 'tercios', name: 'Salva del cuadro', path: 'vec3((fract(q*3.)-.5)*1.1+(1.-p)*.28,.37+sin(p*PI)*r*.65,(p-1.)*2.3+cos(a)*r*.18)' },
  'canto-de-la-helada': { faction: 'kalevala', name: 'Runas en el aire', path: 'vec3(cos(a+p*9.)*(.36+r*.45),.26+p*(1.+r),sin(a+p*9.)*(.36+r*.45)+sin(p*18.+q*8.)*.19)' },
} as const satisfies Record<string, { readonly faction: FactionId; readonly name: string; readonly path: string }>

export const emblematicSpell = (id?: string) => id && Object.hasOwn(EMBLEMATIC_SPELLS, id)
  ? EMBLEMATIC_SPELLS[id as keyof typeof EMBLEMATIC_SPELLS] : undefined
