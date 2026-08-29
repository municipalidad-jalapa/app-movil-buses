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

/**
 * Muestra el dato principal de la pantalla del pasajero: cuanta demanda hay en la parada.
 * Diseñado para un telefono, con alto contraste y lectura rapida bajo sol.
 */
export function ContadorDemanda({
  totalEsperando,
  umbralSalida = 10,
  faltanParaSalir,
  nombreParada = 'Tu parada',
  cargando = false,
  error,
  onReintentar,
}: Props) {
  const valor = typeof totalEsperando === 'number' ? totalEsperando : 0;
  const faltantes =
    typeof faltanParaSalir === 'number'
      ? faltanParaSalir
      : Math.max(umbralSalida - valor, 0);
  const porcentaje = Math.min((valor / Math.max(umbralSalida, 1)) * 100, 100);
  const alcanzado = valor >= umbralSalida;

  if (cargando) {
    return (
      <section className="contador-demanda contador-demanda--cargando" aria-live="polite">
        <span className="contador-demanda__etiqueta">Tu parada</span>
        <div className="contador-demanda__carga" aria-label="Cargando contenedor de demanda" />
        <p className="contador-demanda__estado">Actualizando la fila…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="contador-demanda contador-demanda--error" aria-live="assertive">
        <span className="contador-demanda__etiqueta">Tu parada</span>
        <MensajeError error={error} onReintentar={onReintentar} />
      </section>
    );
  }

  return (
    <section className="contador-demanda" aria-live="polite" aria-label={`Hay ${valor} personas esperando en la parada.`}>
      <div className="contador-demanda__cabecera">
        <span className="contador-demanda__etiqueta">Tu parada</span>
        <span className={`contador-demanda__estado ${alcanzado ? 'is-alcanzado' : ''}`}>
          {alcanzado ? 'Lleno' : 'En espera'}
        </span>
      </div>

      <div className="contador-demanda__parada">
        <h2>{nombreParada}</h2>
      </div>

      <div className="contador-demanda__valor-wrap">
        <div className="contador-demanda__valor" aria-label={`${valor} personas esperando`}>
          {valor}
        </div>
        <div className="contador-demanda__meta">
          <span>personas esperando</span>
        </div>
      </div>

      <div className="contador-demanda__progreso" aria-hidden="true">
        <div className="contador-demanda__progreso-barra" style={{ width: `${porcentaje}%` }} />
      </div>

      <div className="contador-demanda__mensaje">
        {alcanzado ? (
          <strong>El bus puede salir ya.</strong>
        ) : (
          <>
            <strong>Faltan {faltantes} personas</strong>
            <span>para llegar al umbral de {umbralSalida}.</span>
          </>
        )}
      </div>
    </section>
  );
}
