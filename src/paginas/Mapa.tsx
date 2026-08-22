import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import { MapaRuta } from '../componentes/MapaRuta';
import { useRutas } from '../hooks/useRutas';
import './Mapa.css';

/**
 * Pantalla principal del pasajero: muestra el mapa y la ruta disponible.
 */
export function Mapa() {
  const { rutaActiva, paradas, cargando, error, reintentar } = useRutas();

  return (
    <div className="pantalla-mapa">
      <h1>Bus electrico de Jalapa</h1>
<<<<<<< HEAD
      <MapaRuta ruta={rutaActiva} paradas={paradas} />

      {error && <MensajeError error={error} onReintentar={reintentar} />}
      {!error && cargando && <Cargando texto="Consultando rutas…" />}
      {!cargando && !error && !rutaActiva && <p>No hay rutas activas todavía.</p>}
    </>
=======

      {cargando && (
        <section className="pantalla-mapa__estado" role="status" aria-live="polite">
          <span className="pantalla-mapa__icono" aria-hidden="true">...</span>
          <Cargando texto="Cargando las rutas..." />
        </section>
      )}

      {!cargando && Boolean(error) && (
        <section className="pantalla-mapa__estado pantalla-mapa__estado--error">
          <span className="pantalla-mapa__icono" aria-hidden="true">!</span>
          <h2>No se pudo cargar la ruta</h2>
          <MensajeError error={error} onReintentar={reintentar} />
        </section>
      )}

      {!cargando && !error && !rutaActiva && (
        <section className="pantalla-mapa__estado" role="status">
          <span className="pantalla-mapa__icono" aria-hidden="true">-</span>
          <h2>No hay rutas activas</h2>
          <p>En este momento no hay una ruta disponible para mostrar.</p>
        </section>
      )}

      {!cargando && !error && rutaActiva && (
        <>
          <MapaRuta ruta={rutaActiva} paradas={paradas} />
          <p className="pantalla-mapa__backend">
            Backend: <code>{apiUrl}</code>
          </p>
        </>
      )}

      {!cargando && !error && rutaActiva && rutas.length > 0 && (
        <ul>
          {rutas.map((ruta) => (
            <li key={ruta.id}>
              {ruta.nombre} — {ruta.paradas.length} paradas
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 'var(--esp-8)', color: 'var(--color-texto-suave)' }}>
        Esqueleto de HU-26. El mapa llega en HU-50 y el contador en HU-52.
      </p>
    </div>
>>>>>>> 56f2479927b017ebdc73e73d75bbce0f4d7d8579
  );
}
