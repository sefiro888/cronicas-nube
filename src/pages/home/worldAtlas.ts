import type { FactionId } from '../../game'

/** Cada facción tiene un lugar y una criatura: no depender de un carrusel
 * evita que las últimas queden fuera de la portada o solo existan al pasar. */
export const WORLD_CHAPTERS = [
  { id: 'hierro', title: 'Donde arde la voluntad.', label: 'Fuego, acero y pólvora',
    description: 'Dragones sobre la caldera. Gigantes de bronce. Una chispa capaz de cambiarlo todo.',
    image: 'territorios-hierro-v1', color: '#f3ad6f', factions: ['fury', 'forja', 'goblins', 'tercios'] },
  { id: 'imperios', title: 'Los dioses también combaten.', label: 'Los imperios del alba',
    description: 'Bajo el mármol, el jade y la arena, los antiguos poderes vuelven a despertar.',
    image: 'territorios-imperios-v1', color: '#e6cf92', factions: ['order', 'duna', 'jade', 'olimpo', 'sol'] },
  { id: 'salvajes', title: 'Lo indomable te llama.', label: 'Más allá de las fronteras',
    description: 'El bosque recuerda. El hielo desafía. En las profundidades, algo inmenso se mueve.',
    image: 'territorios-salvajes-v1', color: '#97d6b8', factions: ['nature', 'bestiario', 'fimbul', 'marea', 'kalevala'] },
  { id: 'umbrales', title: 'Nada termina al caer.', label: 'Al otro lado del velo',
    description: 'Cruza el umbral de lo imposible: cristal, sombras, renacimiento y mundos que se fracturan.',
    image: 'territorios-umbrales-v1', color: '#bab5f4', factions: ['arcane', 'shadow', 'void', 'plaga', 'samsara'] },
] as const satisfies readonly {
  id: string; title: string; label: string; description: string;
  image: string; color: string; factions: readonly FactionId[];
}[]

export const WORLD_CREATURES: Readonly<Record<FactionId, string>> = {
  fury: 'dragon-caldera', arcane: 'golem-azur', nature: 'ciervo-sagrado',
  order: 'angel-celestial', shadow: 'nigromante-oscuro', void: 'basilisco-caos',
  duna: 'coloso-de-la-necropolis', fimbul: 'gigante-de-la-escarcha',
  samsara: 'garuda-de-alas-de-sol', jade: 'dragon-del-rio-amarillo',
  olimpo: 'titan-encadenado', sol: 'serpiente-emplumada', bestiario: 'behemot',
  plaga: 'titan-de-la-plaga', marea: 'leviatan-de-las-simas',
  forja: 'coloso-de-la-fundicion', goblins: 'maquina-andante',
  tercios: 'piquero-de-flandes', kalevala: 'aguila-de-pohjola',
}
