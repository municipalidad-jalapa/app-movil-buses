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
 * <p>Se omite, a proposito, el bloque "Llega a esta parada en" y su indicador
 * "calculo aproximado": el ETA es SCRUM-167 (sprint 6) y no hay dato real que
 * poner ahi. No se simula.
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
  /** Mensaje para el pasajero cuando algo no salio. Ya viene traducido. */
  aviso?: string | null;
  enviando?: boolean;
  onUsarCercana: () => void;
  onConfirmar: () => void;
  onElegirOtra: () => void;
  onCancelar: () => void;
}

export function HojaReserva({
  fase,
  nombreParada = '',
  distancia = null,
  esperando = 0,
  minutosDeAviso = null,
  ultimoDato,
  aviso = null,
  enviando = false,
  onUsarCercana,
  onConfirmar,
  onElegirOtra,
  onCancelar,
}: Props) {
  return (
    <section className="hoja-reserva" aria-label="Tu parada">
      <div className="hoja-reserva__manija" aria-hidden="true">
        <span />
      </div>

      {fase === 'vacia' && (
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

      {fase === 'buscando' && (
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

      {fase === 'elegida' && (
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

      {fase === 'confirmada' && (
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
          {ultimoDato && <div className="hoja-reserva__ultimo-dato">{ultimoDato}</div>}
          <Aviso texto={aviso} />
          <button type="button" className="hoja-reserva__soltar" onClick={onCancelar} disabled={enviando}>
            {enviando ? 'Avisando…' : 'Ya no voy a esperar'}
          </button>
        </div>
      )}
    </section>
  );
}

function Aviso({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p className="hoja-reserva__aviso" role="alert">
      {texto}
    </p>
  );
}
