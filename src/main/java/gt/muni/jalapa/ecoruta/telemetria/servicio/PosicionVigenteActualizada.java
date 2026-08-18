package gt.muni.jalapa.ecoruta.telemetria.servicio;

import gt.muni.jalapa.ecoruta.telemetria.dominio.PosicionHistorica;

/**
 * Se publica tras cada lote aceptado que mueve la posicion vigente.
 *
 * <p>Es el gancho para SCRUM-140 (el stream SSE): esa historia se suscribe y
 * difunde, sin tocar una sola linea de la ingesta. La ruta /telemetria/stream ya
 * esta declarada publica en SecurityConfig.
 */
public record PosicionVigenteActualizada(PosicionHistorica posicion) {
}
