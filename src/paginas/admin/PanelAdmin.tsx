import { useCallback, useEffect, useState } from 'react';
import { AvisoInactividad } from '../../componentes/admin/AvisoInactividad';
import { ChipEstadoServicio } from '../../componentes/admin/ChipEstadoServicio';
import { IconoSalir, SimboloEcoRuta } from '../../componentes/admin/IconosPanel';
import { NavegacionPanel } from '../../componentes/admin/NavegacionPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { consultarServicio, type EstadoServicio, type RutaEnServicio } from '../../core/panelAdmin/panelAdminApi';
import { useInactividad } from '../../hooks/useInactividad';
import './PanelMunicipal.css';

const REFRESCO_MS = 30_000;

const hora = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });

function haceCuanto(iso: string, ahoraMs: number): string {
  const minutos = Math.max(0, Math.round((ahoraMs - Date.parse(iso)) / 60_000));
  return minutos === 0 ? 'hace menos de 1 min' : `hace ${minutos} min`;
}

/** Portada del panel municipal: el servicio completo (SCRUM-173, criterio 6). Canvas: 2 y 3a. */
export function PanelAdmin() {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const [servicio, setServicio] = useState<EstadoServicio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  const token = sesion?.token;
  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    const cargar = async () => {
      try {
        setServicio(await consultarServicio(token, control.signal));
        setError(null);
      } catch (causa) {
        if (control.signal.aborted) return;
        if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
          cerrarSesion('caducada');
          return;
        }
        setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cargar el estado del servicio.');
      }
    };
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), REFRESCO_MS);
    return () => {
      control.abort();
      window.clearInterval(intervalo);
    };
  }, [token, cerrarSesion]);

  const rutas = servicio?.rutas ?? [];
  const enRuta = rutas.filter((r) => r.estado === 'EN_RUTA').length;
  const conBus = rutas.filter((r) => r.bus).length;
  const sinDatos = rutas.filter((r) => r.estado === 'SIN_DATOS_RECIENTES').length;
  const ahoraMs = servicio ? Date.parse(servicio.consultadoEn) : Date.now();

  return (
    <div className="panel-escritorio">
      <header className="panel-cabecera">
        <div className="panel-cabecera__marca">
          <SimboloEcoRuta tamano={30} />
          <span className="panel-cabecera__ecoruta">EcoRuta</span>
          <span className="panel-cabecera__separador" aria-hidden="true" />
          <span className="panel-cabecera__seccion">Panel municipal</span>
          <NavegacionPanel />
        </div>
        <div className="panel-cabecera__usuario">
          <span className="panel-cabecera__correo">{sesion?.correo}</span>
          <button type="button" className="panel-boton panel-boton--cabecera" onClick={() => cerrarSesion()}>
            <IconoSalir />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="panel-principal">
        <div className="panel-principal__encabezado">
          <div>
            <h1 className="panel-h1">Estado del servicio</h1>
            <p className="panel-apoyo">Todas las rutas y sus buses. Se actualiza cada 30 segundos.</p>
          </div>
          {servicio && (
            <p className="panel-ayuda tabular">Actualizado a las {hora.format(new Date(servicio.consultadoEn))}</p>
          )}
        </div>

        {error && (
          <p className="panel-aviso panel-aviso--informativo" role="alert">
            <span>{error}</span>
          </p>
        )}

        <div className="panel-resumen">
          <Cifra etiqueta="Rutas activas" valor={servicio ? String(rutas.length) : '—'} />
          <Cifra etiqueta="Buses en ruta" valor={servicio ? `${enRuta} de ${conBus}` : '—'} />
          <Cifra etiqueta="Buses sin datos recientes" valor={servicio ? String(sinDatos) : '—'} />
        </div>

        <div className="panel-tabla-marco">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Ruta</th>
                <th scope="col">Bus asignado</th>
                <th scope="col">Estado del bus</th>
                <th scope="col" className="panel-tabla__num">Última posición</th>
                <th scope="col" className="panel-tabla__num">Velocidad</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((ruta) => (
                <FilaRuta key={ruta.rutaId} ruta={ruta} ahoraMs={ahoraMs} />
              ))}
              {servicio && rutas.length === 0 && (
                <tr>
                  <td colSpan={5} className="panel-tabla__vacia">
                    No hay rutas activas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="panel-ayuda">«Sin datos recientes»: el bus no envía su posición desde hace más de 2 minutos.</p>
      </main>

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="panel-cifra">
      <span className="panel-cifra__etiqueta">{etiqueta}</span>
      <span className="panel-cifra__valor tabular">{valor}</span>
    </div>
  );
}

function FilaRuta({ ruta, ahoraMs }: { ruta: RutaEnServicio; ahoraMs: number }) {
  const atrasada = ruta.estado === 'SIN_DATOS_RECIENTES';
  return (
    <tr>
      <td className="panel-tabla__ruta">{ruta.nombre}</td>
      <td>
        {ruta.bus ? (
          <>
            <span className="panel-tabla__principal">{ruta.bus.identificador}</span>
            <span className="panel-tabla__secundario">Placa {ruta.bus.placa}</span>
          </>
        ) : (
          <span className="panel-tabla__secundario">—</span>
        )}
      </td>
      <td>
        <ChipEstadoServicio estado={ruta.estado} />
      </td>
      <td className="panel-tabla__num tabular">
        {ruta.posicion ? (
          <>
            <span className="panel-tabla__principal">{hora.format(new Date(ruta.posicion.timestamp))}</span>
            <span className={atrasada ? 'panel-tabla__secundario panel-tabla__atrasada' : 'panel-tabla__secundario'}>
              {haceCuanto(ruta.posicion.timestamp, ahoraMs)}
            </span>
          </>
        ) : (
          <span className="panel-tabla__secundario">Sin posiciones</span>
        )}
      </td>
      <td className="panel-tabla__num tabular">
        {ruta.estado === 'EN_RUTA' && ruta.posicion?.velocidadKmh != null ? (
          <span className="panel-tabla__principal">{Math.round(ruta.posicion.velocidadKmh)} km/h</span>
        ) : (
          <span className="panel-tabla__secundario">—</span>
        )}
      </td>
    </tr>
  );
}
