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
    EXPIRADA;

    /** Vigente para recibir avisos de aproximacion (HU-57). */
    public boolean vigenteParaAviso() {
        return this == ACTIVA || this == RENOVADA;
    }

    public boolean permiteAbordajePasajero() {
        return vigenteParaAviso();
    }

    /** El conductor puede corregir incluso despues de la respuesta del pasajero. */
    public boolean permiteAbordajeConductor() {
        return this == ACTIVA || this == RENOVADA || this == ABORDO || this == CANCELADA;
    }
}
