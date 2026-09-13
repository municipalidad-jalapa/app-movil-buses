/**
 * Cadencia de actualizacion de datos en vivo que no viajan por SSE (ETA, demanda).
 *
 * DESIGN.md §13 [DURA]: "Los datos llegan por SSE cada 2-5 minutos. El diseño no
 * promete precision al segundo." El panel del conductor (HU-75) no tiene su propio
 * stream: usa esta misma constante para que su refresco quede, por construccion,
 * a la misma frecuencia que la pantalla del pasajero, tal como pide el criterio de
 * aceptacion. Si el pasajero alguna vez consume estos mismos endpoints, debe
 * importar esta constante en lugar de declarar la suya.
 */
export const INTERVALO_ACTUALIZACION_DATOS_MS = 2 * 60_000;
