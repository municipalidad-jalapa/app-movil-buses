package gt.muni.jalapa.ecoruta.flota.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Alta de un equipo a bordo. */
public record EmitirEquipoRequest(
        @NotBlank(message = "la etiqueta es obligatoria")
        @Size(max = 60, message = "la etiqueta no puede pasar de 60 caracteres")
        @Schema(example = "Tableta cabina 1") String etiqueta) {
}
