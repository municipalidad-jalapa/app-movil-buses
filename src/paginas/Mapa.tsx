import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import { MapaRuta } from '../componentes/MapaRuta';
import { useRutas } from '../hooks/useRutas';

/**
 * Pantalla principal del pasajero: muestra el mapa y la ruta disponible.
 */
export function Mapa() {
  const { rutaActiva, paradas, cargando, error, reintentar } = useRutas();

  return (
    <>
      <h1>Bus electrico de Jalapa</h1>
      <MapaRuta ruta={rutaActiva} paradas={paradas} />

      {error && <MensajeError error={error} onReintentar={reintentar} />}
      {!error && cargando && <Cargando texto="Consultando rutas…" />}
      {!cargando && !error && !rutaActiva && <p>No hay rutas activas todavía.</p>}
    </>
  );
}
