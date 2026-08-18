package gt.muni.jalapa.ecoruta.telemetria.web;

import gt.muni.jalapa.ecoruta.common.ApiError;
import gt.muni.jalapa.ecoruta.flota.servicio.EquipoAutenticado;
import gt.muni.jalapa.ecoruta.telemetria.servicio.TelemetriaService;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.LoteAceptadoResponse;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.LotePosicionesRequest;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.PosicionActualResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Telemetria", description = "Ingesta y consulta de la posicion del bus")
@RestController
@RequestMapping("/api/v1/telemetria")
@RequiredArgsConstructor
public class TelemetriaController {

    private final TelemetriaService telemetriaService;

    @Operation(summary = "Recibe un lote de posiciones del equipo a bordo",
            description = """
                    Autenticado con la credencial propia del equipo (SCRUM-142): ya no
                    interviene ningun rol de persona.

                    Offline-first: el equipo acumula lecturas sin cobertura y las manda
                    juntas, posiblemente desordenadas. Se responde 202 aunque alguna se
                    descarte por tener el reloj fuera de la ventana de mas/menos 12 h.

                    Ya no interviene ningun rol de persona: basta la credencial del equipo.""")
    @SecurityRequirement(name = "credencialEquipo")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Lote aceptado"),
            @ApiResponse(responseCode = "400", description = "Cuerpo invalido",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
            @ApiResponse(responseCode = "401",
                    description = "Credencial ausente, invalida o revocada",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
    })
    @PostMapping("/posiciones")
    public ResponseEntity<LoteAceptadoResponse> ingestar(
            @AuthenticationPrincipal EquipoAutenticado equipo,
            @Valid @RequestBody LotePosicionesRequest peticion) {

        LoteAceptadoResponse resumen = telemetriaService.ingestar(equipo, peticion.posiciones());
        return ResponseEntity.accepted().body(resumen);
    }

    @Operation(summary = "Ultima posicion conocida del bus",
            description = "Publico. Responde 204 mientras no haya llegado ninguna posicion.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Posicion vigente"),
            @ApiResponse(responseCode = "204", description = "Todavia no hay ninguna posicion")
    })
    @GetMapping("/posicion")
    public ResponseEntity<PosicionActualResponse> posicionVigente() {
        return telemetriaService.posicionVigente()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NO_CONTENT).build());
    }
}
