import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { Cargando } from '../componentes/Cargando';
import { ContadorDemanda } from '../componentes/ContadorDemanda';
import { useEstadoDemandaConPolling } from '../hooks/useEstadoDemandaConPolling';
import type { Ruta } from '../core/tipos';

/**
 * Pantalla principal del pasajero.
 *
 * Mantiene un estado de carga y error para las rutas, mientras que la demanda
 * se actualiza automáticamente cada 15 segundos con polling que se pausa cuando
 * la pestaña pierde foco.
 */
export function Mapa() {
  const [rutas, setRutas] = useState<Ruta[] | null>(null);
  const [rutasError, setRutasError] = useState<unknown>(null);
  const [rutasIntento, setRutasIntento] = useState(0);

  // Hook que maneja polling cada 15s y pausa cuando document.hidden
  const {
    registrosActivos: totalEsperando,
    umbral,
    faltantes,
    cargando: demandaCargando,
    error: demandaError,
    pausadoPorVisibilidad,
    reintentar: reintentarDemanda,
  } = useEstadoDemandaConPolling(15 * 1000);

  // Efecto para cargar las rutas una sola vez
  useEffect(() => {
    const control = new AbortController();
    setRutasError(null);
    setRutas(null);

    apiClient
      .get<Ruta[]>('/api/v1/rutas', { signal: control.signal })
      .then((datos) => setRutas(datos ?? []))
      .catch((causa) => setRutasError(causa));

    return () => control.abort();
  }, [rutasIntento]);

  return (
    <>
      <h1>Bus electrico de Jalapa</h1>

      {demandaError && (
        <ContadorDemanda
          error={demandaError}
          onReintentar={reintentarDemanda}
        />
      )}
      {!demandaError && demandaCargando && (
        <Cargando texto="Consultando demanda…" />
      )}
      {!demandaError && !demandaCargando && totalEsperando !== null && (
        <ContadorDemanda
          totalEsperando={totalEsperando}
          umbralSalida={umbral ?? 10}
          faltanParaSalir={faltantes ?? 0}
          nombreParada="Portón azul del Instituto Normal"
        />
      )}

      {rutasError && (
        <p>
          No pudimos cargar las rutas.{' '}
          <button onClick={() => setRutasIntento((n) => n + 1)}>Reintentar</button>
        </p>
      )}
      {rutas !== null && rutas.length === 0 && <p>No hay rutas activas todavia.</p>}
      {rutas !== null && rutas.length > 0 && (
        <ul style={{ marginTop: 'var(--esp-6)' }}>
          {rutas.map((ruta) => (
            <li key={ruta.id}>
              {ruta.nombre} — {ruta.paradas.length} paradas
            </li>
          ))}
        </ul>
      )}

      {pausadoPorVisibilidad && (
        <p style={{ fontSize: 'var(--micro)', color: 'var(--tinta-tenue)' }}>
          El sondeo está pausado (pestaña no visible)
        </p>
      )}
    </>
  );
}
