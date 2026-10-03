import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapaDeDibujo,
  type ControlMapaDeDibujo,
  type Herramienta,
} from '../../componentes/admin/MapaDeDibujo';
import { MarcoPanel } from '../../componentes/admin/MarcoPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import {
  borrar,
  continuar,
  coser,
  largoEnMetros,
  lugarDeParada,
  metrosEntre,
  paradasLejos,
  proyectar,
  simplificar,
  textoLargo,
} from '../../core/panelAdmin/geometriaRuta';
import {
  agregarParada,
  ajustarACalles,
  eliminarParada,
  guardarParada,
  guardarTrazado,
  listarRutasAdmin,
  publicarRuta,
  type PuntoGeo,
} from '../../core/panelAdmin/rutasAdminApi';
import { asignarVehiculo, listarVehiculos, type Vehiculo } from '../../core/panelAdmin/vehiculosAdminApi';
import type { Ruta } from '../../core/tipos';
import './PanelMunicipal.css';
import './EditorRuta.css';

type Guardado = 'guardado' | 'guardando' | 'error';
type Paso = 'recorrido' | 'revisar';
type Aviso = { tipo: 'ok' | 'info' | 'error'; texto: string } | null;

/** Espera tras el ultimo cambio antes de guardar el recorrido. */
export const ESPERA_GUARDADO_MS = 700;

/**
 * El editor de una ruta (informe de QA, panel del administrador).
 *
 * <p>Paso 2, recorrido y paradas: el lapiz dibuja a mano y cada trazo se
 * ajusta a las calles y se suma al final del recorrido, asi el orden nunca se
 * rompe; el borrador quita lo que sobra y, si deja un hueco en medio, lo vuelve
 * a unir por las calles; clic derecho (o mantener presionado) crea una parada
 * donde se marco, pegada a la linea y numerada segun el recorrido. Paso 3:
 * revisar y publicar.
 *
 * <p>No hay boton de guardar: el recorrido se guarda solo tras cada cambio y
 * las paradas al crearlas, moverlas o renombrarlas. El indicador lo dice.
 */
