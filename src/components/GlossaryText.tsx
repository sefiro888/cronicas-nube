import { useId, useMemo } from 'react';

import styles from './GlossaryText.module.css';
import { FAMILY_LABELS, KeywordGlyph, keywordIdentity, keywordStyle } from './keywordIdentity';

export interface GlossaryEntry {
  readonly id: string;
  readonly terms: readonly string[];
  readonly label: string;
  readonly definition: string;
}

export const CARD_GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'esencia',
    terms: ['Esencia Carmesí', 'Esencia Celeste', 'Esencia'],
    label: 'Esencia',
    definition: 'La energía de las runas quebradas. Cada fuente produce 1 de Esencia de su variante por turno; los costes de color solo se pagan con su variante.',
  },
  {
    id: 'ofrenda',
    terms: ['Ofrenda'],
    label: 'Ofrenda',
    definition: 'Duna. Al jugar la carta puedes pagar esa cantidad de Vida de tu propio Nexo para obtener el efecto mejorado. Es opcional: si no te queda Vida suficiente, la carta se juega sin ella.',
  },
  {
    id: 'juicio',
    terms: ['Juicio'],
    label: 'Juicio',
    definition: 'Duna. Si tu Nexo tiene MENOS Vida que el del rival, la carta hace además lo que dice tras «Juicio». Ir empatado no basta: hay que ir por detrás.',
  },
  {
    id: 'desafio',
    terms: ['Desafío'],
    label: 'Desafío',
    definition: 'Fimbul. Se activa en combate cuerpo a cuerpo cuando la defensora iguala o supera el Ataque de la atacante: la atacante gana el efecto extra que diga la carta.',
  },
  {
    id: 'furor',
    terms: ['Furor'],
    label: 'Furor',
    definition: 'Fimbul. Se activa mientras a la unidad le falte la mitad o más de su Vida máxima: cuanto peor está, más fuerte pega o más efecto extra gana.',
  },
  {
    id: 'renacer',
    terms: ['Renacer'],
    label: 'Renacer',
    definition: 'Samsara. Al ser destruida, la unidad vuelve a la mano de su dueño con una mejora permanente de Ataque/Vida. Solo ocurre una vez por copia.',
  },
  {
    id: 'avatar',
    terms: ['Avatar'],
    label: 'Avatar',
    definition: 'Samsara. Se activa al entrar en juego si ya murió alguna unidad tuya ese mismo turno: la carta entra con un efecto extra.',
  },
  {
    id: 'mandato',
    terms: ['Mandato Celestial', 'Mandato'],
    label: 'Mandato Celestial',
    definition: 'Jade. Un favor único que solo tiene un dueño a la vez, en cualquiera de los dos bandos. Mientras lo conserves, tus cartas con «Mandato» dan su efecto extra; el rival puede arrebatártelo.',
  },
  {
    id: 'hybris',
    terms: ['Hybris'],
    label: 'Hybris',
    definition: 'Olimpo. Contador propio que sube cada vez que dañas al Nexo enemigo. A partir de cierto umbral desbloquea efectos más fuertes en tus cartas — y también te hace más frágil.',
  },
  {
    id: 'metamorfosis',
    terms: ['Metamorfosis'],
    label: 'Metamorfosis',
    definition: 'Olimpo. Transformación permanente que la carta gana al cumplir su condición (sobrevivir herida, tu Hybris llega a un umbral…). No se puede deshacer.',
  },
  {
    id: 'sacrificio-sol',
    terms: ['Sacrificio', 'Sacrificios'],
    label: 'Sacrificio',
    definition: 'Quinto Sol. Efecto que se activa entregando algo propio (tu propia Vida o una unidad tuya) al jugar la carta. Cada Sacrificio suma a tu Cuenta del Sol.',
  },
  {
    id: 'cuenta-del-sol',
    terms: ['Cuenta del Sol'],
    label: 'Cuenta del Sol',
    definition: 'Quinto Sol. Contador propio que sube con cada Sacrificio y no baja. Varias cartas de la facción rinden más cuanto más alta esté.',
  },
  {
    id: 'contagio',
    terms: ['Contagio', 'Infectada', 'Infectadas', 'Infecta'],
    label: 'Contagio / Infectada',
    definition: 'Plaga. Marca a una pieza enemiga como Infectada: pierde 1 de Vida al final de CADA turno, y si muere estando así no va al cementerio de su dueño — se convierte en un Zombi Contagiado bajo quien la infectó.',
  },
  {
    id: 'horda',
    terms: ['Horda'],
    label: 'Horda',
    definition: 'Plaga. Se hace más fuerte cuantas más unidades propias con Horda tengas en el tablero (incluidos los Zombis Contagiados) — en combate o de forma permanente al entrar, según la carta.',
  },
  {
    id: 'ruinas',
    terms: ['Ruinas', 'Escombros'],
    label: 'Ruinas',
    definition: 'Casillas cubiertas de escombros. No se pueden pisar ni sobrevolar, y cortan la línea de tiro de los ataques a distancia.',
  },
  {
    id: 'cobertura',
    terms: ['Cobertura'],
    label: 'Cobertura',
    definition: 'Casillas con parapeto. La unidad que está encima recibe 1 punto menos de daño de los ataques a distancia (el cuerpo a cuerpo la ignora).',
  },
  {
    id: 'agotar',
    terms: ['Agota', 'Agotar', 'Agotada', 'Agotado', 'Agotadas', 'Agotados'],
    label: 'Agotar',
    definition: 'Gira o marca una fuente como usada. No volverá a generar Esencia hasta que se restaure.',
  },
  {
    id: 'impulso',
    terms: ['Impulso'],
    label: 'Impulso',
    definition: 'Esta unidad puede moverse durante el mismo turno en que entra en juego.',
  },
  {
    id: 'congelar',
    terms: ['Congela', 'Congelada', 'Congelado', 'Congeladas', 'Congelados'],
    label: 'Congelar',
    definition: 'Una carta congelada no puede moverse ni atacar mientras dure el efecto.',
  },
  {
    id: 'perforar',
    terms: ['Perforar', 'Perfora'],
    label: 'Perforar',
    definition: 'Si esta unidad destruye a la defensora, el daño que sobra golpea directamente al Nexo enemigo.',
  },
  {
    id: 'vinculo-vital',
    terms: ['Vínculo vital'],
    label: 'Vínculo vital',
    definition: 'Cada vez que esta unidad reparte daño en combate, tu Nexo recupera esa misma cantidad de Vida (sin pasar de su máximo).',
  },
  {
    id: 'aturdir',
    terms: ['Aturdir', 'Aturde', 'Aturdida', 'Aturdido'],
    label: 'Aturdir',
    definition: 'La unidad golpeada no podrá atacar en su próximo turno, aunque sí moverse. A diferencia de Congelar, no le impide desplazarse.',
  },
  {
    id: 'abrasar',
    terms: ['Abrasa', 'Abrasada', 'Abrasado', 'Abrasadas', 'Abrasados'],
    label: 'Abrasada',
    definition: 'La casilla conserva un efecto de fuego temporal que puede dañar o alterar lo que la ocupa.',
  },
  {
    id: 'adyacencia',
    terms: ['Adyacente', 'Adyacentes'],
    label: 'Adyacente',
    definition: 'Una casilla situada inmediatamente arriba, abajo, a la izquierda o a la derecha.',
  },
  {
    id: 'alcance',
    terms: ['Alcance'],
    label: 'Alcance',
    definition: 'Distancia máxima, medida en casillas, desde la que una unidad puede atacar.',
  },
  {
    id: 'guardia',
    terms: ['Guardia'],
    label: 'Guardia',
    definition: 'Si una unidad enemiga está junto a uno o más Guardias, solo puede atacar a uno de ellos. Las unidades incorpóreas pueden ignorar esta restricción.',
  },
  {
    id: 'volador',
    terms: ['Volador', 'Voladora', 'Vuelo'],
    label: 'Volador',
    definition: 'Puede ignorar ciertas restricciones de ocupación o terreno indicadas por las reglas del efecto.',
  },
  {
    id: 'escudo',
    terms: ['Escudo', 'Escudos'],
    label: 'Escudo',
    definition: 'Protección temporal que absorbe daño antes de afectar a la vida o resistencia.',
  },
  {
    id: 'unica',
    terms: ['Única', 'Único'],
    label: 'Única',
    definition: 'Solo puede incluirse una copia de esta carta en un mazo.',
  },
  {
    id: 'robar',
    terms: ['Roba', 'Robar', 'Robes'],
    label: 'Robar',
    definition: 'Mueve la primera carta del mazo a la mano de su propietario.',
  },
  {
    id: 'descartar',
    terms: ['Descarta', 'Descartar', 'Descartes'],
    label: 'Descartar',
    definition: 'Mueve una carta de la mano al descarte sin jugarla.',
  },
  {
    id: 'golpe-veloz',
    terms: ['Golpe veloz', 'Golpe Veloz'],
    label: 'Golpe veloz',
    definition: 'Puede atacar el mismo turno en que entra en juego, sin esperar a tu siguiente turno.',
  },
  {
    id: 'petardazo',
    terms: ['Petardazo'],
    label: 'Petardazo',
    definition: 'Goblins. Cuando la unidad es destruida, inflige 2 de daño a todas las unidades adyacentes, incluidas las tuyas. Si la carta indica otra cifra, usa esa.',
  },
  {
    id: 'chispa',
    terms: ['Chispa', 'Chispas'],
    label: 'Chispa',
    definition: 'Goblins. Al jugar la carta se lanza una moneda: a cara obtienes un efecto y a cruz el otro. Las dos caras sirven para algo.',
  },
  {
    id: 'formacion',
    terms: ['Formación'],
    label: 'Formación',
    definition: 'Tercios. Mientras la unidad tenga dos o más unidades aliadas adyacentes, gana +1 de Ataque y +2 de Vida.',
  },
  {
    id: 'descarga',
    terms: ['Descarga'],
    label: 'Descarga',
    definition: 'Tercios. Si hay una unidad aliada entre esta unidad y su objetivo, el ataque inflige 2 de daño adicional.',
  },
  {
    id: 'canto',
    terms: ['Canto', 'Hunde', 'Hundir', 'Hundida', 'Hundido'],
    label: 'Canto',
    definition: 'Kalevala. No destruye: hunde. La unidad sale del tablero y vuelve al final del siguiente turno de su dueño, en la misma casilla si está libre y con sus estadísticas base.',
  },
  {
    id: 'nexo',
    terms: ['Nexo'],
    label: 'Nexo',
    definition: 'Fuente vital protegida por el comandante. Si su vida llega a cero, su propietario pierde la partida.',
  },
];

