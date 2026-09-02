import { usePosicionBus } from '../hooks/usePosicionBus';
import { BannerConexion } from './BannerConexion';
import { EstadoSinPosicion } from './EstadoSinPosicion';
import { HoraUltimoDato } from './HoraUltimoDato';
import { MarcadorBus } from './MarcadorBus';
import './SeguimientoBus.css';

/**
 * Piezas de HU-51 sobre el hook ya existente.
 * El mapa real (HU-50) se inyectara en MarcadorBus cuando exista.
 */
export function SeguimientoBus() {
  const { posicion, estadoConexion, recibidoEn, cargaInicialLista } = usePosicionBus();

  return (
    <section className="seguimiento-bus" aria-label="Dónde va el bus">
      <BannerConexion estadoConexion={estadoConexion} />

      {cargaInicialLista && posicion === null && <EstadoSinPosicion />}

      {posicion && recibidoEn && <HoraUltimoDato recibidoEn={recibidoEn} />}

      <MarcadorBus posicion={posicion} mapa={null} />
    </section>
  );
}
