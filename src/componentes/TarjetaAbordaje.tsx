import { MensajeError } from './MensajeError';
import { useReserva } from '../hooks/useReserva';
import './TarjetaAbordaje.css';

/**
 * La pregunta de abordaje (HU-58).
 *
 * Aparece cuando llega el aviso de que el bus llego a la parada del pasajero, y
 * le deja responder si logro subir. Sin esto la reserva se queda en ACTIVA hasta
 * que expire sola y nadie sabe que paso.
 *
 * No hay artboard de esta pantalla en design/: se construyo con las reglas de
 * DESIGN.md. Los dos botones pesan igual a proposito — "no subi" no es un
 * fracaso del pasajero y no debe verse como la opcion secundaria.
 *
 * Va abajo en la pantalla del mapa: DESIGN.md §8 [DURA] prohibe que una tarjeta
 * flotante tape el MarcadorBus.
 */

interface Props {
  /** true cuando llego el aviso de abordaje y todavia no hubo respuesta. */
  preguntando: boolean;
}

export function TarjetaAbordaje({ preguntando }: Props) {
  const { reserva, respondiendo, errorAbordaje, responderAbordaje } = useReserva();

  if (!reserva) {
    return null;
  }

  if (reserva.estado === 'ABORDO') {
    return (
      <div className="abordaje abordaje--resuelto" role="status" aria-live="polite">
        <IconoConfirmado />
        <p>Buen viaje. Tu reserva quedó cerrada.</p>
      </div>
    );
  }

  if (reserva.estado === 'CANCELADA') {
    return (
      <div className="abordaje abordaje--resuelto" role="status" aria-live="polite">
        <IconoNoSubio />
        <p>Anotamos que no lograste subir. Podés volver a avisar cuando quieras.</p>
      </div>
    );
  }

  if (!preguntando) {
    return null;
  }

  return (
    <section className="abordaje" aria-labelledby="abordaje-titulo">
      <h2 id="abordaje-titulo">¿Lograste subir?</h2>

      {Boolean(errorAbordaje) && (
        <MensajeError error={errorAbordaje} onReintentar={() => void responderAbordaje(true)} />
      )}

      <div className="abordaje__acciones">
        <button
          type="button"
          className="abordaje__boton abordaje__boton--si"
          onClick={() => void responderAbordaje(true)}
          disabled={respondiendo}
        >
          <IconoConfirmado />
          <span>Sí subí</span>
        </button>

        <button
          type="button"
          className="abordaje__boton abordaje__boton--no"
          onClick={() => void responderAbordaje(false)}
          disabled={respondiendo}
        >
          <IconoNoSubio />
          <span>No subí</span>
        </button>
      </div>

      {respondiendo && (
        <p className="abordaje__enviando" role="status" aria-live="polite">
          Enviando tu respuesta...
        </p>
      )}
    </section>
  );
}

function IconoConfirmado() {
  return (
    <svg className="abordaje__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5 10 17.5 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoNoSubio() {
  return (
    <svg className="abordaje__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 7 17 17M17 7 7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
