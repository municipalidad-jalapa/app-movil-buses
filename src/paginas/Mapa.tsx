import { obtenerConfiguracion } from '../core/config';
import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import { MapaRuta } from '../componentes/MapaRuta';
import { useRutas } from '../hooks/useRutas';

/**
 * Pantalla principal. Por ahora es el esqueleto de HU-26: solo comprueba que la
 * capa de red y la configuracion funcionan de punta a punta.
 *
 * El mapa real lo trae HU-50, el bus en movimiento HU-51 y el contador HU-52.
 */
export function Mapa() {
  const { apiUrl } = obtenerConfiguracion();
  const { rutas, cargando, error, reintentar } = useRutas();

  return (
    <>
      <h1>Bus electrico de Jalapa</h1>
      <MapaRuta />
      <p style={{ color: 'var(--color-texto-suave)', fontSize: '0.875rem' }}>
        Backend: <code>{apiUrl}</code>
      </p>

      {error && <MensajeError error={error} onReintentar={reintentar} />}
      {!error && cargando && <Cargando texto="Consultando rutas…" />}
      {!cargando && !error && rutas.length === 0 && <p>No hay rutas activas todavia.</p>}
      {!cargando && !error && rutas.length > 0 && (
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
    </>
  );
}
