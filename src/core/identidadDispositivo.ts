/**
 * Identificador anónimo del dispositivo del pasajero.
 *
 * Se genera una sola vez y se conserva en localStorage para que las
 * solicitudes posteriores utilicen siempre el mismo identificador.
 */
const CLAVE_DISPOSITIVO = 'ecoruta_dispositivo_id';

export function obtenerIdDispositivo(): string {
  const guardado = localStorage.getItem(CLAVE_DISPOSITIVO);

  if (guardado) {
    return guardado;
  }

  const nuevoId = crypto.randomUUID();
  localStorage.setItem(CLAVE_DISPOSITIVO, nuevoId);

  return nuevoId;
}