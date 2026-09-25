import type { ReactNode } from 'react';
import './HojaReserva.css';

/**
 * La hoja inferior de la pantalla del pasajero: donde se elige la parada y se
 * avisa que se esta esperando (HU-53, HU-124, HU-52).
 *
 * <p>Calco de `design/MapaOSM.dc.html` y de los artboards R1, R2 y R3 de
 * `design/EcoRuta.dc.html`. Cuatro fases, las mismas del diseno:
 *
 * <ul>
 *   <li>`vacia` (R1): todavia no hay parada.</li>
 *   <li>`buscando`: se esta pidiendo la ubicacion para la parada mas cercana.</li>
 *   <li>`elegida` (R2): hay parada, falta confirmar.</li>
 *   <li>`confirmada` (R3): la reserva existe en el servidor.</li>
 * </ul>
 *
 * <p>QA 5.1: el bloque "Llega a tu parada en" con su indicador de confianza
 * llega por `eta` (ver `TarjetaEta`), con el dato real del backend.
 */

export type FaseHoja = 'vacia' | 'buscando' | 'elegida' | 'confirmada';

interface Props {
  fase: FaseHoja;
  nombreParada?: string;
  /** "a 3 min a pie · 240 m". Solo si se conoce la ubicacion del pasajero. */
  distancia?: string | null;
  esperando?: number;
  /** Minutos que le quedan a la reserva: el "MIN DE AVISO" de R3. */
  minutosDeAviso?: number | null;
  /** Hora del ultimo dato del bus (DESIGN.md §7 [DURA]). */
  ultimoDato?: ReactNode;
  /** "Llega a tu parada en": el ETA con su nivel de confianza (QA 5.1). */
  eta?: ReactNode;
  /** Mensaje para el pasajero cuando algo no salio. Ya viene traducido. */
  aviso?: string | null;
  enviando?: boolean;
  /**
   * HU-52: el aviso esta por vencer. En vez de dejarlo vencer en silencio, la
   * hoja pregunta si sigue esperando. Sin artboard: se arma con las piezas de
   * R3 y queda para revision de diseno.
   */
  preguntarSiSigue?: boolean;
  /** Segundos que le quedan al aviso, para decir cuanto falta al preguntar. */
  segundosRestantes?: number | null;
  /**
   * QA 4.1: en el telefono la hoja tapaba media pantalla y no se podia
   * achicar. Minimizada queda una sola linea con lo esencial; la manija y esa
   * linea la vuelven a abrir.
   */
  minimizada?: boolean;
  onAlternarTamano?: () => void;
  /** Algo que va debajo de los datos de R3, como la invitacion a los avisos. */
  extraConfirmada?: ReactNode;
  /** Reemplaza el contenido de la fase, como la pregunta de abordaje (HU-58). */
  contenido?: ReactNode;
  onUsarCercana: () => void;
  onConfirmar: () => void;
  onElegirOtra: () => void;
  onCancelar: () => void;
  onRenovar?: () => void;
}

