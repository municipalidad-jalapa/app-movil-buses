import { useEffect, useRef, useState, type FormEvent } from 'react';
import { estaVigente } from '../../estado/ReservaProvider';
import { useReserva } from '../../hooks/useReserva';
import { useRutaElegida } from '../../hooks/useRutaElegida';
import { useSesionPasajero } from '../../core/pasajero/SesionPasajeroContext';
import { ErrorApi } from '../../core/errores';
import {
  DIMENSIONES,
  enviarOpinion,
  esLimiteDeEnvios,
  TEXTO_MAXIMO,
  type DimensionDeOpinion,
  type TipoOpinion,
} from '../../core/opiniones';
import {
  IconoBus,
  IconoCerrar,
  IconoCheck,
  IconoError,
  IconoEstrella,
  IconoGirando,
  IconoOpinar,
  IconoQueja,
  IconoReintentar,
  IconoReloj,
} from './IconosOpinion';
import './OpinarSobreElServicio.css';

type Estado = 'editando' | 'enviando' | 'enviada' | 'error' | 'limite';

const TIPOS: { valor: TipoOpinion; texto: string; Icono: typeof IconoQueja }[] = [
  { valor: 'queja', texto: 'Queja', Icono: IconoQueja },
  { valor: 'comentario', texto: 'Comentario', Icono: IconoOpinar },
  { valor: 'calificacion', texto: 'Calificación', Icono: (p) => <IconoEstrella {...p} /> },
];

export const MENSAJE_ERROR_ENVIO = 'Revisa tu conexión e inténtalo de nuevo. Tu texto sigue aquí.';
export const MENSAJE_LIMITE = 'Enviaste varias opiniones seguidas. Intenta de nuevo en unos minutos.';

/**
 * Opinar sobre el servicio desde la pantalla del pasajero (SCRUM-26, A.2).
 * Canvas «EcoRuta · Opiniones», pantallas 1 a 4.
 *
 * La ruta sale del contexto: la que el pasajero esta mirando (y que sigue a la
 * parada elegida). No se le pide elegirla. Funciona sin cuenta.
 */
/**
 * `redondo`: el acceso va como un boton mas de la columna del mapa (QA), para
 * no tapar la cabecera ni los avisos que flotan arriba.
 */
