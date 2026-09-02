package gt.muni.jalapa.ecoruta.demanda.dominio;

/**
 * Estados oficiales de una reserva en la parada (SCRUM-306).
 *
 * <p>Solo {@link #ACTIVA} y {@link #RENOVADA} cuentan como vigentes. El valor
 * legado {@code ACTIVO} de V1 no forma parte de este enumerado: las reservas
 * nuevas se crean siempre como {@link #ACTIVA}.
 */
public enum EstadoReserva {
    ACTIVA,
    RENOVADA,
    ABORDO,
    CANCELADA,
    EXPIRADA
}
