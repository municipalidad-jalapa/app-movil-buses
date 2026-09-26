import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MarcoPanel } from '../../componentes/admin/MarcoPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { listarRutasAdmin } from '../../core/panelAdmin/rutasAdminApi';
import {
  asignarVehiculo,
  crearVehiculo,
  listarVehiculos,
  quitarGps,
  vincularGps,
  type Vehiculo,
} from '../../core/panelAdmin/vehiculosAdminApi';
import type { Ruta } from '../../core/tipos';
import './PanelMunicipal.css';
import './Vehiculos.css';

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;
type CambiosVehiculo = { rutaId: number | null; capacidad: number | null; gps: string | null };

const VACIO = { identificador: '', placa: '', rutaId: '', capacidad: '', gps: '' };

/**
 * Vehiculos del panel municipal: dar de alta un bus y decir que ruta recorre,
 * cuanta gente cabe y que GPS lleva. La capacidad da el "hay lugar / casi lleno
 * / lleno" del mapa del pasajero. Cada ruta tiene un solo bus activo, y cada bus
 * un solo GPS: con el IMEI puesto, lo que Traccar reenvie de ese GPS es del bus.
 */
export function Vehiculos() {
  const { sesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [nuevo, setNuevo] = useState(VACIO);

  const cerrar = useRef(cerrarSesion);
  cerrar.current = cerrarSesion;
  const manejarError = useCallback((causa: unknown, porDefecto: string) => {
    if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
      cerrar.current('caducada');
      return;
    }
    setMensaje({ tipo: 'error', texto: causa instanceof ErrorApi ? causa.mensajeParaUsuario() : porDefecto });
  }, []);

  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    Promise.all([listarVehiculos(token, control.signal), listarRutasAdmin(token, control.signal)])
      .then(([lista, todas]) => {
        setVehiculos(lista);
        setRutas(todas);
      })
      .catch((causa) => {
        if (!control.signal.aborted) manejarError(causa, 'No pudimos cargar los vehículos.');
      })
      .finally(() => setCargando(false));
    return () => control.abort();
  }, [token, manejarError]);

  const nombreDeRuta = (id: number | null) => rutas.find((r) => r.id === id)?.nombre ?? 'Sin ruta';

  async function darDeAlta(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!nuevo.identificador.trim() || !nuevo.placa.trim()) {
      setMensaje({ tipo: 'error', texto: 'El bus necesita número y placa.' });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const creado = await crearVehiculo(token, {
        identificador: nuevo.identificador.trim(),
        placa: nuevo.placa.trim(),
        rutaId: nuevo.rutaId ? Number(nuevo.rutaId) : null,
        capacidad: nuevo.capacidad ? Number(nuevo.capacidad) : null,
        gps: nuevo.gps.trim() || null,
      });
      if (creado) {
        setVehiculos((lista) => [...lista, creado].sort((a, b) => a.identificador.localeCompare(b.identificador)));
        setNuevo(VACIO);
        setMensaje({ tipo: 'ok', texto: `Bus ${creado.identificador} dado de alta.` });
      }
    } catch (causa) {
      manejarError(causa, 'No pudimos dar de alta el bus.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarCambios(v: Vehiculo, cambios: CambiosVehiculo) {
    if (!token) return;
    setGuardando(true);
    setMensaje(null);
    try {
      // Dos pedidos a lo sumo. Si el del GPS falla, la fila conserva lo escrito y
      // volver a guardar repite la asignacion sin efecto: es idempotente.
      let respuesta: Vehiculo | null = v;
      if (cambios.rutaId !== v.rutaId || cambios.capacidad !== v.capacidad) {
        respuesta = await asignarVehiculo(token, v.id, { rutaId: cambios.rutaId, capacidad: cambios.capacidad });
      }
      if (cambios.gps !== v.gps) {
        respuesta = cambios.gps ? await vincularGps(token, v.id, cambios.gps) : await quitarGps(token, v.id);
      }
      const actualizado = respuesta;
      if (actualizado) {
        setVehiculos((lista) => lista.map((x) => (x.id === actualizado.id ? actualizado : x)));
        setMensaje({ tipo: 'ok', texto: `Bus ${actualizado.identificador}: cambios guardados.` });
      }
    } catch (causa) {
      manejarError(causa, 'No pudimos guardar los cambios del bus.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <MarcoPanel>
      <main className="panel-principal vehiculos">
        <div className="panel-principal__encabezado">
          <div>
            <h1 className="panel-h1">Vehículos</h1>
            <p className="panel-apoyo">
              Cada ruta tiene un solo bus. La capacidad le dice al pasajero si hay lugar, si va casi lleno o lleno.
              Con el GPS (su IMEI) puesto, el bus aparece en el mapa en cuanto reporta.
            </p>
          </div>
        </div>

        {mensaje && (
          <p
            className={mensaje.tipo === 'ok' ? 'panel-nota' : 'panel-aviso panel-aviso--error'}
            role={mensaje.tipo === 'ok' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </p>
        )}

        <form className="vehiculos__alta" onSubmit={(e) => void darDeAlta(e)} aria-labelledby="vehiculos-alta">
          <h2 id="vehiculos-alta" className="panel-h2">
            Dar de alta un bus
          </h2>
          <div className="vehiculos__campos">
            <label className="panel-campo">
              <span>Número</span>
              <input
                value={nuevo.identificador}
                maxLength={30}
                placeholder="BUS-03"
                onChange={(e) => setNuevo({ ...nuevo, identificador: e.target.value })}
              />
            </label>
            <label className="panel-campo">
              <span>Placa</span>
              <input
                value={nuevo.placa}
                maxLength={15}
                placeholder="P-123ABC"
                onChange={(e) => setNuevo({ ...nuevo, placa: e.target.value })}
              />
            </label>
            <label className="panel-campo">
              <span>Ruta</span>
              <select value={nuevo.rutaId} onChange={(e) => setNuevo({ ...nuevo, rutaId: e.target.value })}>
                <option value="">Sin ruta</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel-campo">
              <span>Capacidad (personas)</span>
              <input
                type="number"
                min={1}
                max={300}
                inputMode="numeric"
                value={nuevo.capacidad}
                onChange={(e) => setNuevo({ ...nuevo, capacidad: e.target.value })}
              />
            </label>
            <label className="panel-campo">
              <span>GPS (IMEI)</span>
              <input
                value={nuevo.gps}
                maxLength={64}
                placeholder="860000000000001"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setNuevo({ ...nuevo, gps: e.target.value })}
              />
            </label>
          </div>
          <button type="submit" className="panel-boton panel-boton--primario" disabled={guardando}>
            Dar de alta
          </button>
        </form>

        {cargando && <p className="panel-apoyo">Cargando vehículos…</p>}

        {!cargando && (
          <div className="panel-tabla-marco">
            <table className="panel-tabla">
              <caption className="panel-h2 vehiculos__titulo-tabla">Buses</caption>
              <thead>
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Placa</th>
                  <th scope="col">Ruta</th>
                  <th scope="col">Capacidad</th>
                  <th scope="col">GPS</th>
                  <th scope="col">
                    <span className="vehiculos__oculto">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map((v) => (
                  <FilaVehiculo
                    key={`${v.id}-${v.rutaId}-${v.capacidad}-${v.gps}`}
                    vehiculo={v}
                    rutas={rutas}
                    nombreDeRuta={nombreDeRuta}
                    guardando={guardando}
                    onGuardar={(cambios) => void guardarCambios(v, cambios)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </MarcoPanel>
  );
}

function FilaVehiculo({
  vehiculo,
  rutas,
  nombreDeRuta,
  guardando,
  onGuardar,
}: {
  vehiculo: Vehiculo;
  rutas: Ruta[];
  nombreDeRuta: (id: number | null) => string;
  guardando: boolean;
  onGuardar: (cambios: CambiosVehiculo) => void;
}) {
  const [rutaId, setRutaId] = useState(vehiculo.rutaId === null ? '' : String(vehiculo.rutaId));
  const [capacidad, setCapacidad] = useState(vehiculo.capacidad === null ? '' : String(vehiculo.capacidad));
  const [gps, setGps] = useState(vehiculo.gps ?? '');
  const cambio =
    rutaId !== (vehiculo.rutaId === null ? '' : String(vehiculo.rutaId)) ||
    capacidad !== (vehiculo.capacidad === null ? '' : String(vehiculo.capacidad)) ||
    gps.trim() !== (vehiculo.gps ?? '');

  return (
    <tr>
      <th scope="row" className="panel-tabla__principal">
        {vehiculo.identificador}
      </th>
      <td>{vehiculo.placa}</td>
      <td>
        <label className="vehiculos__oculto" htmlFor={`ruta-${vehiculo.id}`}>
          Ruta de {vehiculo.identificador}
        </label>
        <select id={`ruta-${vehiculo.id}`} value={rutaId} onChange={(e) => setRutaId(e.target.value)} title={nombreDeRuta(vehiculo.rutaId)}>
          <option value="">Sin ruta</option>
          {rutas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="vehiculos__oculto" htmlFor={`capacidad-${vehiculo.id}`}>
          Capacidad de {vehiculo.identificador}
        </label>
        <input
          id={`capacidad-${vehiculo.id}`}
          className="vehiculos__capacidad"
          type="number"
          min={1}
          max={300}
          inputMode="numeric"
          value={capacidad}
          placeholder="—"
          onChange={(e) => setCapacidad(e.target.value)}
        />
      </td>
      <td>
        <label className="vehiculos__oculto" htmlFor={`gps-${vehiculo.id}`}>
          GPS de {vehiculo.identificador}
        </label>
        <input
          id={`gps-${vehiculo.id}`}
          className="vehiculos__gps"
          value={gps}
          maxLength={64}
          placeholder="Sin GPS"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setGps(e.target.value)}
        />
      </td>
      <td>
        <button
          type="button"
          className="panel-boton panel-boton--secundario"
          disabled={!cambio || guardando}
          onClick={() =>
            onGuardar({
              rutaId: rutaId ? Number(rutaId) : null,
              capacidad: capacidad ? Number(capacidad) : null,
              gps: gps.trim() || null,
            })
          }
        >
          Guardar
        </button>
      </td>
    </tr>
  );
}
