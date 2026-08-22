/**
 * Contratos de la API, copiados de los records del backend
 * (gt.muni.jalapa.ecoruta.*.dto). Si cambia el backend, cambia esto.
 *
 * CUIDADO CON LAS COORDENADAS: la API expone `latitud` y `longitud` como campos
 * con nombre, pero PostGIS y Google Maps trabajan en orden (lon, lat). Invertirlas
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

/** `catalogo/dto/RutaDTO.java` */
export interface Ruta {
  id: number;
  nombre: string;
  activa: boolean;
  paradas: Parada[];
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
