import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { AvisoInactividad } from '../../componentes/admin/AvisoInactividad';
import { IconoSalir, SimboloEcoRuta } from '../../componentes/admin/IconosPanel';
import { NavegacionPanel } from '../../componentes/admin/NavegacionPanel';
import { IconoVacio } from '../../componentes/opiniones/IconosOpinion';
import { apiClient } from '../../core/apiClient';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import {
  consultarAbordajes,
  type ConteoDeAbordajes,
  type ConteoPorGrupo,
  type FiltrosAbordajes,
} from '../../core/panelAdmin/panelAdminApi';
import type { Ruta } from '../../core/tipos';
import { useInactividad } from '../../hooks/useInactividad';
import './PanelMunicipal.css';
import './AbordajesPanel.css';

/**
 * Pasajeros subidos, en el panel municipal (SCRUM-26, bloque F, criterio 1).
 *
 * Se cuenta lo que marcó el piloto, que es el dato que prevalece. Lo que
 * respondió el pasajero no entra: mezclar las dos fuentes haría que el número
 * dejara de ser comparable entre rutas, y eso se dice en pantalla para que
 * nadie interprete la cifra como «cuánta gente viajó».
 */

const FILTROS_VACIOS: FiltrosAbordajes = { rutaId: '', vehiculoId: '', desde: '', hasta: '', granularidad: 'dia' };

const entero = new Intl.NumberFormat('es-GT');
const fecha = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface Vehiculo {
  id: number;
  identificador: string;
}

export function AbordajesPanel() {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;
  const [borrador, setBorrador] = useState<FiltrosAbordajes>(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState<FiltrosAbordajes>(FILTROS_VACIOS);
  const [datos, setDatos] = useState<ConteoDeAbordajes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  const siCaduco = useCallback(
    (causa: unknown) => {
      if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
        cerrarSesion('caducada');
        return true;
      }
      return false;
    },
    [cerrarSesion],
  );

  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    apiClient.get<Ruta[]>('/api/v1/rutas', { signal: control.signal }).then((r) => setRutas(r ?? []), () => {});
    apiClient
      .get<Vehiculo[]>('/api/v1/admin/vehiculos', { token, signal: control.signal })
      .then((v) => setVehiculos(v ?? []), () => {});
    return () => control.abort();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    consultarAbordajes(token, filtros, control.signal).then(
      (respuesta) => {
        setDatos(respuesta);
        setError(null);
      },
      (causa) => {
        if (control.signal.aborted || siCaduco(causa)) return;
        setError(
          causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cargar los abordajes.',
        );
      },
    );
    return () => control.abort();
  }, [token, filtros, siCaduco]);

  function aplicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFiltros(borrador);
  }

  function limpiar() {
    setBorrador(FILTROS_VACIOS);
    setFiltros(FILTROS_VACIOS);
  }

  const sinDatos = datos !== null && datos.total === 0;

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
        <div>
          <h1 className="panel-h1">Pasajeros subidos</h1>
          <p className="panel-apoyo">
            Abordajes marcados por el piloto. Lo que responde el pasajero no se cuenta aquí: el dato del
            piloto es el que prevalece.
          </p>
        </div>

        <form className="abordajes-filtros" onSubmit={aplicar}>
          <label className="panel-campo">
            Ruta
            <select
              value={borrador.rutaId}
              onChange={(e) => setBorrador({ ...borrador, rutaId: e.target.value ? Number(e.target.value) : '' })}
            >
              <option value="">Todas las rutas</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="panel-campo">
            Vehículo
            <select
              value={borrador.vehiculoId}
              onChange={(e) =>
                setBorrador({ ...borrador, vehiculoId: e.target.value ? Number(e.target.value) : '' })
              }
            >
              <option value="">Todos los vehículos</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.identificador}
                </option>
              ))}
            </select>
          </label>
          <label className="panel-campo">
            Desde
            <input
              type="date"
              value={borrador.desde}
              onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
            />
          </label>
          <label className="panel-campo">
            Hasta
            <input
              type="date"
              value={borrador.hasta}
              onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
            />
          </label>
          <label className="panel-campo">
            Agrupar por
            <select
              value={borrador.granularidad}
              onChange={(e) =>
                setBorrador({ ...borrador, granularidad: e.target.value as FiltrosAbordajes['granularidad'] })
              }
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </label>
          <button type="submit" className="panel-boton panel-boton--primario">
            Aplicar filtros
          </button>
          <button type="button" className="opiniones-enlace" onClick={limpiar}>
            Limpiar
          </button>
        </form>

        {error && (
          <p className="panel-aviso panel-aviso--error" role="alert">
            <span>{error}</span>
          </p>
        )}

        <div className="panel-resumen">
          <div className="panel-cifra">
            <span className="panel-cifra__etiqueta">Pasajeros subidos en el período</span>
            <span className="panel-cifra__valor tabular">{datos ? entero.format(datos.total) : '—'}</span>
          </div>
          <TarjetaConteo titulo="Por ruta" filas={datos?.porRuta} />
          <TarjetaConteo titulo="Por vehículo" filas={datos?.porVehiculo} />
        </div>

        {sinDatos ? (
          <div className="panel-tabla-marco opiniones-vacio">
            <span className="opiniones-vacio__icono">
              <IconoVacio tamano={32} />
            </span>
            <h2 className="panel-h2">No hay abordajes con estos filtros</h2>
            <p className="panel-apoyo">Prueba con otro rango de fechas o quita algún filtro.</p>
            <button type="button" className="panel-boton panel-boton--secundario" onClick={limpiar}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="panel-tabla-marco">
            <table className="panel-tabla">
              <caption className="panel-ayuda">Abordajes por período</caption>
              <thead>
                <tr>
                  <th scope="col">Período</th>
                  <th scope="col">Pasajeros</th>
                </tr>
              </thead>
              <tbody>
                {(datos?.porPeriodo ?? []).map((fila) => (
                  <tr key={fila.periodo}>
                    <td>{fecha.format(new Date(fila.periodo))}</td>
                    <td className="tabular">{entero.format(fila.abordajes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}

function TarjetaConteo({ titulo, filas }: { titulo: string; filas?: ConteoPorGrupo[] }) {
  return (
    <div className="panel-cifra">
      <span className="panel-cifra__etiqueta">{titulo}</span>
      {!filas || filas.length === 0 ? (
        <span className="panel-ayuda">Sin abordajes en el período</span>
      ) : (
        <ul className="abordajes-conteo">
          {filas.map((fila) => (
            <li key={fila.id}>
              <span className="abordajes-conteo__nombre">{fila.nombre}</span>
              <span className="abordajes-conteo__valor tabular">{entero.format(fila.abordajes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
