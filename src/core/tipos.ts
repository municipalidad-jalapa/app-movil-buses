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
 * `recorrido/web/dto/ParadaEtaResponse.java` (HU-75)
 *
 * El ETA propio tiene tres niveles de confianza (DESIGN.md §9): 'alta' trae
 * un numero exacto, 'media' trae un rango, y 'baja' no trae minutos --solo
 * `proximaSalida`, si el backend la conoce--. Nunca se asume que los campos
 * de minutos vienen llenos: dependen de `confianza`.
 */
export interface ParadaEta {
  paradaId: number;
  confianza: 'alta' | 'media' | 'baja';
  etaMinMinutos: number | null;
  etaMaxMinutos: number | null;
  /** "HH:mm". Solo se usa cuando no hay ETA numerico confiable. */
  proximaSalida: string | null;
  /** El bus ya paso por esta parada en el recorrido en curso (HU-75). */
  atendida: boolean;
}

/** `recorrido/web/dto/RutaEtaResponse.java` (HU-75) */
export interface RutaEta {
  rutaId: number;
  /** ISO-8601. Cuando el backend calculo este ETA, no cuando llego al cliente. */
  calculadoEn: string;
  paradas: ParadaEta[];
}

/**
 * `demanda/web/dto/ReservasActivasResponse.java` (HU-75)
 *
 * Reemplaza al viejo supuesto de "conteo hacia un umbral de diez": no existe tal
 * regla, esto es simplemente cuantas reservas activas hay por parada.
 */
export interface ReservasActivasPorParada {
  rutaId: number;
  /** paradaId -> cantidad de reservas activas */
  porParada: Record<string, number>;
}
