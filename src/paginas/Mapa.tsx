import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { config } from '../core/config';
import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import type { Ruta } from '../core/tipos';

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
    <>
      <h1>Bus electrico de Jalapa</h1>
      <p style={{ color: 'var(--color-texto-suave)', fontSize: '0.875rem' }}>
        Backend: <code>{apiBaseUrl}</code>
      </p>

      {error && <MensajeError error={error} onReintentar={() => setIntento((n) => n + 1)} />}
      {!error && rutas === null && <Cargando texto="Consultando rutas…" />}
      {rutas !== null && rutas.length === 0 && <p>No hay rutas activas todavia.</p>}
      {rutas !== null && rutas.length > 0 && (
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
