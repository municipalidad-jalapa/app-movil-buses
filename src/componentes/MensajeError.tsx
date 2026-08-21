import { ErrorApi } from '../core/errores';

interface Props {
  error: unknown;
  /** Si se pasa, se muestra un boton para reintentar. */
  onReintentar?: () => void;
}

/**
 * Muestra un error en lenguaje claro, nunca el ApiError crudo ni el codigo HTTP.
 * Todas las pantallas deberian usar este componente en vez de armar su propio texto.
 */
export function MensajeError({ error, onReintentar }: Props) {
  const texto =
    error instanceof ErrorApi
      ? error.mensajeParaUsuario()
      : 'Algo salio mal. Intenta de nuevo.';

  return (
    <div className="aviso-error" role="alert">
      <p>{texto}</p>
      {onReintentar && (
        <button type="button" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
