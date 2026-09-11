import { ANCHO_LIENZO, ALTO_LIENZO, trazoDe, type PuntoLienzo } from '../core/proyeccionMapa';

/**
 * La ruta, las paradas y el bus sobre el mapa.
 *
 * <p>Portado de `design/MapaJalapa.dc.html`: mismos grosores, mismos colores,
 * mismas formas. Lo unico que cambia es que las posiciones vienen de datos
 * reales proyectados, en vez de estar escritas a mano en el SVG.
 *
 * <p>DESIGN.md seccion 8: solo la ruta, el bus y tu parada llevan color
 * saturado. El fondo se queda apagado para que el dato principal se lea de un
 * vistazo bajo el sol.
 */

/** Verde del trazo y del bus. Del mock, no de los tokens provisionales. */
const VERDE_RUTA = '#10402A';
/** Amarillo de "tu parada". */
const AMARILLO = '#F2B705';
const TINTA_AMARILLO = '#241C00';
/** Blanco calido del contorno, para que el trazo se despegue del fondo. */
const CONTORNO = '#FBF7F0';

export interface ParadaEnMapa {
  id: number;
  nombre: string;
  punto: PuntoLienzo;
  tuya: boolean;
}

interface Props {
  paradas: readonly ParadaEnMapa[];
  /** Vertices del recorrido. Con desvio, es la ruta oficial. */
  trazoRuta: readonly PuntoLienzo[];
  /** Donde esta el bus. `null` mientras no haya posicion. */
  bus: PuntoLienzo | null;
  /** Ultimas posiciones, de mas vieja a mas nueva, para la estela. */
  estela?: readonly PuntoLienzo[];
  /** El bus se separo del trazo conocido (DESIGN.md seccion 7). */
  desvio?: boolean;
  /** Camino real cuando va en desvio. */
  trazoReal?: readonly PuntoLienzo[];
  /** Tocar una parada la elige, igual que en el mapa real. */
  onElegirParada?: (id: number) => void;
}

/** Icono del bus. Se usa igual en el marcador normal y en el de desvio. */
function IconoBus() {
  return (
    <g transform="translate(-11,-11)">
      <svg x="0" y="0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CONTORNO} strokeWidth="2.2" strokeLinecap="round">
        <rect x="3" y="5" width="18" height="11" rx="2" />
        <path d="M3 11h18M7 20v-2M17 20v-2" />
      </svg>
    </g>
  );
}

function MarcadorDelBus({ punto }: { punto: PuntoLienzo }) {
  return (
    <g transform={`translate(${punto.x},${punto.y})`}>
      {/* La punta indica hacia donde mira; el circulo, donde esta. */}
      <path d="M0 -40 L11 -25 L-11 -25 Z" fill={VERDE_RUTA} stroke={CONTORNO} strokeWidth="3" />
      <circle r="23" fill={VERDE_RUTA} stroke={CONTORNO} strokeWidth="4" />
      <IconoBus />
    </g>
  );
}

export function OverlayRuta({
  paradas,
  trazoRuta,
  bus,
  estela = [],
  desvio = false,
  trazoReal = [],
  onElegirParada,
}: Props) {
  const d = trazoDe(trazoRuta);
  const dReal = trazoDe(trazoReal);
  const tuya = paradas.find((p) => p.tuya);

  return (
    <svg
      viewBox={`0 0 ${ANCHO_LIENZO} ${ALTO_LIENZO}`}
      preserveAspectRatio="xMidYMid slice"
      className="mapa-jalapa__capa"
      aria-label={
        desvio
          ? 'El bus va por otra calle: recorrido real y ruta oficial atenuada'
          : 'Ruta del bus, paradas y posición del bus'
      }
    >
      {desvio ? (
        <>
          {/* La ruta de siempre se atenua, no se esconde: sirve de referencia. */}
          <path d={d} fill="none" stroke={CONTORNO} strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" opacity=".7" />
          <path d={d} fill="none" stroke="#C2B8A8" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="16 12" />
          <path d={dReal} fill="none" stroke={CONTORNO} strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" />
          <path d={dReal} fill="none" stroke={VERDE_RUTA} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={d} fill="none" stroke={CONTORNO} strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" />
          <path d={d} fill="none" stroke={VERDE_RUTA} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}

      {/* Paradas normales */}
      <g>
        {paradas
          .filter((p) => !p.tuya)
          .map((p) => (
            <g
              key={p.id}
              role={onElegirParada ? 'button' : undefined}
              tabIndex={onElegirParada ? 0 : undefined}
              aria-label={onElegirParada ? p.nombre : undefined}
              style={onElegirParada ? { cursor: 'pointer' } : undefined}
              onClick={onElegirParada ? () => onElegirParada(p.id) : undefined}
              onKeyDown={
                onElegirParada
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onElegirParada(p.id);
                    }
                  : undefined
              }
            >
              {/* Area de toque de 48 px: el circulo visible es mas chico. */}
              {onElegirParada && <circle cx={p.punto.x} cy={p.punto.y} r="24" fill="transparent" />}
              <circle cx={p.punto.x} cy={p.punto.y} r="9" fill={CONTORNO} stroke={VERDE_RUTA} strokeWidth="5">
                <title>{p.nombre}</title>
              </circle>
            </g>
          ))}
      </g>

      {/* Tu parada: mas grande y en amarillo. Color + forma + tamano, nunca solo color. */}
      {tuya && (
        <g transform={`translate(${tuya.punto.x},${tuya.punto.y})`}>
          <circle r="21" fill={AMARILLO} stroke={TINTA_AMARILLO} strokeWidth="4" />
          <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" fill={TINTA_AMARILLO} />
          <title>{tuya.nombre}</title>
        </g>
      )}

      {/* Estela: por donde acaba de pasar. Se desvanece hacia atras. */}
      <g>
        {estela.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5 + i}
            fill={VERDE_RUTA}
            opacity={0.16 + i * 0.14}
          />
        ))}
      </g>

      {bus && <MarcadorDelBus punto={bus} />}

      {desvio && (
        <g>
          <rect x="60" y="368" width="120" height="30" rx="8" fill="#EDE6DA" stroke="#C2B8A8" strokeWidth="2" />
          <text x="70" y="389" fontFamily="var(--fuente-mapa)" fontSize="13" fontWeight="700" fill="#2E2A24">
            Ruta de siempre
          </text>
        </g>
      )}

      {tuya && (
        <g>
          <rect x={tuya.punto.x + 26} y={tuya.punto.y - 24} width="112" height="34" rx="8" fill={AMARILLO} />
          <text
            x={tuya.punto.x + 40}
            y={tuya.punto.y - 1}
            fontFamily="var(--fuente-mapa)"
            fontSize="15"
            fontWeight="800"
            fill={TINTA_AMARILLO}
          >
            Tu parada
          </text>
        </g>
      )}
    </svg>
  );
}
