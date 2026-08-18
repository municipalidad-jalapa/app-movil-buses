package gt.muni.jalapa.ecoruta.flota.web.dto;

import gt.muni.jalapa.ecoruta.flota.servicio.AltaDeEquipo;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Respuesta del alta de un equipo. <b>El unico lugar de todo el sistema donde el
 * secreto viaja en claro</b>, y una sola vez: no se persiste ni se puede volver
 * a obtener. Si se pierde, se revoca el equipo y se emite otro.
 */
@Schema(description = "Credencial recien emitida. El secreto se muestra UNA sola vez.")
public record EquipoCreadoResponse(
        @Schema(example = "12") Long id,
        @Schema(example = "eq_XXXXXXXXXXXX") String codigoPublico,
        @Schema(description = "Credencial completa para la cabecera Authorization. "
                + "No se vuelve a mostrar.",
                example = "eq_XXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        String credencial,
        @Schema(example = "Tableta cabina 1") String etiqueta) {

    public static EquipoCreadoResponse de(AltaDeEquipo alta) {
        return new EquipoCreadoResponse(
                alta.equipoId(),
                alta.credencial().codigoPublico(),
                alta.credencial().credencialCompleta(),
                alta.etiqueta());
    }

    /**
     * Un record imprime TODOS sus componentes en el toString() generado, y este
     * lleva la credencial viva. Sin esta sobreescritura bastaria un
     * log.debug("{}", respuesta) para volcar una credencial usable a los logs.
     */
    @Override
    public String toString() {
        return "EquipoCreadoResponse[id=%s, codigoPublico=%s, credencial=***, etiqueta=%s]"
                .formatted(id, codigoPublico, etiqueta);
    }
}
