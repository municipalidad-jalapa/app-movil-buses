import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarcoPanel } from '../../componentes/admin/MarcoPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { largoEnMetros, pasoDeRuta, textoLargo, TEXTO_PASO } from '../../core/panelAdmin/geometriaRuta';
import { crearRuta, eliminarRuta, listarRutasAdmin } from '../../core/panelAdmin/rutasAdminApi';
import { listarVehiculos, type Vehiculo } from '../../core/panelAdmin/vehiculosAdminApi';
import type { Ruta } from '../../core/tipos';
import './PanelMunicipal.css';
import './Rutas.css';

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;

/**
 * Las rutas del panel municipal (informe de QA, panel del administrador):
 * en que va cada una, crear una nueva y eliminarla con confirmacion. Al crearla
 * se abre el editor, donde se dibuja con el lapiz.
 */
export function Rutas() {
  const { sesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;
  const navegar = useNavigate();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Ruta | null>(null);

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
    Promise.all([listarRutasAdmin(token, control.signal), listarVehiculos(token, control.signal)])
      .then(([todas, buses]) => {
        setRutas(todas);
        setVehiculos(buses);
      })
      .catch((causa) => {
        if (!control.signal.aborted) manejarError(causa, 'No pudimos cargar las rutas.');
      })
      .finally(() => setCargando(false));
    return () => control.abort();
  }, [token, manejarError]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'La ruta necesita un nombre.' });
      return;
    }
    setCreando(true);
    setMensaje(null);
    try {
      const nueva = await crearRuta(token, nombre.trim());
      if (nueva) navegar(`/admin/rutas/${nueva.id}`);
    } catch (causa) {
      manejarError(causa, 'No pudimos crear la ruta.');
    } finally {
      setCreando(false);
    }
  }

  function eliminada(ruta: Ruta) {
    setPorEliminar(null);
    setRutas((lista) => lista.filter((r) => r.id !== ruta.id));
    setMensaje({ tipo: 'ok', texto: `Ruta «${ruta.nombre}» eliminada.` });
  }

  const busDe = (ruta: Ruta) => vehiculos.find((v) => v.rutaId === ruta.id && v.activo)?.identificador ?? null;

  return (
    <MarcoPanel>
      <main className="panel-principal rutas">
        <div className="panel-principal__encabezado">
          <div>
            <h1 className="panel-h1">Rutas</h1>
            <p className="panel-apoyo">
              Dibujá el recorrido con el lápiz, creá las paradas con clic derecho y publicala. Todo se guarda solo
              mientras trabajás.
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

        <form className="rutas__nueva" onSubmit={(e) => void crear(e)} aria-labelledby="rutas-nueva">
          <div className="rutas__nueva-textos">
            <h2 id="rutas-nueva" className="panel-h2">
              Nueva ruta
            </h2>
            <p className="panel-apoyo">Nace como borrador: los pasajeros no la ven hasta que la publiqués.</p>
          </div>
          <label className="panel-campo rutas__nueva-campo">
            <span>Nombre de la ruta</span>
            <input
              value={nombre}
              maxLength={100}
              placeholder="Por ejemplo RUTA NORTE"
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <button type="submit" className="panel-boton panel-boton--primario" disabled={creando}>
            Empezar a dibujar
          </button>
        </form>

        {cargando && <p className="panel-apoyo">Cargando rutas…</p>}
        {!cargando && rutas.length === 0 && <p className="panel-apoyo">Todavía no hay rutas. Creá la primera.</p>}

        {rutas.length > 0 && (
          <ul className="rutas__lista" aria-label="Rutas creadas">
            {rutas.map((r) => {
              const paso = pasoDeRuta(r);
              const bus = busDe(r);
              return (
                <li key={r.id} className={paso === 'publicada' ? 'rutas__fila' : 'rutas__fila rutas__fila--borrador'}>
                  <div className="rutas__nombre">
                    <h2 className="rutas__titulo">{r.nombre}</h2>
                    <span className={paso === 'publicada' ? 'rutas__estado rutas__estado--publicada' : 'rutas__estado'}>
                      {paso === 'publicada' ? 'Publicada' : 'Borrador'}
                    </span>
                  </div>
                  <span className="rutas__paso">{TEXTO_PASO[paso]}</span>
                  <span className="rutas__dato tabular">
                    {r.trazado.length > 1 ? textoLargo(largoEnMetros(r.trazado)) : 'Sin recorrido'}
                  </span>
                  <span className="rutas__dato tabular">
                    {r.paradas.length} {r.paradas.length === 1 ? 'parada' : 'paradas'}
                  </span>
                  <span className="rutas__dato">{bus ?? 'Sin bus'}</span>
                  <div className="rutas__acciones">
                    <Link
                      to={`/admin/rutas/${r.id}`}
                      className={
                        paso === 'publicada'
                          ? 'panel-boton panel-boton--secundario'
                          : 'panel-boton panel-boton--primario'
                      }
                    >
                      {paso === 'publicada' ? 'Editar' : 'Seguir editando'}
                    </Link>
                    <button
                      type="button"
                      className="rutas__eliminar"
                      aria-label={`Eliminar ${r.nombre}`}
                      onClick={() => setPorEliminar(r)}
                    >
                      <IconoBasurero />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="panel-apoyo">
          Eliminar una ruta la saca del mapa del pasajero y del panel del conductor. Sus viajes, paradas atendidas y
          opiniones se conservan en los reportes.
        </p>
      </main>

      {porEliminar && token && (
        <ConfirmarEliminacion
          ruta={porEliminar}
          token={token}
          onCancelar={() => setPorEliminar(null)}
          onEliminada={eliminada}
          onError={(causa) => manejarError(causa, 'No pudimos eliminar la ruta.')}
        />
      )}
    </MarcoPanel>
  );
}

/** Confirmar escribiendo el nombre: evita eliminar una ruta por error. */
function ConfirmarEliminacion({
  ruta,
  token,
  onCancelar,
  onEliminada,
  onError,
}: {
  ruta: Ruta;
  token: string;
  onCancelar: () => void;
  onEliminada: (ruta: Ruta) => void;
  onError: (causa: unknown) => void;
}) {
  const [texto, setTexto] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const coincide = texto.trim().toLocaleUpperCase('es') === ruta.nombre.trim().toLocaleUpperCase('es');

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCancelar]);

  async function eliminar(e: FormEvent) {
    e.preventDefault();
    if (!coincide) return;
    setEliminando(true);
    try {
      await eliminarRuta(token, ruta.id);
      onEliminada(ruta);
    } catch (causa) {
      onError(causa);
      onCancelar();
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="rutas__velo" onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <form
        className="rutas__dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eliminar-titulo"
        onSubmit={(e) => void eliminar(e)}
      >
        <div className="rutas__dialogo-cabeza">
          <span className="rutas__dialogo-icono" aria-hidden="true">
            <IconoBasurero />
          </span>
          <h2 id="eliminar-titulo" className="panel-h2">
            ¿Eliminar la ruta {ruta.nombre}?
          </h2>
        </div>
        <ul className="rutas__consecuencias">
          <li>Deja de verse en el mapa de los pasajeros y en el panel del conductor.</li>
          {ruta.paradas.length > 0 && (
            <li>
              Sus {ruta.paradas.length} {ruta.paradas.length === 1 ? 'parada sale' : 'paradas salen'} con ella y las
              reservas que tengan se cancelan.
            </li>
          )}
          <li>Los viajes, paradas atendidas y opiniones que ya tiene se conservan en los reportes.</li>
        </ul>
        <label className="panel-campo">
          <span>
            Para confirmar, escribí <strong className="rutas__codigo">{ruta.nombre}</strong>
          </span>
          <input value={texto} autoComplete="off" autoFocus onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="rutas__dialogo-acciones">
          <button type="button" className="panel-boton panel-boton--secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="panel-boton rutas__boton-peligro" disabled={!coincide || eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar ruta'}
          </button>
        </div>
      </form>
    </div>
  );
}

function IconoBasurero() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
