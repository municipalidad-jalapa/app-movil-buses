/**
 * Icono del bus: «bus» de Lucide (https://lucide.dev, licencia ISC).
 *
 * Un solo dibujo para toda la app: el boton "Ver el bus", el aviso de que ya
 * viene, el marcador del mapa y el del croquis. El trazo toma `currentColor`
 * salvo que se pida otro color (el marcador de MapLibre no hereda color).
 */
const TRAZOS = [
  'M8 6v6',
  'M15 6v6',
  'M2 12h19.6',
  'M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3',
  'M9 18h5',
];
const RUEDAS = [
  { cx: 7, cy: 18 },
  { cx: 16, cy: 18 },
];

interface Props {
  tamano?: number;
  grosor?: number;
  color?: string;
  x?: number;
  y?: number;
}

export function IconoBus({ tamano = 24, grosor = 2, color = 'currentColor', x, y }: Props) {
  return (
    <svg
      x={x}
      y={y}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS.map((d) => (
        <path key={d} d={d} />
      ))}
      {RUEDAS.map(({ cx, cy }) => (
        <circle key={cx} cx={cx} cy={cy} r="2" />
      ))}
    </svg>
  );
}

/** El mismo icono como texto, para marcadores que se arman fuera de React. */
export function svgIconoBus(color: string, tamano = 22, grosor = 2): string {
  const trazos = TRAZOS.map((d) => `<path d="${d}"></path>`).join('');
  const ruedas = RUEDAS.map(({ cx, cy }) => `<circle cx="${cx}" cy="${cy}" r="2"></circle>`).join('');
  return (
    `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${trazos}${ruedas}</svg>`
  );
}
