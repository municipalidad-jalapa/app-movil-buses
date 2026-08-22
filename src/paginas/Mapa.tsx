import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { config } from '../core/config';
import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import { MapaRuta } from '../componentes/MapaRuta';
import { useRutas } from '../hooks/useRutas';
import './Mapa.css';

/**
 * Pantalla principal. Por ahora es el esqueleto de HU-26: solo comprueba que la
 * capa de red y la configuracion funcionan de punta a punta.
 *
 * El mapa real lo trae HU-50, el bus en movimiento HU-51 y el contador HU-52.
 */
export function Mapa() {
  const [rutas, setRutas] = useState<Ruta[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  const { apiBaseUrl } = config;

  useEffect(() => {
    const control = new AbortController();
    setError(null);
    setRutas(null);

    apiClient
      .get<Ruta[]>('/api/v1/rutas', { signal: control.signal })
      .then((datos) => setRutas(datos ?? []))
      .catch((causa) => setError(causa));

    return () => control.abort();
  }, [intento]);

  return (
    <div className="pantalla-mapa">
      <h1>Bus electrico de Jalapa</h1>
      <p style={{ color: 'var(--color-texto-suave)', fontSize: '0.875rem' }}>
        Backend: <code>{apiBaseUrl}</code>
      </p>

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

      <p style={{ marginTop: 'var(--esp-8)', color: 'var(--tinta-secundaria)' }}>
        Esqueleto de HU-26. El mapa llega en HU-50 y el contador en HU-52.
      </p>
    </div>
  );
}
