package gt.muni.jalapa.ecoruta.flota.servicio;

import gt.muni.jalapa.ecoruta.flota.dominio.Equipo;

/**
 * El principal que queda en el SecurityContext cuando un equipo se autentica.
 *
 * <p>Deliberadamente NO lleva el secreto, ni el hash, ni la entidad JPA: solo lo
 * que necesita quien lo consume.
 */
public record EquipoAutenticado(Long equipoId, String codigoPublico) {

    public static EquipoAutenticado de(Equipo equipo) {
        return new EquipoAutenticado(equipo.getId(), equipo.getCodigoPublico());
    }
}
