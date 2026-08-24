package gt.muni.jalapa.ecoruta.catalogo.web.dto;

import gt.muni.jalapa.ecoruta.catalogo.dominio.Ruta;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Comparator;
import java.util.List;

/** Una ruta con sus paradas. Lo consume el mapa del pasajero (HU-50). */
@Schema(description = "Ruta activa con sus paradas")
public record RutaResponse(
        @Schema(example = "1") Long id,
        @Schema(example = "Ruta Centro - Terminal") String nombre,
        @Schema(example = "true") boolean activa,
        @Schema(description = "Paradas en el orden del recorrido") List<ParadaResponse> paradas) {

    public static RutaResponse de(Ruta ruta) {
        return new RutaResponse(
                ruta.getId(),
                ruta.getNombre(),
                ruta.isActiva(),
                ruta.getParadas().stream()
                        // Se reordena aqui ademas del @OrderBy: con join fetch,
                        // Hibernate no garantiza el orden de la coleccion, y el
                        // mapa dibuja la linea siguiendo esta secuencia.
                        .sorted(Comparator.comparingInt(p -> p.getOrden()))
                        .map(ParadaResponse::de)
                        .toList());
    }
}
