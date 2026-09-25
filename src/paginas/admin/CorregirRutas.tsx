import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorDeRuta } from '../../componentes/admin/EditorDeRuta';
import { MarcoPanel } from '../../componentes/admin/MarcoPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import {
  guardarParada,
  guardarTrazado,
  indiceDeInsercion,
  listarRutasAdmin,
  type PuntoGeo,
} from '../../core/panelAdmin/rutasAdminApi';
import type { Parada, Ruta } from '../../core/tipos';
import './PanelMunicipal.css';
import './CorregirRutas.css';

/**
 * Corregir rutas desde el panel municipal (QA 5.6: "No se puede acceder,
 * corregir ruta en el panel del administrador... Pagina no encontrada").
 *
 * <p>Se corrige lo que se levanto mal en campo: el recorrido sobre las calles
 * (vertices del trazado) y el nombre o la ubicacion de cada parada. Los cambios
 * quedan en borrador hasta tocar "Guardar".
 */
export function CorregirRutas() {
  const { sesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [rutaId, setRutaId] = useState<number | null>(null);
  const [trazado, setTrazado] = useState<PuntoGeo[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [verticeElegido, setVerticeElegido] = useState<number | null>(null);
  const [paradaElegida, setParadaElegida] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(true);

  // Por ref: la carga de rutas no tiene que repetirse si cambia la funcion.
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
    listarRutasAdmin(token, control.signal)
      .then((lista) => {
        setRutas(lista);
        setRutaId((actual) => actual ?? lista[0]?.id ?? null);
      })
      .catch((causa) => {
        if (!control.signal.aborted) manejarError(causa, 'No pudimos cargar las rutas.');
      })
      .finally(() => setCargando(false));
    return () => control.abort();
  }, [token, manejarError]);

  const ruta = useMemo(() => rutas.find((r) => r.id === rutaId) ?? null, [rutas, rutaId]);

  // Al elegir ruta (o al recibirla guardada) el borrador arranca de lo guardado.
  useEffect(() => {
    if (!ruta) return;
    setTrazado(ruta.trazado.length > 0 ? ruta.trazado : ruta.paradas.map(({ latitud, longitud }) => ({ latitud, longitud })));
    setParadas(ruta.paradas);
    setVerticeElegido(null);
    setParadaElegida(null);
  }, [ruta]);

  const trazadoCambiado = ruta !== null && JSON.stringify(trazado) !== JSON.stringify(ruta.trazado);
  const parada = paradas.find((p) => p.id === paradaElegida) ?? null;
  const paradaGuardada = ruta?.paradas.find((p) => p.id === paradaElegida) ?? null;
  const paradaCambiada = parada !== null && JSON.stringify(parada) !== JSON.stringify(paradaGuardada);

  function reemplazarRuta(actualizada: Ruta | null) {
    if (!actualizada) return;
    setRutas((lista) => lista.map((r) => (r.id === actualizada.id ? actualizada : r)));
  }

  async function guardarElTrazado() {
    if (!token || !ruta) return;
    setGuardando(true);
    setMensaje(null);
    try {
      reemplazarRuta(await guardarTrazado(token, ruta.id, trazado));
      setMensaje({ tipo: 'ok', texto: `Trazado guardado: ${trazado.length} puntos. El tiempo estimado ya lo usa.` });
    } catch (causa) {
      manejarError(causa, 'No pudimos guardar el trazado.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarLaParada() {
    if (!token || !ruta || !parada) return;
    if (!parada.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'La parada necesita un nombre.' });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      reemplazarRuta(
        await guardarParada(token, ruta.id, parada.id, {
          nombre: parada.nombre,
          latitud: parada.latitud,
          longitud: parada.longitud,
        }),
      );
      setMensaje({ tipo: 'ok', texto: `Parada «${parada.nombre.trim()}» guardada.` });
    } catch (causa) {
      manejarError(causa, 'No pudimos guardar la parada.');
    } finally {
      setGuardando(false);
    }
  }

  function cambiarParada(id: number, cambios: Partial<Parada>) {
    setParadas((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }

  return (
    <MarcoPanel>
      <main className="panel-principal corregir-rutas">
        <div className="panel-principal__encabezado">
          <div>
            <h1 className="panel-h1">Corregir rutas</h1>
            <p className="panel-apoyo">
              Arrastrá los puntos verdes para ajustar el recorrido a las calles; tocá el mapa para agregar un punto.
              Arrastrá una parada para corregir su ubicación.
            </p>
          </div>
          {rutas.length > 0 && (
            <label className="corregir-rutas__selector">
              <span className="panel-ayuda">Ruta</span>
              <select value={rutaId ?? ''} onChange={(e) => setRutaId(Number(e.target.value))}>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                    {r.activa ? '' : ' (inactiva)'}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {mensaje && (
          <p
            className={mensaje.tipo === 'ok' ? 'panel-nota' : 'panel-aviso panel-aviso--error'}
            role={mensaje.tipo === 'ok' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </p>
        )}

        {cargando && <p className="panel-apoyo">Cargando rutas…</p>}
        {!cargando && rutas.length === 0 && !mensaje && <p className="panel-apoyo">No hay rutas cargadas.</p>}

        {ruta && (
          <div className="corregir-rutas__cuerpo">
            <div className="corregir-rutas__mapa">
              <EditorDeRuta
                trazado={trazado}
                paradas={paradas}
                verticeElegido={verticeElegido}
                paradaElegida={paradaElegida}
                claveEncuadre={ruta.id}
                onMoverVertice={(i, punto) => setTrazado((t) => t.map((p, j) => (j === i ? punto : p)))}
                onElegirVertice={setVerticeElegido}
                onAgregarVertice={(punto) => {
                  const i = indiceDeInsercion(trazado, punto);
                  setTrazado([...trazado.slice(0, i), punto, ...trazado.slice(i)]);
                  setVerticeElegido(i);
                }}
                onMoverParada={(id, punto) => {
                  cambiarParada(id, punto);
                  setParadaElegida(id);
                }}
                onElegirParada={setParadaElegida}
              />
            </div>

            <aside className="corregir-rutas__lateral">
              <section className="corregir-rutas__bloque" aria-labelledby="titulo-trazado">
                <h2 id="titulo-trazado" className="panel-h2">
                  Recorrido
                </h2>
                <p className="panel-ayuda">
                  {trazado.length} puntos{trazadoCambiado ? ' · con cambios sin guardar' : ''}
                  {ruta.trazado.length === 0 ? ' · la ruta aún no tenía trazado: se propone unir las paradas' : ''}
                </p>
                <div className="corregir-rutas__acciones">
                  <button
                    type="button"
                    className="panel-boton panel-boton--secundario"
                    disabled={verticeElegido === null || trazado.length <= 2}
                    onClick={() => {
                      if (verticeElegido === null) return;
                      setTrazado((t) => t.filter((_, j) => j !== verticeElegido));
                      setVerticeElegido(null);
                    }}
                  >
                    Quitar punto {verticeElegido !== null ? verticeElegido + 1 : ''}
                  </button>
                  <button
                    type="button"
                    className="panel-boton panel-boton--secundario"
                    onClick={() => setTrazado(paradas.map(({ latitud, longitud }) => ({ latitud, longitud })))}
                  >
                    Unir paradas en orden
                  </button>
                  <button
                    type="button"
                    className="panel-boton panel-boton--secundario"
                    disabled={!trazadoCambiado}
                    onClick={() => setTrazado(ruta.trazado)}
                  >
                    Deshacer cambios
                  </button>
                  <button
                    type="button"
                    className="panel-boton panel-boton--primario"
                    disabled={!trazadoCambiado || guardando || trazado.length < 2}
                    onClick={() => void guardarElTrazado()}
                  >
                    {guardando ? 'Guardando…' : 'Guardar recorrido'}
                  </button>
                </div>
              </section>

              <section className="corregir-rutas__bloque" aria-labelledby="titulo-paradas">
                <h2 id="titulo-paradas" className="panel-h2">
                  Paradas
                </h2>
                <ol className="corregir-rutas__paradas">
                  {paradas.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={
                          p.id === paradaElegida
                            ? 'corregir-rutas__parada corregir-rutas__parada--elegida'
                            : 'corregir-rutas__parada'
                        }
                        onClick={() => setParadaElegida(p.id)}
                      >
                        <span className="corregir-rutas__orden tabular">{p.orden}</span>
                        {p.nombre}
                      </button>
                    </li>
                  ))}
                </ol>

                {parada && (
                  <div className="corregir-rutas__formulario">
                    <label className="panel-campo">
                      <span>Nombre de la parada</span>
                      <input
                        value={parada.nombre}
                        maxLength={100}
                        onChange={(e) => cambiarParada(parada.id, { nombre: e.target.value })}
                      />
                    </label>
                    <p className="panel-ayuda tabular">
                      {parada.latitud.toFixed(6)}, {parada.longitud.toFixed(6)} · arrastrala en el mapa para moverla
                    </p>
                    <div className="corregir-rutas__acciones">
                      <button
                        type="button"
                        className="panel-boton panel-boton--secundario"
                        disabled={!paradaCambiada}
                        onClick={() => paradaGuardada && cambiarParada(parada.id, paradaGuardada)}
                      >
                        Deshacer
                      </button>
                      <button
                        type="button"
                        className="panel-boton panel-boton--primario"
                        disabled={!paradaCambiada || guardando}
                        onClick={() => void guardarLaParada()}
                      >
                        {guardando ? 'Guardando…' : 'Guardar parada'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
    </MarcoPanel>
  );
}