export function EditorRuta() {
  const { rutaId } = useParams();
  const id = Number(rutaId);
  const { sesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;

  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [trazado, setTrazado] = useState<PuntoGeo[]>([]);
  const [historial, setHistorial] = useState<PuntoGeo[][]>([]);
  const [rehechos, setRehechos] = useState<PuntoGeo[][]>([]);
  const [pendiente, setPendiente] = useState<PuntoGeo[] | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta>('lapiz');
  const [guardado, setGuardado] = useState<Guardado>('guardado');
  const [aviso, setAviso] = useState<Aviso>(null);
  const [paso, setPaso] = useState<Paso>('recorrido');
  const [panelOculto, setPanelOculto] = useState(false);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [nombres, setNombres] = useState<Record<number, string>>({});
  const [nuevaId, setNuevaId] = useState<number | null>(null);
  const control = useRef<ControlMapaDeDibujo | null>(null);

  // El recorrido en una ref tambien: los ajustes llegan por red y se suman al
  // recorrido de ESE momento, no al de cuando empezo el trazo.
  const trazadoActual = useRef<PuntoGeo[]>([]);
  trazadoActual.current = trazado;
  const porGuardar = useRef<{ temporizador: number; puntos: PuntoGeo[] } | null>(null);

  const cerrar = useRef(cerrarSesion);
  cerrar.current = cerrarSesion;
  const manejarError = useCallback((causa: unknown, porDefecto: string) => {
    if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
      cerrar.current('caducada');
      return;
    }
    setAviso({ tipo: 'error', texto: causa instanceof ErrorApi ? causa.mensajeParaUsuario() : porDefecto });
  }, []);

  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    listarRutasAdmin(token, control.signal)
      .then((todas) => {
        const esta = todas.find((r) => r.id === id);
        if (!esta) {
          setNoExiste(true);
          return;
        }
        setRuta(esta);
        setTrazado(esta.trazado);
      })
      .catch((causa) => {
        if (!control.signal.aborted) manejarError(causa, 'No pudimos cargar la ruta.');
      })
      .finally(() => setCargando(false));
    return () => control.abort();
  }, [token, id, manejarError]);

  // --- Guardado automatico del recorrido ---------------------------------
  const guardarAhora = useCallback(
    async (puntos: PuntoGeo[]) => {
      if (!token) return;
      setGuardado('guardando');
      try {
        const actualizada = await guardarTrazado(token, id, puntos);
        if (actualizada) setRuta(actualizada);
        setGuardado('guardado');
      } catch (causa) {
        setGuardado('error');
        manejarError(causa, 'No pudimos guardar el recorrido. Revisá la conexión.');
      }
    },
    [token, id, manejarError],
  );

  const programarGuardado = useCallback(
    (puntos: PuntoGeo[]) => {
      if (porGuardar.current) window.clearTimeout(porGuardar.current.temporizador);
      setGuardado('guardando');
      porGuardar.current = {
        puntos,
        temporizador: window.setTimeout(() => {
          porGuardar.current = null;
          void guardarAhora(puntos);
        }, ESPERA_GUARDADO_MS),
      };
    },
    [guardarAhora],
  );

  // Al salir con un cambio sin mandar, se manda igual: nada se pierde.
  useEffect(
    () => () => {
      const falta = porGuardar.current;
      if (falta) {
        window.clearTimeout(falta.temporizador);
        void guardarAhora(falta.puntos);
      }
    },
    [guardarAhora],
  );

  function cambiarTrazado(nuevo: PuntoGeo[]) {
    // El anterior se toma ya: la actualizacion funcional corre despues, cuando
    // la ref ya apunta al nuevo.
    const anterior = trazadoActual.current;
    setHistorial((h) => [...h, anterior]);
    setRehechos([]);
    setTrazado(nuevo);
    trazadoActual.current = nuevo;
    programarGuardado(nuevo);
  }

  function deshacer() {
    if (!historial.length) return;
    const anterior = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setRehechos((r) => [...r, trazado]);
    setTrazado(anterior);
    programarGuardado(anterior);
  }

  function rehacer() {
    if (!rehechos.length) return;
    const siguiente = rehechos[rehechos.length - 1];
    setRehechos((r) => r.slice(0, -1));
    setHistorial((h) => [...h, trazado]);
    setTrazado(siguiente);
    programarGuardado(siguiente);
  }

  // --- El lapiz -------------------------------------------------------------
  async function alTrazar(crudo: PuntoGeo[]) {
    if (!token) return;
    setPendiente(crudo);
    setAviso(null);
    const fin = trazadoActual.current.at(-1);
    const puntos = (fin ? [fin, ...crudo] : crudo).slice(0, 5000);
    try {
      const respuesta = await ajustarACalles(token, puntos);
      const ajustado = respuesta?.ajustado === true;
      const tramo = ajustado ? respuesta.puntos : simplificar(puntos);
      if (!ajustado) {
        setAviso({ tipo: 'info', texto: 'Ese tramo no pasa por calles conocidas: quedó como lo dibujaste.' });
      }
      cambiarTrazado(continuar(trazadoActual.current, tramo));
    } catch (causa) {
      manejarError(causa, 'No pudimos ajustar el tramo a las calles. Probá de nuevo.');
    } finally {
      setPendiente(null);
    }
  }

  // --- El borrador ----------------------------------------------------------
  async function alBorrar(goma: PuntoGeo[], radio: number) {
    if (!token) return;
    const borrado = borrar(trazadoActual.current, goma, radio);
    if (!borrado) return;
    setAviso(null);
    const [primero, ...siguientes] = borrado.quedan;
    // Se borro una punta (o todo): el recorrido queda recortado ahi.
    if (!siguientes.length) {
      cambiarTrazado(primero ?? []);
      return;
    }
    // Se borro en medio: el recorrido es una sola linea, los pedazos se vuelven
    // a unir por las calles. Mientras, el hueco se ve punteado.
    setPendiente(borrado.quedan.slice(1).flatMap((pedazo, i) => [borrado.quedan[i].at(-1)!, pedazo[0]]));
    try {
      let unido = primero;
      let enRecta = false;
      for (const pedazo of siguientes) {
        const hueco = [unido.at(-1)!, pedazo[0]];
        if (metrosEntre(hueco[0], hueco[1]) < 2) {
          unido = continuar(unido, pedazo);
          continue;
        }
        const respuesta = await ajustarACalles(token, hueco);
        const ajustado = respuesta?.ajustado === true;
        if (!ajustado) enRecta = true;
        unido = coser(unido, ajustado ? respuesta.puntos : hueco, pedazo);
      }
      if (enRecta) {
        setAviso({ tipo: 'info', texto: 'El hueco no se pudo unir por calles conocidas: quedó en línea recta.' });
      }
      cambiarTrazado(unido);
    } catch (causa) {
      manejarError(causa, 'No pudimos volver a unir el recorrido. No se borró nada, probá de nuevo.');
    } finally {
      setPendiente(null);
    }
  }

  // --- Paradas --------------------------------------------------------------
  async function crearParada(marcado: PuntoGeo) {
    if (!token || !ruta) return;
    const lugar = lugarDeParada(trazado, marcado);
    const antes = new Set(ruta.paradas.map((p) => p.id));
    setGuardado('guardando');
    try {
      const actualizada = await agregarParada(token, id, { nombre: `Parada ${ruta.paradas.length + 1}`, ...lugar });
      if (actualizada) {
        setRuta(actualizada);
        setNuevaId(actualizada.paradas.find((p) => !antes.has(p.id))?.id ?? null);
        setHojaAbierta(true);
      }
      setGuardado('guardado');
    } catch (causa) {
      setGuardado('error');
      manejarError(causa, 'No pudimos crear la parada.');
    }
  }

  async function moverParada(paradaId: number, punto: PuntoGeo) {
    const parada = ruta?.paradas.find((p) => p.id === paradaId);
    if (!token || !parada) return;
    setGuardado('guardando');
    try {
      const actualizada = await guardarParada(token, id, paradaId, {
        nombre: parada.nombre,
        ...lugarDeParada(trazado, punto),
      });
      if (actualizada) setRuta(actualizada);
      setGuardado('guardado');
    } catch (causa) {
      setGuardado('error');
      manejarError(causa, 'No pudimos mover la parada.');
    }
  }

  async function renombrar(paradaId: number) {
    const parada = ruta?.paradas.find((p) => p.id === paradaId);
    const nombre = nombres[paradaId]?.trim();
    setNombres(({ [paradaId]: _, ...resto }) => resto);
    if (!token || !parada || !nombre || nombre === parada.nombre) return;
    setGuardado('guardando');
    try {
      const actualizada = await guardarParada(token, id, paradaId, {
        nombre,
        latitud: parada.latitud,
        longitud: parada.longitud,
      });
      if (actualizada) setRuta(actualizada);
      setGuardado('guardado');
    } catch (causa) {
      setGuardado('error');
      manejarError(causa, 'No pudimos cambiar el nombre de la parada.');
    }
  }

  async function quitarParada(paradaId: number) {
    if (!token) return;
    setGuardado('guardando');
    try {
      const actualizada = await eliminarParada(token, id, paradaId);
      if (actualizada) setRuta(actualizada);
      setGuardado('guardado');
    } catch (causa) {
      setGuardado('guardado');
      manejarError(causa, 'No pudimos quitar la parada.');
    }
  }

  if (cargando || noExiste || !ruta) {
    return (
      <MarcoPanel>
        <main className="panel-principal">
          {cargando && <p className="panel-apoyo">Cargando la ruta…</p>}
          {noExiste && (
            <p className="panel-aviso panel-aviso--error" role="alert">
              Esa ruta no existe o se eliminó.
            </p>
          )}
          {aviso && !cargando && !noExiste && (
            <p className="panel-aviso panel-aviso--error" role="alert">
              {aviso.texto}
            </p>
          )}
          <Link to="/admin/rutas" className="panel-boton panel-boton--secundario editor__volver-lista">
            Volver a las rutas
          </Link>
        </main>
      </MarcoPanel>
    );
  }

  const metros = largoEnMetros(trazado);
  const paradas = ruta.paradas;
  const editable = paso === 'recorrido';

  /** Al cambiar de paso la hoja del telefono se abre: el paso se ve, no queda escondido. */
  function irA(siguiente: Paso) {
    setPaso(siguiente);
    setHojaAbierta(true);
  }

  return (
    <MarcoPanel>
      <main className={panelOculto ? 'editor editor--sin-panel' : 'editor'}>
        <div className="editor__barra">
          <Link to="/admin/rutas" className="editor__atras" aria-label="Volver a las rutas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          </Link>
          <div className="editor__titulo">
            <div className="editor__nombre">
              <h1>{ruta.nombre}</h1>
              <span className={ruta.activa ? 'editor__estado editor__estado--publicada' : 'editor__estado'}>
                {ruta.activa ? 'Publicada' : 'Borrador'}
              </span>
            </div>
            <ol className="editor__pasos" aria-label="Pasos para crear la ruta">
              <li className="editor__paso editor__paso--hecho" data-n="1">Nombre</li>
              <li className={paso === 'recorrido' ? 'editor__paso editor__paso--actual' : 'editor__paso editor__paso--hecho'}
                data-n="2" aria-current={paso === 'recorrido' ? 'step' : undefined}>
                Recorrido y paradas
              </li>
              <li className={paso === 'revisar' ? 'editor__paso editor__paso--actual' : 'editor__paso'}
                data-n="3" aria-current={paso === 'revisar' ? 'step' : undefined}>
                Revisar y publicar
              </li>
            </ol>
          </div>
          <IndicadorGuardado estado={guardado} onReintentar={() => void guardarAhora(trazado)} />
          {paso === 'recorrido' ? (
            <button type="button" className="panel-boton panel-boton--primario editor__siguiente" onClick={() => irA('revisar')}>
              Siguiente: revisar
            </button>
          ) : (
            <button type="button" className="panel-boton panel-boton--secundario editor__siguiente" onClick={() => irA('recorrido')}>
              Volver al recorrido
            </button>
          )}
        </div>

        {aviso && (
          <p
            className={
              aviso.tipo === 'error'
                ? 'panel-aviso panel-aviso--error editor__aviso'
                : aviso.tipo === 'info'
                  ? 'panel-aviso panel-aviso--informativo editor__aviso'
                  : 'panel-nota editor__aviso'
            }
            role={aviso.tipo === 'error' ? 'alert' : 'status'}
          >
            {aviso.texto}
            <button type="button" className="editor__cerrar-aviso" aria-label="Cerrar el aviso" onClick={() => setAviso(null)}>
              ×
            </button>
          </p>
        )}

        <div className="editor__cuerpo">
          <div className="editor__mapa">
            <MapaDeDibujo
              trazado={trazado}
              pendiente={pendiente}
              paradas={paradas}
              herramienta={editable ? herramienta : 'mano'}
              editable={editable}
              onTrazo={(crudo) => void alTrazar(crudo)}
              onBorrar={(goma, radio) => void alBorrar(goma, radio)}
              onCrearParada={(punto) => void crearParada(punto)}
              onMoverParada={(pid, punto) => void moverParada(pid, punto)}
              claveEncuadre={ruta.id}
              control={control}
            />

            {editable && (
              <div className="editor__herramientas" role="toolbar" aria-label="Herramientas del mapa">
                <button type="button" aria-pressed={herramienta === 'lapiz'} className="editor__herramienta"
                  onClick={() => setHerramienta('lapiz')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></svg>
                  <span className="editor__herramienta-texto">Lápiz</span>
                </button>
                <button type="button" aria-pressed={herramienta === 'borrador'} className="editor__herramienta"
                  onClick={() => setHerramienta('borrador')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 20l-5-5L14 5l6 6-9 9" /><path d="M9 20h11" /><path d="M8.5 10.5l5 5" /></svg>
                  <span className="editor__herramienta-texto">Borrador</span>
                </button>
                <button type="button" aria-pressed={herramienta === 'mano'} className="editor__herramienta"
                  onClick={() => setHerramienta('mano')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.5-1.7L7 14" /></svg>
                  <span className="editor__herramienta-texto">Mano</span>
                </button>
                <span className="editor__separador" aria-hidden="true" />
                <button type="button" className="editor__icono" aria-label="Deshacer" onClick={deshacer}
                  disabled={!historial.length || pendiente !== null}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
                </button>
                <button type="button" className="editor__icono" aria-label="Rehacer" onClick={rehacer}
                  disabled={!rehechos.length || pendiente !== null}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
                </button>
                <button type="button" className="editor__icono" aria-label="Ver toda la ruta" onClick={() => control.current?.verTodo()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                </button>
              </div>
            )}

            {editable && (
              <p className="editor__pista" aria-live="polite">
                {pendiente
                  ? 'Ajustando el recorrido a las calles…'
                  : herramienta === 'mano'
                    ? 'Arrastrá el mapa o una parada. Volvé al Lápiz para seguir dibujando.'
                    : herramienta === 'borrador'
                      ? 'Pasá el Borrador por encima de lo que sobra: lo marcado en rojo se quita al soltar.'
                    : trazado.length
                      ? 'Arrastrá con el Lápiz para seguir desde el punto amarillo. Clic derecho o mantener presionado: crear parada.'
                      : 'Con el Lápiz, arrastrá por las calles desde donde arranca el bus.'}
              </p>
            )}

            <button type="button" className="editor__mostrar-panel" onClick={() => setPanelOculto(false)}>
              Mostrar panel
            </button>
          </div>

          <aside className={hojaAbierta ? 'editor__panel editor__panel--abierto' : 'editor__panel'} aria-label="Detalles de la ruta">
            <button type="button" className="editor__asa" aria-expanded={hojaAbierta} onClick={() => setHojaAbierta((v) => !v)}>
              <span aria-hidden="true" className="editor__asa-linea" />
              <span className="editor__resumen">
                <strong className="tabular">{metros > 0 ? textoLargo(metros) : 'Sin recorrido'}</strong>
                {' · '}
                <strong className="tabular">{paradas.length}</strong> {paradas.length === 1 ? 'parada' : 'paradas'}
              </span>
            </button>
            <button type="button" className="editor__ocultar-panel" onClick={() => setPanelOculto(true)}>
              Ocultar panel
            </button>

            {paso === 'recorrido' ? (
              <>
                <section className="editor__bloque editor__como" aria-labelledby="editor-como">
                  <h2 id="editor-como">Cómo se arma</h2>
                  <ul>
                    <li><strong>Lápiz:</strong> arrastrá por donde pasa el bus. Al soltar, el trazo se ajusta a las calles y se suma al final.</li>
                    <li><strong>Borrador:</strong> pasalo por lo que sobra. Si borrás en medio, los dos pedazos se vuelven a unir por las calles.</li>
                    <li><strong>Ruta larga:</strong> al llegar al borde el mapa se corre solo. También podés usar la Mano o dos dedos.</li>
                    <li><strong>Clic derecho</strong> (o mantener presionado) → <strong>Crear parada aquí</strong>. Se numera sola según el recorrido.</li>
                  </ul>
                </section>

                <section className="editor__bloque editor__paradas" aria-labelledby="editor-paradas">
                  <div className="editor__bloque-cabeza">
                    <h2 id="editor-paradas">Paradas</h2>
                    <span>en orden de paso</span>
                  </div>
                  {paradas.length === 0 && (
                    <p className="editor__vacio">Todavía no hay paradas. Hacé clic derecho sobre el recorrido.</p>
                  )}
                  <ol className="editor__lista">
                    {paradas.map((p) => {
                      const lugar = proyectar(trazado, p);
                      return (
                        <li key={p.id} className={p.id === nuevaId ? 'editor__parada editor__parada--nueva' : 'editor__parada'}>
                          <span className="editor__orden">{p.orden}</span>
                          <label className="editor__campo">
                            <span>
                              {p.id === nuevaId
                                ? 'Nueva: poné el nombre'
                                : lugar
                                  ? lugar.recorrido < 1
                                    ? 'Inicio'
                                    : `a ${textoLargo(lugar.recorrido)} del inicio`
                                  : 'Sin recorrido todavía'}
                            </span>
                            <input
                              value={nombres[p.id] ?? p.nombre}
                              maxLength={100}
                              autoFocus={p.id === nuevaId}
                              aria-label={`Nombre de la parada ${p.orden}`}
                              onChange={(e) => setNombres((n) => ({ ...n, [p.id]: e.target.value }))}
                              onBlur={() => {
                                if (p.id === nuevaId) setNuevaId(null);
                                void renombrar(p.id);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            />
                          </label>
                          <button type="button" className="editor__quitar" aria-label={`Quitar ${p.nombre}`}
                            onClick={() => void quitarParada(p.id)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>

                <button type="button" className="editor__empezar" disabled={!trazado.length || pendiente !== null}
                  onClick={() => cambiarTrazado([])}>
                  Empezar el recorrido de nuevo
                </button>
                <button type="button" className="panel-boton panel-boton--primario editor__siguiente-movil" onClick={() => irA('revisar')}>
                  Siguiente: revisar
                </button>
              </>
            ) : (
              <>
                <button type="button" className="panel-boton panel-boton--secundario editor__siguiente-movil editor__volver-movil" onClick={() => irA('recorrido')}>
                  Volver al recorrido
                </button>
                <Revisar
                ruta={ruta}
                trazado={trazado}
                token={token ?? ''}
                onRuta={setRuta}
                onError={manejarError}
                onAviso={setAviso}
                />
              </>
            )}
          </aside>
        </div>
      </main>
    </MarcoPanel>
  );
}

function IndicadorGuardado({ estado, onReintentar }: { estado: Guardado; onReintentar: () => void }) {
  if (estado === 'error') {
    return (
      <span className="editor__guardado editor__guardado--error" role="status">
        <span className="editor__guardado-texto">No se pudo guardar</span>
        <button type="button" onClick={onReintentar}>
          Reintentar
        </button>
      </span>
    );
  }
  return (
    <span className="editor__guardado" role="status">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4 4 0 0 1-1 9z" />
        {estado === 'guardado' && <path d="M9.5 13l2 2 3.5-4" />}
      </svg>
      <span className="editor__guardado-texto">
        {estado === 'guardando' ? 'Guardando…' : 'Guardado automáticamente'}
      </span>
    </span>
  );
}

/** Paso 3: lista de chequeo, bus y publicar. */
function Revisar({
  ruta,
  trazado,
  token,
  onRuta,
  onError,
  onAviso,
}: {
  ruta: Ruta;
  trazado: PuntoGeo[];
  token: string;
  onRuta: (ruta: Ruta) => void;
  onError: (causa: unknown, porDefecto: string) => void;
  onAviso: (aviso: Aviso) => void;
}) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    listarVehiculos(token, control.signal)
      .then(setVehiculos)
      .catch((causa) => !control.signal.aborted && onError(causa, 'No pudimos cargar los buses.'));
    return () => control.abort();
  }, [token, onError]);

  const metros = largoEnMetros(trazado);
  const lejos = paradasLejos(trazado, ruta.paradas);
  const bus = vehiculos.find((v) => v.rutaId === ruta.id && v.activo) ?? null;
  const disponibles = vehiculos.filter((v) => v.activo && (v.rutaId === null || v.rutaId === ruta.id));
  const puedePublicar = trazado.length > 1 && ruta.paradas.length >= 2;

  async function elegirBus(valor: string) {
    setTrabajando(true);
    try {
      if (bus) await asignarVehiculo(token, bus.id, { rutaId: null, capacidad: bus.capacidad });
      const elegido = vehiculos.find((v) => String(v.id) === valor);
      if (elegido) await asignarVehiculo(token, elegido.id, { rutaId: ruta.id, capacidad: elegido.capacidad });
      setVehiculos(await listarVehiculos(token));
    } catch (causa) {
      onError(causa, 'No pudimos cambiar el bus de la ruta.');
    } finally {
      setTrabajando(false);
    }
  }

  async function publicar(activa: boolean) {
    setTrabajando(true);
    try {
      const actualizada = await publicarRuta(token, ruta.id, activa);
      if (actualizada) onRuta(actualizada);
      onAviso({
        tipo: 'ok',
        texto: activa ? `Ruta publicada: los pasajeros ya ven ${ruta.nombre}.` : 'Ruta oculta: vuelve a borrador.',
      });
    } catch (causa) {
      onError(causa, 'No pudimos cambiar la publicación.');
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <>
      <section className="editor__bloque" aria-labelledby="editor-revisar">
        <h2 id="editor-revisar">Antes de publicar</h2>
        <ul className="editor__chequeo">
          <Chequeo bien={trazado.length > 1} titulo="Recorrido"
            detalle={trazado.length > 1 ? `${textoLargo(metros)} ajustados a las calles` : 'Falta dibujarlo'} />
          <Chequeo bien={ruta.paradas.length >= 2} titulo="Paradas"
            detalle={ruta.paradas.length >= 2 ? `${ruta.paradas.length}, numeradas según el recorrido` : 'Hacen falta al menos 2'} />
          {lejos.length > 0 && (
            <Chequeo bien={false} aviso titulo="Paradas lejos del recorrido"
              detalle={lejos.map((p) => `«${p.nombre}»`).join(', ')} />
          )}
        </ul>
        <label className="panel-campo">
          <span>Bus que la recorre</span>
          <select value={bus ? String(bus.id) : ''} disabled={trabajando} onChange={(e) => void elegirBus(e.target.value)}>
            <option value="">Sin bus por ahora</option>
            {disponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.identificador} · {v.placa}
              </option>
            ))}
          </select>
          <span className="editor__ayuda">Sin bus, los pasajeros ven la ruta pero no el bus en vivo.</span>
        </label>
      </section>

      <p className="editor__nota">
        {ruta.activa
          ? 'Publicada: la ven los pasajeros y los conductores la pueden elegir. Si la ocultás no se pierde nada.'
          : 'Al publicar, la ruta aparece en el selector de los pasajeros y los conductores la pueden elegir al entrar.'}
      </p>

      {ruta.activa ? (
        <button type="button" className="panel-boton panel-boton--secundario editor__publicar" disabled={trabajando}
          onClick={() => void publicar(false)}>
          Ocultar a los pasajeros
        </button>
      ) : (
        <button type="button" className="panel-boton panel-boton--primario editor__publicar"
          disabled={!puedePublicar || trabajando} onClick={() => void publicar(true)}>
          Publicar {ruta.nombre}
        </button>
      )}
      <Link to="/admin/rutas" className="panel-boton panel-boton--secundario editor__publicar">
        {ruta.activa ? 'Volver a las rutas' : 'Dejarla como borrador'}
      </Link>
    </>
  );
}

function Chequeo({ bien, aviso = false, titulo, detalle }: { bien: boolean; aviso?: boolean; titulo: string; detalle: string }) {
  return (
    <li className="editor__chequeo-item">
      <span className={bien ? 'editor__marca editor__marca--bien' : aviso ? 'editor__marca editor__marca--aviso' : 'editor__marca'}
        aria-hidden="true">
        {bien ? '✓' : '!'}
      </span>
      <span>
        <strong>{titulo}</strong>
        <span className="editor__ayuda">{detalle}</span>
      </span>
    </li>
  );
}
