import { useState } from 'react';
import { Cargando } from '../../componentes/Cargando';
import { HoraUltimoDato } from '../../componentes/HoraUltimoDato';
import { Layout } from '../../componentes/Layout';
import { MensajeError } from '../../componentes/MensajeError';
import { useAuth } from '../../core/autenticacion/useAuth';
import { proximaPendiente, totalEsperando } from '../../core/panelConductor';
import type { EstadoDelBusEta } from '../../core/tipos';
import { usePanelConductor } from '../../hooks/usePanelConductor';
import { FilaParadaConductor } from './FilaParadaConductor';
import './PanelConductor.css';

/**
 * Panel del conductor (HU-62, HU-75, HU-76). QA 4.3 y 5.3: se habia perdido en
 * la migracion y quedaba solo un placeholder.
 *
 * <p>Las paradas en el orden del recorrido, cuanta gente espera en cada una,
 * cuantos minutos faltan y el boton para marcarla atendida, que cierra sus
 * reservas. Se actualiza solo. La ruta no se elige: la da la sesion.
 */
export function PanelConductor() {
  const { usuario, cerrarSesion } = useAuth();
  const { panel, cargando, error, actualizadoEn, marcando, marcarAtendida, reintentar } = usePanelConductor();
  const [aviso, setAviso] = useState<string | null>(null);

  const paradas = panel?.paradas ?? [];
  const proxima = proximaPendiente(paradas);

  async function marcar(paradaId: number) {
    setAviso(await marcarAtendida(paradaId));
  }

  return (
    <Layout>
      <section className="panel-conductor">
        <header className="panel-conductor__cabecera">
          <div>
            <h1>{panel ? panel.rutaNombre : 'Paradas de tu recorrido'}</h1>
            <p>Sesión de {usuario?.correo}</p>
          </div>
          <button type="button" className="panel-conductor__salir" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
        </header>

        {panel && (
          <div className="panel-conductor__resumen">
            <Cifra rotulo="Esperando en total" valor={String(totalEsperando(paradas))} />
            <Cifra rotulo="Próxima parada" valor={proxima?.nombre ?? '—'} texto />
            <Cifra rotulo="El bus" valor={textoBus(panel.estadoBus)} texto />
          </div>
        )}

        {aviso && (
          <p className="panel-conductor__aviso" role="status">
            {aviso}
          </p>
        )}

        {/* 403: la sesion es de conductor pero no tiene ruta. Es un tramite,
            no un error de la app: se dice que hacer. */}
        {error?.status === 403 ? (
          <p className="panel-conductor__vacio" role="alert">
            No tenés una ruta asignada. Pedile a la Municipalidad que te asigne una.
          </p>
        ) : (
          error && (
            <div>
              <MensajeError error={error} onReintentar={reintentar} />
            </div>
          )
        )}

        {cargando && !error && <Cargando texto="Cargando paradas…" />}

        {!cargando && panel && paradas.length === 0 && (
          <p className="panel-conductor__vacio">Todavía no hay paradas en tu ruta.</p>
        )}

        {paradas.length > 0 && panel && (
          <ul className="panel-conductor__lista" aria-label="Paradas del recorrido">
            {paradas.map((parada) => (
              <FilaParadaConductor
                key={parada.paradaId}
                parada={parada}
                estadoBus={panel.estadoBus}
                proxima={proxima?.paradaId === parada.paradaId}
                marcando={marcando === parada.paradaId}
                onMarcar={() => void marcar(parada.paradaId)}
              />
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

function Cifra({ rotulo, valor, texto = false }: { rotulo: string; valor: string; texto?: boolean }) {
  return (
    <div className="panel-conductor__cifra">
      <span className="panel-conductor__cifra-rotulo">{rotulo}</span>
      <span
        className={
          texto ? 'panel-conductor__cifra-valor panel-conductor__cifra-valor--texto' : 'panel-conductor__cifra-valor tabular'
        }
      >
        {valor}
      </span>
    </div>
  );
}

function textoBus(estado: EstadoDelBusEta): string {
  switch (estado) {
    case 'EN_RUTA':
      return 'En ruta';
    case 'DETENIDO_EN_PARADA':
      return 'Detenido en parada';
    case 'DETENIDO_FUERA_DE_PARADA':
      return 'Detenido';
    case 'EN_DESVIO':
      return 'Fuera del trazado';
    case 'SIN_DATOS':
      return 'Sin ubicación';
  }
}
