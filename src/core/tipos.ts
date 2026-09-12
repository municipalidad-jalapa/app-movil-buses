/**
 * Contratos de la API, copiados de los records del backend
 * (gt.muni.jalapa.ecoruta.*.dto). Si cambia el backend, cambia esto.
 *
 * CUIDADO CON LAS COORDENADAS: la API expone `latitud` y `longitud` como campos
 * con nombre, pero PostGIS, GeoJSON y MapLibre trabajan en orden (lon, lat). Invertirlas
 * es el bug clasico de este dominio: el bus aparece en el oceano Indico.
 */

/** Formato uniforme de error de toda la API (`common/ApiError.java`). */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

/** `catalogo/dto/ParadaDTO.java` */
export interface Parada {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  orden: number;
}

/** `catalogo/web/dto/PuntoResponse.java` */
export interface Punto {
  latitud: number;
  longitud: number;
}

/** `catalogo/web/dto/RutaResponse.java` */
export interface Ruta {
  id: number;
  nombre: string;
  activa: boolean;
  paradas: Parada[];
  /**
   * El recorrido siguiendo las calles. Llega vacio si la ruta aun no lo tiene
   * cargado, y entonces el mapa une las paradas con rectas: se ve peor, pero se
   * ve. Nunca se asume que viene lleno.
   */
  trazado: Punto[];
}

/**
 * `demanda/dto/EstadoDemandaDTO.java`
 * El contador hacia el umbral: es la funcionalidad nucleo del producto.
 */
export interface EstadoDemanda {
  totalEsperando: number;
  umbralSalida: number;
  faltanParaSalir: number;
  /** paradaId -> cantidad de registros activos */
  porParada: Record<string, number>;
}

/** `telemetria/web/dto/PosicionActualResponse.java` */
export interface Posicion {
  latitud: number;
  longitud: number;
  velocidadKmh: number | null;
  /** ISO-8601. Lo pone el dispositivo a bordo, no el servidor. */
  timestamp: string;
  /** Identificador del bus, ej. "BUS-01". Lo agrego SCRUM-143. */
  vehiculo: string | null;
}

/** `demanda/dto/CrearRegistroRequest.java` */
export interface CrearRegistroRequest {
  dispositivoId: string;
  paradaId: number;
  latitud: number;
  longitud: number;
}

/**
 * Respuesta esperada al crear correctamente el registro.
 * Este contrato se usará en la pantalla de la HU-53.
 */
export interface RegistroCreadoResponse {
  id: number;
  paradaId: number;
  estado: string;
  expiraEn: string;
}

/**
 * `demanda/web/dto/ResumenRutaResponse.java` (SCRUM-284). Solo lo que usa el
 * mapa: el conteo de reservas vigentes por parada.
 */
export interface ResumenRuta {
  reservasActivas: {
    porParada: { paradaId: number; reservasActivas: number }[];
    calculadoEn: string;
  };
}

/**
 * Estado de la reserva (`demanda/dominio/EstadoReserva.java`).
 *
 * ACTIVA al reservar, RENOVADA si el pasajero extendio la vigencia (HU-52),
 * ABORDO o CANCELADA segun la respuesta de abordaje (HU-58) o la cancelacion
 * (HU-124), y EXPIRADA si vencio sin respuesta.
 */
export type EstadoReserva = 'ACTIVA' | 'RENOVADA' | 'ABORDO' | 'CANCELADA' | 'EXPIRADA';

/** La reserva tal como la guarda la app. */
export interface Reserva {
  id: number;
  paradaId: number;
  estado: EstadoReserva;
  expiraEn: string;
}

/** Cuerpo de `POST /api/v1/dispositivos/notificaciones`. Responde 204. */
export interface RegistroTokenRequest {
  dispositivoId: string;
  tokenNotificacion: string;
}

/** Cuerpo de `POST /api/v1/reservas/{id}/abordaje`. */
export interface AbordajeRequest {
  subio: boolean;
}

/** Respuesta 200 de `POST /api/v1/reservas/{id}/abordaje`. */
export interface RespuestaAbordaje {
  id: number;
  estado: EstadoReserva;
}
