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
 * El texto sale del traductor del cliente de API (ErrorApi.mensajeParaUsuario).
 * Color + icono + texto, nunca solo color (DESIGN.md §3.1 y §12).
 */
export function MensajeError({ error, onReintentar }: Props) {
  const texto =
    error instanceof ErrorApi
      ? error.mensajeParaUsuario()
      : typeof error === 'string'
        ? error
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
          d="M12 2 1 21h22L12 2zm0 4.3L19.5 19h-15L12 6.3zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"
        />
      </svg>

      <div className="aviso-error__cuerpo">
        <p>{texto}</p>
      </div>

      {onReintentar && (
        <button
          type="button"
          className="aviso-error__accion"
          onClick={onReintentar}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
