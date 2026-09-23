import { useCallback, useEffect, useState, type ComponentType, type FormEvent } from 'react';
import { AvisoInactividad } from '../../componentes/admin/AvisoInactividad';
import { IconoSalir, SimboloEcoRuta } from '../../componentes/admin/IconosPanel';
import { NavegacionPanel } from '../../componentes/admin/NavegacionPanel';
import {
  IconoCheck,
  IconoDerecha,
  IconoEstrella,
  IconoIzquierda,
  IconoOpinar,
  IconoQueja,
  IconoReloj,
  IconoVacio,
} from '../../componentes/opiniones/IconosOpinion';
import { apiClient } from '../../core/apiClient';
import { ErrorApi } from '../../core/errores';
import {
  listarOpiniones,
  marcarAtendida,
  textoPlano,
  type FiltrosOpiniones,
  type OpinionDelPanel,
  type PaginaDeOpiniones,
  DIMENSIONES,
  type PromedioOpiniones,
  type TipoOpinion,
} from '../../core/opiniones';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import type { Ruta } from '../../core/tipos';
import { useInactividad } from '../../hooks/useInactividad';
import './PanelMunicipal.css';
import './OpinionesPanel.css';

const TAMANO_PAGINA = 20;
const FILTROS_VACIOS: FiltrosOpiniones = { tipo: '', rutaId: '', vehiculoId: '', desde: '', hasta: '' };

const TIPOS: Record<TipoOpinion, { texto: string; Icono: ComponentType<{ tamano?: number }> }> = {
  queja: { texto: 'Queja', Icono: IconoQueja },
  comentario: { texto: 'Comentario', Icono: IconoOpinar },
  calificacion: { texto: 'Calificación', Icono: (p) => <IconoEstrella {...p} /> },
};

const fecha = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fechaCorta = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit' });
const hora = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });
const decimal = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Vehiculo {
  id: number;
  identificador: string;
}

/**
 * Opiniones del servicio en el panel municipal (SCRUM-26, A.3). Canvas
 * «EcoRuta · Opiniones», pantallas 5 y 6.
 */
