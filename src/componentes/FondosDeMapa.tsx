import { ANCHO_LIENZO, ALTO_LIENZO } from '../core/proyeccionMapa';

/**
 * Los fondos del mapa, portados TAL CUAL de design/MapaJalapa.dc.html.
 *
 * <p>Son SVG propios y no tiles: a la escala de una sola ruta urbana alcanzan,
 * pesan unos pocos kilobytes y no dependen de ninguna llave ni de ningun archivo
 * que haya que publicar aparte. El presupuesto de peso de DESIGN.md seccion 13
 * se cumple solo.
 */

const VIEW_BOX = `0 0 ${ANCHO_LIENZO} ${ALTO_LIENZO}`;

/** El eje de la calzada principal. Lo comparten el fondo claro y el oscuro. */
const CALZADA = 'M-10 640 L120 470 L200 470 L330 300 L390 300';

/** Las calles secundarias, en cuadricula. */
const CALLES = [
  'M0 80 H390', 'M0 150 H390', 'M0 230 H390', 'M0 320 H390',
  'M0 410 H390', 'M0 500 H390', 'M0 580 H390',
  'M50 0 V640', 'M120 0 V640', 'M190 0 V640', 'M260 0 V640', 'M330 0 V640',
];

/** Referencias reconocibles, no nombres oficiales (DESIGN.md seccion 10). */
const ROTULOS = [
  { x: 220, y: 288, texto: 'Parque central' },
  { x: 8, y: 146, texto: '5a Avenida' },
  { x: 196, y: 628, texto: 'Calzada J. R. Barrios', giro: 'rotate(-53 196 628)' },
  { x: 14, y: 70, texto: 'Barrio San Francisco' },
  { x: 304, y: 466, texto: 'La Terminal' },
];

function Rotulos() {
  return (
    <g>
      {ROTULOS.map((r) => (
        <text key={r.texto} x={r.x} y={r.y} transform={r.giro} className="mapa-jalapa__rotulo">
          {r.texto}
        </text>
      ))}
    </g>
  );
}

/** Fondo del mapa. Los colores salen de las variables CSS, que cambian con el modo. */
export function FondoMapa({ oscuro }: { oscuro: boolean }) {
  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid slice"
      className="mapa-jalapa__capa"
      aria-label={oscuro ? 'Mapa de Jalapa, modo oscuro' : 'Mapa de Jalapa'}
    >
      <rect x="0" y="0" width={ANCHO_LIENZO} height={ALTO_LIENZO} fill="var(--mapa-base)" />
      <path d="M0 0 H150 V96 H0 Z" fill="var(--mapa-verde)" />
      <path d="M300 470 h90 v170 h-90 z" fill="var(--mapa-verde)" />
      <path d="M0 250 C60 262 92 300 96 356 C56 372 8 340 0 300 Z" fill="var(--mapa-verde)" />

      <path d={CALZADA} fill="none" stroke="var(--mapa-calzada)" strokeWidth="26" />
      <g stroke="var(--mapa-calle)" strokeWidth="13" strokeLinecap="square">
        {CALLES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d={CALZADA} fill="none" stroke="var(--mapa-via)" strokeWidth="17" strokeLinecap="round" />

      <rect x="214" y="196" width="92" height="76" rx="6" fill="var(--mapa-parque)" />
      <g fill="var(--mapa-arbol)">
        <circle cx="232" cy="214" r="7" />
        <circle cx="256" cy="230" r="9" />
        <circle cx="288" cy="212" r="7" />
        <circle cx="240" cy="254" r="7" />
        <circle cx="284" cy="252" r="8" />
      </g>
      {!oscuro && <path d="M236 234 h48" stroke="#efe7d7" strokeWidth="4" strokeLinecap="round" />}

      <Rotulos />
    </svg>
  );
}

/**
 * Croquis: el respaldo cuando no hay red.
 *
 * <p>DESIGN.md seccion 7 es explicito: no es una pantalla de error. Mismo trazo,
 * mismos marcadores, misma tarjeta; solo cambia el fondo.
 */
export function FondoCroquis() {
  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid slice"
      className="mapa-jalapa__capa"
      aria-label="Croquis ligero de la ruta"
    >
      <rect x="0" y="0" width={ANCHO_LIENZO} height={ALTO_LIENZO} fill="#f4eee2" />
      <g stroke="#ddd3c2" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M2 152 C90 146 210 158 388 148" />
        <path d="M2 322 C104 316 216 328 388 318" />
        <path d="M4 502 C96 496 214 508 386 498" />
        <path d="M120 4 C114 140 126 340 120 636" />
        <path d="M190 6 C196 180 184 380 190 634" />
        <path d="M330 4 C336 160 324 330 330 636" />
      </g>
      <path
        d="M-10 640 C60 560 120 500 200 470 C270 444 300 360 390 300"
        fill="none"
        stroke="#c2b8a8"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M216 198 C258 190 302 202 304 240 C306 272 250 280 226 266 C206 254 208 210 216 198 Z"
        fill="#dde2ce"
        stroke="#c6cdb4"
        strokeWidth="4"
      />
      <text x="222" y="290" className="mapa-jalapa__rotulo" style={{ fill: '#6b6357' }}>
        Parque central
      </text>
      <g stroke="#c2b8a8" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8">
        <path d="M36 596c0-16 12-28 26-28 9 0 15 6 15 14s-6 13-13 13-11-5-11-10" />
      </g>
    </svg>
  );
}

/** Retrasos del latido de cada celda, tal como los fija el mock. */
const RETRASOS = ['0s', '', '.2s', '', '.4s', '', '.1s', '', '.3s', '', '.5s', '', '.15s', '', '.35s'];

export function FondoCargando() {
  return (
    <>
      <div className="mapa-jalapa__esqueleto" aria-hidden="true">
        {RETRASOS.map((retraso, i) => (
          <div
            key={i}
            className={retraso ? 'mapa-jalapa__celda mapa-jalapa__celda--viva' : 'mapa-jalapa__celda'}
            style={retraso ? { animationDelay: retraso } : undefined}
          />
        ))}
      </div>
      <p className="mapa-jalapa__cargando" role="status">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a443a" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Cargando el mapa…
      </p>
    </>
  );
}