export interface GlossaryTextProps {
  readonly text: string;
  readonly entries?: readonly GlossaryEntry[];
  readonly interactive?: boolean;
  readonly className?: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = (value: string) => value.toLocaleLowerCase('es-ES');

function buildGlossary(entries: readonly GlossaryEntry[]) {
  const termMap = new Map<string, GlossaryEntry>();
  const terms: string[] = [];
  for (const entry of entries) {
    for (const term of entry.terms) {
      termMap.set(normalize(term), entry);
      terms.push(term);
    }
  }
  terms.sort((left, right) => right.length - left.length);
  const alternatives = terms.map(escapeRegExp).join('|');
  const pattern = alternatives.length > 0
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, 'giu')
    : null;
  return { termMap, pattern };
}

export function GlossaryText({
  text,
  entries = CARD_GLOSSARY,
  interactive = true,
  className,
}: GlossaryTextProps) {
  const idPrefix = useId().replace(/:/g, '');
  const glossary = useMemo(() => buildGlossary(entries), [entries]);
  const chunks = glossary.pattern ? text.split(glossary.pattern) : [text];

  if (!interactive) return <span className={className}>{text}</span>;

  return (
    <span className={[styles.glossaryText, className].filter(Boolean).join(' ')}>
      {chunks.map((chunk, index) => {
        const entry = glossary.termMap.get(normalize(chunk));
        if (!entry) return <span key={`${index}-${chunk}`}>{chunk}</span>;
        const tooltipId = `${idPrefix}-${entry.id}-${index}`;
        const identity = keywordIdentity(entry.id);
        return (
          <span
            className={styles.term}
            style={keywordStyle(entry.id)}
            data-family={identity.family}
            role="term"
            tabIndex={0}
            aria-label={`${chunk}: ${entry.definition}`}
            aria-describedby={tooltipId}
            key={`${index}-${chunk}`}
          >
            {chunk}
            <span className={styles.tooltip} id={tooltipId} role="tooltip">
              <strong className={styles.tooltipHead}>
                <KeywordGlyph glyph={identity.glyph} className={styles.tooltipGlyph} />
                {entry.label}
                <em>{FAMILY_LABELS[identity.family]}</em>
              </strong>
              <span>{entry.definition}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
