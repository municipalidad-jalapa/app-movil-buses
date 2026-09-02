package gt.muni.jalapa.ecoruta.demanda.web;

import gt.muni.jalapa.ecoruta.common.ApiError;
import gt.muni.jalapa.ecoruta.demanda.servicio.ReservaService;
import gt.muni.jalapa.ecoruta.demanda.web.dto.CrearReservaRequest;
import gt.muni.jalapa.ecoruta.demanda.web.dto.ReservaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reserva de un lugar en la parada (SCRUM-306 / HU Desarrollo-134).
 *
 * <p>Contrato vigente de Jira: {@code POST /api/v1/reservas}. No confundir con
 * el path legado del frontend {@code /api/v1/demanda/registros}.
 */
@Tag(name = "Demanda", description = "Reservas de espera en parada")
@RestController
@RequestMapping("/api/v1/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;

    @Operation(summary = "Indica que el pasajero está esperando en una parada",
            description = """
                    Publico: el pasajero es anonimo.

                    Crea una reserva en estado ACTIVA asociada al dispositivo y a
                    la parada. El dispositivo debe estar dentro de la geocerca
                    configurada (ecoruta.demanda.geocerca-metros) y no puede tener
                    otra reserva vigente (ACTIVA o RENOVADA).""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Reserva creada"),
            @ApiResponse(responseCode = "400", description = "Campos obligatorios ausentes o invalidos",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
            @ApiResponse(responseCode = "404", description = "La parada no existe",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
            @ApiResponse(responseCode = "422",
                    description = "Dispositivo lejos de la parada o con una reserva vigente",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    @PostMapping
    public ResponseEntity<ReservaResponse> crear(@Valid @RequestBody CrearReservaRequest peticion) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservaService.crear(peticion));
    }
}
