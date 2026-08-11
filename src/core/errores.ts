import type { ApiError } from './tipos';

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
    if (this.esFallaDeRed) {
      return 'No pudimos conectar. Revisa tu conexion e intenta de nuevo.';
    }
    switch (this.status) {
      case 400:
        return 'Los datos enviados no son validos.';
      case 401:
      case 403:
        return 'No tienes permiso para hacer esto.';
      case 404:
        return 'No encontramos lo que buscabas.';
      case 422:
        return this.detalle?.message ?? 'No se pudo completar la accion.';
      case 429:
        return 'Demasiados intentos. Espera un momento.';
      default:
        return this.status >= 500
          ? 'El servicio no esta disponible en este momento. Intenta mas tarde.'
          : 'Algo salio mal. Intenta de nuevo.';
    }
  }
}
