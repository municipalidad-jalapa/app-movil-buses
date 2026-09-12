import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useRutas } from '../hooks/useRutas';
import { MapaJalapa } from '../componentes/MapaJalapa';
import { BannerConexion } from '../componentes/BannerConexion';
import { EstadoSinPosicion } from '../componentes/EstadoSinPosicion';
import { HoraUltimoDato } from '../componentes/HoraUltimoDato';
import { MensajeError } from '../componentes/MensajeError';
import './Mapa.css';

/**
 * Pantalla del pasajero: el mapa con la ruta y el bus encima (HU-50 + HU-51).
 *
 * <p>El mapa ocupa la pantalla completa y la informacion va flotando encima,
 * como en `design/EcoRuta.dc.html`. DESIGN.md seccion 8 lo pide explicito: la
 * tarjeta flotante no puede tapar el marcador del bus, por eso va abajo.
 */
export function Mapa() {
  const { rutaActiva, cargando, error, reintentar } = useRutas();
  const { posicion, estadoConexion, recibidoEn, cargaInicialLista } = usePosicionBus();
  const oscuro = usePrefiereOscuro();

  // Sin red no se cae a una pantalla de error: se cae al croquis, que es una
  // pantalla de primera clase (DESIGN.md seccion 7).
  const capa = cargando ? 'cargando' : estadoConexion === 'reconectando' ? 'croquis' : 'mapa';

  return (
    <div className="pantalla-mapa">
      <MapaJalapa
        ruta={rutaActiva}
        posicionBus={posicion}
        capa={capa}
        modo={oscuro ? 'oscuro' : 'claro'}
      />

      <div className="pantalla-mapa__encima">
        <BannerConexion estadoConexion={estadoConexion} />

        {error && (
          <div className="pantalla-mapa__aviso">
            <MensajeError error={error} onReintentar={reintentar} />
          </div>
        )}

        {cargaInicialLista && posicion === null && !error && (
          <div className="pantalla-mapa__aviso">
            <EstadoSinPosicion />
          </div>
        )}
      </div>

      {/* Abajo a proposito: arriba taparia el marcador del bus. */}
      {posicion && recibidoEn && (
        <div className="pantalla-mapa__pie">
          <HoraUltimoDato recibidoEn={recibidoEn} />
        </div>
      )}
    </div>
  );
}
