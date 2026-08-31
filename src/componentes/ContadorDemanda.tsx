import { MensajeError } from './MensajeError';
import './ContadorDemanda.css';

interface Props {
  totalEsperando?: number | null;
  umbralSalida?: number;
  faltanParaSalir?: number | null;
  nombreParada?: string;
  cargando?: boolean;
  error?: unknown;
  onReintentar?: () => void;
}

const ETIQUETA = 'Tu parada';

/**
 * Muestra el dato principal de la pantalla del pasajero: cuanta demanda hay en la parada.
 * Diseñado para un telefono, con alto contraste y lectura rapida bajo sol.
 *
 * Tres variantes visuales (DESIGN.md §8):
 *  - cargando: esqueleto sin salto de layout, sin bloquear la lectura.
 *  - error con reintento: texto del traductor del cliente de API, color + icono + texto.
 *  - dato listo: incluye el caso "ya hay suficientes personas para que el bus salga",
 *    diferenciado por icono + texto + luminancia, nunca solo por color (DESIGN.md §3.1).
 */
export function ContadorDemanda({
  totalEsperando,
  umbralSalida = 10,
  faltanParaSalir,
  nombreParada = ETIQUETA,
  cargando = false,
  error,
  onReintentar,
}: Props) {
  if (cargando) {
    return (
      <section
        className="contador-demanda contador-demanda--cargando"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="contador-demanda__etiqueta">{ETIQUETA}</span>
        <div className="contador-demanda__esqueleto" aria-hidden="true">
          <span className="contador-demanda__hueso contador-demanda__hueso--titulo" />
          <span className="contador-demanda__hueso contador-demanda__hueso--numero" />
          <span className="contador-demanda__hueso contador-demanda__hueso--barra" />
        </div>
        <p className="contador-demanda__nota">Actualizando el conteo…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="contador-demanda contador-demanda--error"
        aria-live="assertive"
      >
        <span className="contador-demanda__etiqueta">{ETIQUETA}</span>
        <MensajeError error={error} onReintentar={onReintentar} />
      </section>
    );
  }

  const valor = typeof totalEsperando === 'number' ? totalEsperando : 0;
  const faltantes =
    typeof faltanParaSalir === 'number'
      ? faltanParaSalir
      : Math.max(umbralSalida - valor, 0);
  const porcentaje = Math.min((valor / Math.max(umbralSalida, 1)) * 100, 100);
  const alcanzado = valor >= umbralSalida;

  return (
    <section
      className={`contador-demanda${alcanzado ? ' contador-demanda--alcanzado' : ''}`}
      aria-live="polite"
      aria-label={`Hay ${valor} personas esperando en ${nombreParada}.`}
    >
      <div className="contador-demanda__cabecera">
        <span className="contador-demanda__etiqueta">{ETIQUETA}</span>
        <span
          className={`contador-demanda__estado${alcanzado ? ' is-alcanzado' : ''}`}
        >
          <IconoEstado alcanzado={alcanzado} />
          {alcanzado ? 'Listo' : 'En espera'}
        </span>
      </div>

      <div className="contador-demanda__parada">
        <h2>{nombreParada}</h2>
      </div>

      <div className="contador-demanda__valor-wrap">
        <div className="contador-demanda__valor">{valor}</div>
        <div className="contador-demanda__meta">
          <span>personas esperando</span>
        </div>
      </div>

      <div
        className="contador-demanda__progreso"
        role="progressbar"
        aria-valuenow={Math.min(valor, umbralSalida)}
        aria-valuemin={0}
        aria-valuemax={umbralSalida}
      >
        <div
          className="contador-demanda__progreso-barra"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <p className="contador-demanda__mensaje">
        {alcanzado ? (
          <>
            <IconoEstado alcanzado />
            <strong>Ya se puede ir.</strong>
            <span>Hay suficientes personas para que el bus salga.</span>
          </>
        ) : (
          <>
            <strong>
              {faltantes === 1
                ? 'Falta 1 persona'
                : `Faltan ${faltantes} personas`}
            </strong>
            <span>para que el bus salga.</span>
          </>
        )}
      </p>
    </section>
  );
}

/** Icono redundante al color y al texto (DESIGN.md §3.1 [DURA]). */
function IconoEstado({ alcanzado }: { alcanzado: boolean }) {
  return (
    <svg
      className="contador-demanda__icono"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {alcanzado ? (
        <path
          fill="currentColor"
          d="M9.55 17.3 4.4 12.15l1.4-1.4 3.75 3.75 8.25-8.25 1.4 1.4z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M12 4a8 8 0 1 0 .01 16.01A8 8 0 0 0 12 4zm.9 4.5v3.9l3.3 2-.9 1.5-4.2-2.6V8.5h1.8z"
        />
      )}
    </svg>
  );
}
