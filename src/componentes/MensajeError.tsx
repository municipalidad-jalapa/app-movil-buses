import { ErrorApi } from '../core/errores';
import './MensajeError.css';

interface Props {
  error: unknown;
  /** Si se pasa, se muestra un boton para reintentar. */
  onReintentar?: () => void;
}

/**
 * Muestra un error en lenguaje claro, nunca el ApiError crudo ni el codigo HTTP.
 * Todas las pantallas deberian usar este componente en vez de armar su propio texto.
 *
 * El estado no va solo por color: icono + texto (+ accion si aplica). DESIGN.md §3.
 */
export function MensajeError({ error, onReintentar }: Props) {
  const texto =
    error instanceof ErrorApi
      ? error.mensajeParaUsuario()
      : 'Algo salio mal. Intenta de nuevo.';

  return (
    <div className="aviso-error" role="alert">
      <svg
        className="aviso-error__icono"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 3.2 2.4 20.2h19.2L12 3.2zm0 5.3c.6 0 1 .5 1 1.1v4.2c0 .6-.4 1.1-1 1.1s-1-.5-1-1.1V9.6c0-.6.4-1.1 1-1.1zm0 8.2c.7 0 1.2.5 1.2 1.2S12.7 19 12 19s-1.2-.5-1.2-1.1.5-1.2 1.2-1.2z"
        />
      </svg>
      <div className="aviso-error__cuerpo">
        <p>{texto}</p>
      </div>
      {onReintentar && (
        <button type="button" className="aviso-error__accion" onClick={onReintentar}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
