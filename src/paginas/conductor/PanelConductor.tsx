import { Cargando } from '../../componentes/Cargando';
import { HoraUltimoDato } from '../../componentes/HoraUltimoDato';
import { Layout } from '../../componentes/Layout';
import { MensajeError } from '../../componentes/MensajeError';
import { useAuth } from '../../core/autenticacion/useAuth';
import { usePanelConductor } from '../../hooks/usePanelConductor';
import { FilaParadaConductor } from './FilaParadaConductor';
import './PanelConductor.css';

/**
 * Panel del conductor (HU-75): ETA y reservas activas de cada parada de su
 * recorrido, pensado para consultarse en segundos y sin navegar (criterio de
 * aceptacion). La ruta nunca se elige aca: la deduce `usePanelConductor` de la
 * sesion (ADR-009, una sola ruta activa).
 */
export function PanelConductor() {
  const { usuario, cerrarSesion } = useAuth();
  const { filas, cargando, error, actualizadoEn, reintentar } = usePanelConductor();

  return (
    <Layout>
      <section className="panel-conductor">
        <header className="panel-conductor__cabecera">
          <div>
            <h1>Paradas de tu recorrido</h1>
            <p>Sesión de {usuario?.correo}</p>
          </div>
          <button type="button" className="panel-conductor__salir" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
        </header>

        {error && (
          <div className="panel-conductor__aviso">
            <MensajeError error={error} onReintentar={reintentar} />
          </div>
        )}

        {cargando && !error && <Cargando texto="Cargando paradas…" />}

        {!cargando && !error && filas.length === 0 && (
          <p className="panel-conductor__vacio">Todavía no hay paradas asignadas a tu recorrido.</p>
        )}

        {!cargando && filas.length > 0 && (
          <ul className="panel-conductor__lista">
            {filas.map((fila) => (
              <FilaParadaConductor key={fila.paradaId} fila={fila} />
            ))}
          </ul>
        )}

        {actualizadoEn && (
          <div className="panel-conductor__pie">
            <HoraUltimoDato recibidoEn={actualizadoEn} />
          </div>
        )}
      </section>
    </Layout>
  );
}