export function HojaReserva({
  fase,
  nombreParada = '',
  distancia = null,
  esperando = 0,
  minutosDeAviso = null,
  ultimoDato,
  eta,
  aviso = null,
  enviando = false,
  preguntarSiSigue = false,
  segundosRestantes = null,
  minimizada = false,
  onAlternarTamano,
  extraConfirmada,
  contenido,
  onUsarCercana,
  onConfirmar,
  onElegirOtra,
  onCancelar,
  onRenovar,
}: Props) {
  const manija = onAlternarTamano ? (
    <button
      type="button"
      className="hoja-reserva__manija-boton"
      aria-expanded={!minimizada}
      aria-label={minimizada ? 'Mostrar tu parada' : 'Achicar para ver el mapa'}
      title={minimizada ? 'Mostrar tu parada' : 'Achicar para ver el mapa'}
      onClick={onAlternarTamano}
    >
      <span className="hoja-reserva__raya" />
    </button>
  ) : (
    <div className="hoja-reserva__manija" aria-hidden="true">
      <span className="hoja-reserva__raya" />
    </div>
  );

  if (minimizada) {
    return (
      <section className="hoja-reserva hoja-reserva--minimizada" aria-label="Tu parada" data-testid="hoja" data-fase={fase}>
        {manija}
        <button type="button" className="hoja-reserva__resumen" onClick={onAlternarTamano}>
          <span className="hoja-reserva__resumen-texto">{resumenDe(fase, nombreParada)}</span>
          {/* Los minutos van aparte: un nombre de parada largo no los corta. */}
          {fase === 'confirmada' && minutosDeAviso !== null && (
            <span className="hoja-reserva__resumen-cifra tabular">{minutosDeAviso} min</span>
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      </section>
    );
  }

  return (
    <section className="hoja-reserva" aria-label="Tu parada" data-testid="hoja" data-fase={fase}>
      {manija}

      {contenido && <div className="hoja-reserva__bloque">{contenido}</div>}

      {!contenido && fase === 'vacia' && (
        <div className="hoja-reserva__bloque">
          <div className="hoja-reserva__textos">
            <h2 className="hoja-reserva__titulo">¿En qué parada vas a esperar?</h2>
            <p className="hoja-reserva__apoyo">
              Tocá una parada en el mapa, o dejá que la busquemos por tu ubicación.
            </p>
          </div>
          <Aviso texto={aviso} />
          <button type="button" className="hoja-reserva__primario" onClick={onUsarCercana}>
            Usar la parada más cercana
          </button>
        </div>
      )}

      {!contenido && fase === 'buscando' && (
        <div className="hoja-reserva__bloque">
          <div className="hoja-reserva__buscando" role="status">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" className="hoja-reserva__giro" aria-hidden="true">
              <path d="M12 3a9 9 0 109 9" />
            </svg>
            <div className="hoja-reserva__textos hoja-reserva__textos--juntos">
              <span className="hoja-reserva__titulo hoja-reserva__titulo--18">Buscando dónde estás…</span>
              <span className="hoja-reserva__apoyo">
                Si no da permiso, elegí la parada tocándola en el mapa.
              </span>
            </div>
          </div>
          <div className="hoja-reserva__primario hoja-reserva__primario--apagado" aria-hidden="true">
            Estoy esperando aquí
          </div>
        </div>
      )}

      {!contenido && fase === 'elegida' && (
        <div className="hoja-reserva__bloque">
          <div className="hoja-reserva__cabeza">
            <div className="hoja-reserva__textos hoja-reserva__textos--parada">
              <span className="hoja-reserva__etiqueta">
                <span className="hoja-reserva__rombo" aria-hidden="true" />
                Parada elegida
              </span>
              <h2 className="hoja-reserva__titulo">{nombreParada}</h2>
              {distancia && <span className="hoja-reserva__distancia">{distancia}</span>}
            </div>
            <div className="hoja-reserva__cuenta">
              <span className="hoja-reserva__numero-40">{esperando}</span>
              <span className="hoja-reserva__rotulo">esperando</span>
            </div>
          </div>
          {eta}
          {ultimoDato && <div className="hoja-reserva__ultimo-dato">{ultimoDato}</div>}
          <Aviso texto={aviso} />
          <button
            type="button"
            className="hoja-reserva__primario hoja-reserva__primario--grande"
            onClick={onConfirmar}
            disabled={enviando}
          >
            {enviando ? 'Avisando…' : 'Estoy esperando aquí'}
          </button>
          <button type="button" className="hoja-reserva__enlace" onClick={onElegirOtra} disabled={enviando}>
            Elegir otra parada
          </button>
        </div>
      )}

      {!contenido && fase === 'confirmada' && (
        <div className="hoja-reserva__bloque">
          <div className="hoja-reserva__confirmacion" role="status">
            <span className="hoja-reserva__visto" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </span>
            <div className="hoja-reserva__textos hoja-reserva__textos--juntos">
              <h2 className="hoja-reserva__titulo">Ya avisamos que estás esperando</h2>
              <span className="hoja-reserva__apoyo">{nombreParada}</span>
            </div>
          </div>
          {eta}
          {/* Mientras pregunta, la cuenta ya esta en el mensaje: se omite el
              bloque de cifras para que la hoja no tape el mapa entero. */}
          {!preguntarSiSigue && (
          <div className="hoja-reserva__datos">
            <div className="hoja-reserva__dato">
              <span className="hoja-reserva__dato-rotulo">En tu parada</span>
              <span className="hoja-reserva__numero-44">{esperando}</span>
            </div>
            <div className="hoja-reserva__aviso-min">
              <span className="hoja-reserva__numero-26">{minutosDeAviso ?? '–'}</span>
              <span className="hoja-reserva__rotulo-min">MIN DE AVISO</span>
            </div>
          </div>
          )}
          {ultimoDato && <div className="hoja-reserva__ultimo-dato">{ultimoDato}</div>}
          {preguntarSiSigue && (
            <div className="hoja-reserva__sigue" role="alert">
              <span className="hoja-reserva__titulo hoja-reserva__titulo--18">¿Seguís esperando?</span>
              <span className="hoja-reserva__apoyo">
                Tu aviso vence {textoVence(segundosRestantes)}. Si seguís en la parada, tocá «Sigo
                esperando» y te lo alargamos 15 minutos.
              </span>
            </div>
          )}
          <Aviso texto={aviso} />
          {preguntarSiSigue && (
            <button type="button" className="hoja-reserva__primario" onClick={onRenovar} disabled={enviando}>
              {enviando ? 'Avisando…' : 'Sigo esperando'}
            </button>
          )}
          {!preguntarSiSigue && extraConfirmada}
          <button type="button" className="hoja-reserva__soltar" onClick={onCancelar} disabled={enviando}>
            {enviando && !preguntarSiSigue ? 'Avisando…' : 'Ya no voy a esperar'}
          </button>
        </div>
      )}
    </section>
  );
}

/** La linea de la hoja minimizada: donde estas y cuanto te queda. */
function resumenDe(fase: FaseHoja, nombreParada: string): string {
  if (fase === 'confirmada') return `Esperando en ${nombreParada}`;
  if (fase === 'elegida' && nombreParada) return `Parada elegida: ${nombreParada}`;
  if (fase === 'buscando') return 'Buscando dónde estás…';
  return '¿En qué parada vas a esperar?';
}

/** "en 1 min 30 s", "en 40 segundos"; sin dato, "en menos de dos minutos". */
export function textoVence(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos)) return 'en menos de dos minutos';
  const s = Math.max(0, Math.ceil(segundos));
  if (s < 60) return `en ${s} ${s === 1 ? 'segundo' : 'segundos'}`;
  const min = Math.floor(s / 60);
  const resto = s % 60;
  return resto === 0 ? `en ${min} min` : `en ${min} min ${resto} s`;
}

function Aviso({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p className="hoja-reserva__aviso" role="alert">
      {texto}
    </p>
  );
}
