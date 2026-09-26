/**
 * Icono del bus: «bus-front» de Lucide (https://lucide.dev, licencia ISC).
 *
 * Un solo dibujo para toda la app: el boton "Ver el bus", el aviso de que ya
 * viene, el marcador del mapa y el del croquis. El trazo toma `currentColor`
 * salvo que se pida otro color (el marcador de MapLibre no hereda color).
 */
const TRAZOS = [
  'M4 6 2 7',
  'M10 6h4',
  'm22 7-2-1',
  'M4 11h16',
  'M8 15h.01',
  'M16 15h.01',
  'M6 19v2',
  'M18 21v-2',
];
const CARROCERIA = { width: 16, height: 16, x: 4, y: 3, rx: 2 };

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
      <rect {...CARROCERIA} />
      {TRAZOS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** El mismo icono como texto, para marcadores que se arman fuera de React. */
export function svgIconoBus(color: string, tamano = 22, grosor = 2): string {
  const { width, height, x, y, rx } = CARROCERIA;
  const carroceria = `<rect width="${width}" height="${height}" x="${x}" y="${y}" rx="${rx}"></rect>`;
  const trazos = TRAZOS.map((d) => `<path d="${d}"></path>`).join('');
  return (
    `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${carroceria}${trazos}</svg>`
  );
}