export function OpinarSobreElServicio({ redondo = false }: { redondo?: boolean } = {}) {
  const { rutaActiva } = useRutaElegida();
  const { reserva } = useReserva();
  const sesionPasajero = useSesionPasajero();
  const [abierta, setAbierta] = useState(false);
  const [tipo, setTipo] = useState<TipoOpinion | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  // SCRUM-26, bloque F: tres valoraciones independientes, todas opcionales.
  const [porDimension, setPorDimension] = useState<Record<DimensionDeOpinion, number>>({
    calidad: 0,
    limpieza: 0,
    conduccion: 0,
  });
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('editando');
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (!abierta) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !enviandoRef.current) cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  if (!rutaActiva) return null;

  const quedan = TEXTO_MAXIMO - [...texto].length;
  const hayValoracionPorDimension = DIMENSIONES.some(({ clave }) => porDimension[clave] > 0);
  const hayContenido = texto.trim() !== '' || estrellas > 0 || hayValoracionPorDimension;
  const puedeEnviar = tipo !== null && hayContenido && quedan >= 0 && estado !== 'enviando' && estado !== 'limite';

  function limpiar() {
    setTipo(null);
    setEstrellas(0);
    setPorDimension({ calidad: 0, limpieza: 0, conduccion: 0 });
    setTexto('');
    setEstado('editando');
    setDetalleError(null);
  }

  function cerrar() {
    setAbierta(false);
    if (estado === 'enviada') limpiar();
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Un doble toque no manda dos veces: la bandera se revisa antes del estado.
    if (!puedeEnviar || enviandoRef.current || !tipo || !rutaActiva) return;
    enviandoRef.current = true;
    setEstado('enviando');
    try {
      await enviarOpinion({
        tipo,
        rutaId: rutaActiva.id,
        texto: texto || undefined,
        estrellas: estrellas || undefined,
        calidad: porDimension.calidad || undefined,
        limpieza: porDimension.limpieza || undefined,
        conduccion: porDimension.conduccion || undefined,
        reservaId: reserva && estaVigente(reserva) ? reserva.id : undefined,
      }, sesionPasajero?.sesion?.token);
      setEstado('enviada');
    } catch (causa) {
      if (esLimiteDeEnvios(causa)) {
        setEstado('limite');
      } else {
        // El texto no se toca: se puede reintentar tal cual.
        setDetalleError(causa instanceof ErrorApi && causa.status === 422 ? causa.mensajeParaUsuario() : null);
        setEstado('error');
      }
    } finally {
      enviandoRef.current = false;
    }
  }

  return (
    <>
      <button
        type="button"
        className={redondo ? 'pantalla-mapa__redondo' : 'opinion-acceso'}
        aria-label="Opinar sobre el servicio"
        title="Opinar sobre el servicio"
        onClick={() => setAbierta(true)}
      >
        <IconoOpinar tamano={redondo ? 26 : 20} />
        {!redondo && 'Opinar'}
      </button>

      {abierta && (
        <div className="opinion-velo" onClick={(e) => e.target === e.currentTarget && !enviandoRef.current && cerrar()}>
          {estado === 'enviada' ? (
            <section className="opinion-hoja opinion-hoja--gracias" role="status">
              <Manija />
              <span className="opinion-exito">
                <IconoCheck tamano={32} />
              </span>
              <h2 className="opinion-titulo">Gracias, recibimos tu opinión</h2>
              <p className="opinion-parrafo">La Municipalidad revisa las opiniones para mejorar el servicio.</p>
              <button type="button" className="opinion-primario" onClick={cerrar}>
                Volver al mapa
              </button>
            </section>
          ) : (
            <form
              className="opinion-hoja"
              role="dialog"
              aria-modal="true"
              aria-labelledby="opinion-titulo"
              onSubmit={alEnviar}
              noValidate
            >
              <Manija />
              <div className="opinion-cabecera">
                <div>
                  <h2 id="opinion-titulo" className="opinion-titulo">
                    Tu opinión sobre el servicio
                  </h2>
                  <p className="opinion-contexto">
                    <IconoBus tamano={16} />
                    {rutaActiva.nombre}
                  </p>
                </div>
                <button
                  type="button"
                  className="opinion-cerrar"
                  aria-label="Cerrar"
                  onClick={cerrar}
                  disabled={estado === 'enviando'}
                >
                  <IconoCerrar tamano={22} />
                </button>
              </div>

              {estado === 'error' && (
                <p className="opinion-aviso opinion-aviso--error" role="alert">
                  <IconoError />
                  <span>
                    <strong>No pudimos enviar tu opinión.</strong> {detalleError ?? MENSAJE_ERROR_ENVIO}
                  </span>
                </p>
              )}
              {estado === 'limite' && (
                <p className="opinion-aviso opinion-aviso--limite" role="alert">
                  <IconoReloj />
                  <span>{MENSAJE_LIMITE}</span>
                </p>
              )}

              <fieldset className="opinion-grupo">
                <legend>¿Qué quieres contarnos?</legend>
                <div className="opinion-tipos" role="radiogroup" aria-label="Tipo de opinión">
                  {TIPOS.map(({ valor, texto: etiqueta, Icono }) => (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={tipo === valor}
                      className={tipo === valor ? 'opinion-tipo opinion-tipo--elegido' : 'opinion-tipo'}
                      onClick={() => setTipo(valor)}
                    >
                      {tipo === valor ? <IconoCheck tamano={16} /> : <Icono tamano={18} />}
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="opinion-grupo">
                <legend>
                  Calificación <span className="opinion-opcional">(opcional)</span>
                </legend>
                <div className="opinion-estrellas">
                  <div role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={estrellas === n}
                        aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'} de 5`}
                        className="opinion-estrella"
                        onClick={() => setEstrellas(estrellas === n ? 0 : n)}
                      >
                        <IconoEstrella tamano={32} llena={n <= estrellas} />
                      </button>
                    ))}
                  </div>
                  {estrellas > 0 && <span className="opinion-estrellas__valor tabular">{estrellas} de 5</span>}
                </div>
              </fieldset>

              <fieldset className="opinion-grupo">
                <legend>
                  ¿Cómo estuvo cada cosa? <span className="opinion-opcional">(opcional)</span>
                </legend>
                {/*
                  SCRUM-26, bloque F. Tres valoraciones independientes: el
                  servicio puede ser puntual con la unidad sucia, o la unidad
                  impecable y el piloto manejando mal. Puntuar una no obliga a
                  puntuar las otras.
                */}
                {DIMENSIONES.map(({ clave, etiqueta }) => (
                  <div key={clave} className="opinion-dimension">
                    <span className="opinion-dimension__nombre" id={`dimension-${clave}`}>
                      {etiqueta}
                    </span>
                    <div className="opinion-estrellas">
                      <div role="radiogroup" aria-labelledby={`dimension-${clave}`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={porDimension[clave] === n}
                            aria-label={`${etiqueta}: ${n} ${n === 1 ? 'estrella' : 'estrellas'} de 5`}
                            className="opinion-estrella"
                            onClick={() =>
                              setPorDimension((previo) => ({
                                ...previo,
                                [clave]: previo[clave] === n ? 0 : n,
                              }))
                            }
                          >
                            <IconoEstrella tamano={26} llena={n <= porDimension[clave]} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </fieldset>

              <label className="opinion-campo">
                Cuéntanos qué pasó (máximo {TEXTO_MAXIMO} caracteres)
                <textarea
                  value={texto}
                  maxLength={TEXTO_MAXIMO}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                />
              </label>
              <div className="opinion-pie">
                <span>Escribe un texto, elige estrellas o ambos.</span>
                <span className="tabular" aria-live="polite">
                  quedan {quedan} caracteres
                </span>
              </div>

              <button
                type="submit"
                className="opinion-primario"
                disabled={!puedeEnviar}
                aria-busy={estado === 'enviando'}
              >
                {estado === 'enviando' ? (
                  <>
                    <IconoGirando />
                    Enviando…
                  </>
                ) : estado === 'error' ? (
                  <>
                    <IconoReintentar />
                    Reintentar
                  </>
                ) : (
                  'Enviar opinión'
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

function Manija() {
  return (
    <div className="opinion-manija" aria-hidden="true">
      <span />
    </div>
  );
}
