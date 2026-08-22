import type { ApiError } from './tipos';

const MENSAJE_400 = 'Los datos enviados no son validos.';
const MENSAJE_404 = 'No encontramos lo que buscabas.';
const MENSAJE_422_GENERICO = 'No se pudo completar la accion.';
/** Vocabulario DESIGN.md §10: no decir "error de conexion". */
const MENSAJE_RED = 'Sin datos nuevos: revisa tu conexion e intenta de nuevo.';
const MENSAJE_PERMISO = 'No tienes permiso para hacer esto.';
const MENSAJE_429 = 'Demasiados intentos. Espera un momento.';
const MENSAJE_5XX = 'El servicio no esta disponible en este momento. Intenta mas tarde.';
const MENSAJE_GENERICO = 'Algo salio mal. Intenta de nuevo.';

/**
 * Convierte un ErrorApi en texto para pantalla.
 *
 * Unica fuente de traduccion: 400, 404 y 422 (y el resto de estados que ya
 * manejaba la capa). Nunca devuelve codigo HTTP, nombre tecnico ni stack.
 */
export function traducirError(error: ErrorApi): string {
  if (error.esFallaDeRed) {
    return MENSAJE_RED;
  }
  switch (error.status) {
    case 400:
      return MENSAJE_400;
    case 401:
    case 403:
      return MENSAJE_PERMISO;
    case 404:
      return MENSAJE_404;
    case 422:
      return mensajeDeNegocio(error.detalle) ?? MENSAJE_422_GENERICO;
    case 429:
      return MENSAJE_429;
    default:
      return error.status >= 500 ? MENSAJE_5XX : MENSAJE_GENERICO;
  }
}

/** Mensaje de regla de negocio del 422, si el backend lo mando en lenguaje claro. */
function mensajeDeNegocio(detalle: ApiError | null): string | null {
  const mensaje = detalle?.message?.trim();
  if (!mensaje || esMensajeTecnico(mensaje)) {
    return null;
  }
  return mensaje;
}

function esMensajeTecnico(mensaje: string): boolean {
  return /^(HTTP\s*\d+|Bad Request|Not Found|Unprocessable Entity|ApiError|ErrorApi|TypeError|Failed to fetch|status:\s*\d+|path:\s*\/)/i.test(
    mensaje,
  ) || /\b(exception|stack trace|geofence|unprocessable|internal server error|null pointer|bad request|not found)\b/i.test(
    mensaje,
  );
}

/**
 * Error unico de la capa de red.
 *
 * Toda falla — HTTP, red caida, timeout — llega a la interfaz como un ErrorApi.
 * Las pantallas nunca ven un `ApiError` crudo ni un codigo de estado suelto:
 * muestran `mensajeParaUsuario()`.
 */
export class ErrorApi extends Error {
  /** Codigo HTTP. 0 cuando ni siquiera hubo respuesta (sin red, timeout, CORS). */
  readonly status: number;
  /** Cuerpo del backend, si vino con el formato ApiError. */
  readonly detalle: ApiError | null;

  constructor(status: number, message: string, detalle: ApiError | null = null) {
    super(message);
    this.name = 'ErrorApi';
    this.status = status;
    this.detalle = detalle;
  }

  /** No hubo respuesta del servidor: el telefono esta sin cobertura o el backend no responde. */
  get esFallaDeRed(): boolean {
    return this.status === 0;
  }

  /**
   * Texto en lenguaje claro para mostrar en pantalla.
   *
   * Para 422 devolvemos el mensaje del backend tal cual: son las reglas de negocio
   * (geocerca de 150 m, registro duplicado) y ya vienen redactadas para el pasajero.
   */
  mensajeParaUsuario(): string {
    return traducirError(this);
  }
}
