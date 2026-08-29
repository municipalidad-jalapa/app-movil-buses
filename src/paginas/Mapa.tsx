import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { Cargando } from '../componentes/Cargando';
import { ContadorDemanda } from '../componentes/ContadorDemanda';
import type { EstadoDemanda, Ruta } from '../core/tipos';

/**
 * Pantalla principal del pasajero.
 *
 * Mantiene un estado de carga y error para el endpoint de demanda, y muestra el
 * contador más visible de la pantalla con los datos reales de la parada activa.
 */
export function Mapa() {
  const [rutas, setRutas] = useState<Ruta[] | null>(null);
  const [demanda, setDemanda] = useState<EstadoDemanda | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setError(null);
    setRutas(null);
    setDemanda(null);

    Promise.all([
      apiClient.get<Ruta[]>('/api/v1/rutas', { signal: control.signal }),
      apiClient.get<EstadoDemanda>('/api/v1/demanda/estado', { signal: control.signal }),
    ])
      .then(([rutasDatos, demandaDatos]) => {
        setRutas(rutasDatos ?? []);
        setDemanda(demandaDatos ?? { totalEsperando: 0, umbralSalida: 10, faltanParaSalir: 10, porParada: {} });
      })
      .catch((causa) => setError(causa));

    return () => control.abort();
  }, [intento]);

  return (
    <>
      <h1>Bus electrico de Jalapa</h1>

      {error && <ContadorDemanda error={error} onReintentar={() => setIntento((n) => n + 1)} />}
      {!error && demanda === null && <Cargando texto="Consultando demanda…" />}
      {!error && demanda !== null && (
        <ContadorDemanda
          totalEsperando={demanda.totalEsperando}
          umbralSalida={demanda.umbralSalida}
          faltanParaSalir={demanda.faltanParaSalir}
          nombreParada="Portón azul del Instituto Normal"
        />
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
    </>
  );
}
