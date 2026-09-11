import { formatearMomento } from './HoraUltimoDato';
import './AvisoSinConexion.css';

interface Props {
  /** Cuando llego el ultimo dato. Sin el, se dice que todavia no hubo. */
  recibidoEn: Date | null;
  onReintentar: () => void;
}

/**
 * El telefono se quedo sin red (DESIGN.md §7, `sin-conexion`).
 *
 * Calco del artboard "09 Sin conexion" de `design/EcoRuta.dc.html`: franja
 * oscura con "Sin internet" y la hora de lo ultimo que sabemos, la tarjeta que
 * explica que los numeros pueden haber cambiado y "Intentar de nuevo". El
 * resto de la pantalla queda atenuado debajo, con el croquis.
 *
 * Es una pantalla de primera clase, no un error: sin iconos de fallo ni
 * disculpas.
 */
export function AvisoSinConexion({ recibidoEn, onReintentar }: Props) {
  return (
    <section className="sin-conexion" role="status" aria-live="polite">
      <div className="sin-conexion__franja">
        <div className="sin-conexion__titulo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0" />
            <circle cx="12" cy="19" r="1.2" fill="currentColor" />
          </svg>
          <h2>Sin internet</h2>
        </div>
        <p className="tabular">
          {recibidoEn
            ? `Esto es lo último que sabemos, de las ${formatearMomento(recibidoEn)}`
            : 'Todavía no recibimos datos del bus.'}
        </p>
      </div>
      <div className="sin-conexion__cuerpo">
        <div className="sin-conexion__tarjeta">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <p>Los números pueden haber cambiado. Cuando vuelva la señal se actualizan solos.</p>
        </div>
        <button type="button" className="sin-conexion__boton" onClick={onReintentar}>
          Intentar de nuevo
        </button>
      </div>
    </section>
  );
}