export function OpinionesPanel() {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const token = sesion?.token;
  const [borrador, setBorrador] = useState<FiltrosOpiniones>(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState<FiltrosOpiniones>(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PaginaDeOpiniones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [errorVehiculos, setErrorVehiculos] = useState(false);
  const [intentoVehiculos, setIntentoVehiculos] = useState(0);
  const [atendiendo, setAtendiendo] = useState<number | null>(null);

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
      .get<Vehiculo[]>('/api/v1/admin/catalogo/vehiculos', { token, signal: control.signal })
      .then((v) => {
        setVehiculos(v ?? []);
        setErrorVehiculos(false);
      }, () => { if (!control.signal.aborted) setErrorVehiculos(true); });
    return () => control.abort();
  }, [token, intentoVehiculos]);

  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    listarOpiniones(token, { ...filtros, pagina, tamano: TAMANO_PAGINA }, control.signal).then(
      (respuesta) => {
        setDatos(respuesta);
        setError(null);
      },
      (causa) => {
        if (control.signal.aborted || siCaduco(causa)) return;
        setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cargar las opiniones.');
      },
    );
    return () => control.abort();
  }, [token, filtros, pagina, siCaduco]);

  function aplicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPagina(0);
    setFiltros(borrador);
  }

  function limpiar() {
    setBorrador(FILTROS_VACIOS);
    setFiltros(FILTROS_VACIOS);
    setPagina(0);
  }

  async function atender(opinion: OpinionDelPanel) {
    if (!token || atendiendo !== null) return;
    setAtendiendo(opinion.id);
    try {
      const hecho = await marcarAtendida(token, opinion.id);
      setDatos((actual) =>
        actual && {
          ...actual,
          opiniones: actual.opiniones.map((o) =>
            o.id === hecho.id ? { ...o, atendidaEn: hecho.atendidaEn, atendidaPor: hecho.atendidaPor } : o,
          ),
        },
      );
    } catch (causa) {
      if (!siCaduco(causa)) {
        setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos marcarla como atendida.');
      }
    } finally {
      setAtendiendo(null);
    }
  }

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const desdeFila = total === 0 ? 0 : pagina * TAMANO_PAGINA + 1;
  const hastaFila = Math.min(total, (pagina + 1) * TAMANO_PAGINA);
  const porTipo = (tipo: TipoOpinion) => datos?.opiniones.filter((o) => o.tipo === tipo).length ?? 0;

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
          <h1 className="panel-h1">Opiniones del servicio</h1>
          <p className="panel-apoyo">Quejas, comentarios y calificaciones que envían los pasajeros desde el mapa.</p>
        </div>

        <form className="opiniones-filtros" onSubmit={aplicar}>
          <label className="panel-campo opiniones-filtros__ruta">
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
          <label className="panel-campo opiniones-filtros__vehiculo">
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
          <label className="panel-campo opiniones-filtros__tipo">
            Tipo
            <select
              value={borrador.tipo}
              onChange={(e) => setBorrador({ ...borrador, tipo: e.target.value as TipoOpinion | '' })}
            >
              <option value="">Todos los tipos</option>
              <option value="queja">Queja</option>
              <option value="comentario">Comentario</option>
              <option value="calificacion">Calificación</option>
            </select>
          </label>
          <label className="panel-campo opiniones-filtros__fecha">
            Desde
            <input type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
          </label>
          <label className="panel-campo opiniones-filtros__fecha">
            Hasta
            <input type="date" value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
          </label>
          <button type="submit" className="panel-boton panel-boton--primario">
            Aplicar filtros
          </button>
          <button type="button" className="opiniones-enlace" onClick={limpiar}>
            Limpiar
          </button>
        </form>
        {errorVehiculos && (
          <div className="panel-aviso panel-aviso--error" role="alert">
            No pudimos cargar los vehículos del filtro.
            <button type="button" className="panel-boton panel-boton--secundario"
              onClick={() => setIntentoVehiculos((n) => n + 1)}>Reintentar vehículos</button>
          </div>
        )}

        {error && (
          <p className="panel-aviso panel-aviso--error" role="alert">
            <span>{error}</span>
          </p>
        )}

        <div className="panel-resumen">
          <div className="panel-cifra">
            <span className="panel-cifra__etiqueta">Opiniones del período</span>
            <span className="panel-cifra__valor tabular">{datos ? total : '—'}</span>
            {datos && total > 0 && (
              <span className="opiniones-desglose tabular">
                {porTipo('queja')} quejas · {porTipo('comentario')} comentarios · {porTipo('calificacion')}{' '}
                calificaciones (en esta página)
              </span>
            )}
          </div>
          <TarjetaPromedios titulo="Promedio por ruta" filas={datos?.resumen.promedioPorRuta} />
          <TarjetaPromedios titulo="Promedio por vehículo" filas={datos?.resumen.promedioPorVehiculo} />
        </div>

        {datos && total === 0 ? (
          <div className="panel-tabla-marco opiniones-vacio">
            <span className="opiniones-vacio__icono">
              <IconoVacio tamano={32} />
            </span>
            <h2 className="panel-h2">No hay opiniones con estos filtros</h2>
            <p className="panel-apoyo">Prueba con otro rango de fechas o quita algún filtro.</p>
            <button type="button" className="panel-boton panel-boton--secundario" onClick={limpiar}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="panel-tabla-marco">
            <table className="panel-tabla opiniones-tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Ruta</th>
                  <th scope="col">Vehículo</th>
                  <th scope="col">Calificación</th>
                  <th scope="col">Opinión</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos?.opiniones.map((o) => (
                  <FilaOpinion key={o.id} opinion={o} atendiendo={atendiendo === o.id} onAtender={() => atender(o)} />
                ))}
              </tbody>
            </table>
            {datos && (
              <div className="opiniones-paginacion">
                <span className="panel-ayuda tabular">
                  Mostrando {desdeFila}–{hastaFila} de {total} · de la más reciente a la más antigua
                </span>
                <div className="opiniones-paginacion__botones">
                  <button
                    type="button"
                    className="opiniones-pagina"
                    aria-label="Página anterior"
                    disabled={pagina === 0}
                    onClick={() => setPagina(pagina - 1)}
                  >
                    <IconoIzquierda />
                  </button>
                  <span className="panel-ayuda tabular">
                    Página {pagina + 1} de {paginas}
                  </span>
                  <button
                    type="button"
                    className="opiniones-pagina"
                    aria-label="Página siguiente"
                    disabled={pagina + 1 >= paginas}
                    onClick={() => setPagina(pagina + 1)}
                  >
                    <IconoDerecha />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}

function TarjetaPromedios({ titulo, filas }: { titulo: string; filas?: PromedioOpiniones[] }) {
  // Una fila entra si tiene la calificación general o alguna de las tres
  // dimensiones del bloque F: puntuar solo la limpieza también es calificar.
  const calificadas = (filas ?? []).filter(
    (f) => f.promedio !== null || f.calidad !== null || f.limpieza !== null || f.conduccion !== null,
  );
  return (
    <div className="panel-cifra">
      <span className="panel-cifra__etiqueta">{titulo}</span>
      {calificadas.length === 0 ? (
        <span className="panel-ayuda">Sin calificaciones en el período</span>
      ) : (
        <ul className="opiniones-promedios">
          {calificadas.map((f) => (
            <li key={f.id}>
              <span className="opiniones-promedios__nombre">{f.nombre}</span>
              {f.promedio !== null ? (
                <>
                  <Estrellas valor={f.promedio} />
                  <span className="opiniones-promedios__valor tabular">{decimal.format(f.promedio)}</span>
                  <span className="panel-ayuda tabular">({f.calificadas})</span>
                </>
              ) : (
                <span className="panel-ayuda">Sin calificación general</span>
              )}
              {/*
                SCRUM-26, bloque F: cada dimensión por separado. La que nadie
                puntuó dice «sin datos», nunca un cero que parezca mala nota.
              */}
              <ul className="opiniones-dimensiones">
                {DIMENSIONES.map(({ clave, etiqueta }) => (
                  <li key={clave}>
                    <span className="opiniones-dimensiones__nombre">{etiqueta}</span>
                    {f[clave] === null ? (
                      <span className="panel-ayuda">Sin datos</span>
                    ) : (
                      <>
                        <Estrellas valor={f[clave]!} />
                        <span className="opiniones-promedios__valor tabular">{decimal.format(f[clave]!)}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Estrellas({ valor }: { valor: number }) {
  const llenas = Math.round(valor);
  return (
    <span className="opiniones-estrellas" role="img" aria-label={`${decimal.format(valor)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconoEstrella key={n} tamano={16} llena={n <= llenas} />
      ))}
    </span>
  );
}

function FilaOpinion({
  opinion,
  atendiendo,
  onAtender,
}: {
  opinion: OpinionDelPanel;
  atendiendo: boolean;
  onAtender: () => void;
}) {
  const creada = new Date(opinion.creadaEn);
  const { texto: tipo, Icono } = TIPOS[opinion.tipo];
  return (
    <tr>
      <td className="tabular">
        <span className="panel-tabla__principal">{fecha.format(creada)}</span>
        <span className="panel-tabla__secundario">{hora.format(creada)}</span>
      </td>
      <td>
        <span className="opiniones-chip">
          <Icono tamano={14} />
          {tipo}
        </span>
      </td>
      <td>{opinion.ruta}</td>
      <td>{opinion.vehiculo ?? <span className="panel-tabla__secundario">Sin bus</span>}</td>
      <td>
        {opinion.estrellas ? (
          <Estrellas valor={opinion.estrellas} />
        ) : (
          <span className="panel-tabla__secundario">Sin calificación</span>
        )}
      </td>
      <td className="opiniones-texto">
        {/* Texto plano: React lo escapa, jamas se interpreta como HTML. */}
        {opinion.texto ? textoPlano(opinion.texto) : <span className="panel-tabla__secundario">Sin texto</span>}
      </td>
      <td>
        {opinion.atendidaEn ? (
          <>
            <span className="opiniones-estado opiniones-estado--atendida">
              <IconoCheck tamano={14} />
              Atendida
            </span>
            <span className="opiniones-atendida-por">
              Atendida por {opinion.atendidaPor ? textoPlano(opinion.atendidaPor) : '—'} ·{' '}
              {fechaCorta.format(new Date(opinion.atendidaEn))} {hora.format(new Date(opinion.atendidaEn))}
            </span>
          </>
        ) : (
          <>
            <span className="opiniones-estado opiniones-estado--pendiente">
              <IconoReloj tamano={14} />
              Pendiente
            </span>
            <button
              type="button"
              className="panel-boton panel-boton--secundario opiniones-atender"
              onClick={onAtender}
              disabled={atendiendo}
            >
              {atendiendo ? 'Marcando…' : 'Marcar como atendida'}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
