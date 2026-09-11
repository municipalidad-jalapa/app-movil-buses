package gt.muni.jalapa.ecoruta.demanda.dominio;

import gt.muni.jalapa.ecoruta.catalogo.dominio.Parada;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

/**
 * Registro de un pasajero esperando en una parada ({@code registros_espera}).
 *
 * <p>SCRUM-306 crea la reserva en estado {@link EstadoReserva#ACTIVA}. HU-135
 * la renueva, HU-124 la cancela y HU-57 registra si el pasajero logro subir.
 *
 * <p>La parada se mapea como relacion y no como un {@code Long} suelto: HU-57 la
 * habia declarado como columna, y dos mapeos sobre {@code parada_id} no pueden
 * convivir en la misma entidad.
 */
@Entity
@Table(name = "registros_espera")
@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ToString.Include
    private Long id;

    @Column(name = "dispositivo_id", nullable = false, length = 36)
    @ToString.Include
    private String dispositivoId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parada_id", nullable = false)
    private Parada parada;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    @ToString.Include
    private EstadoReserva estado;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Column(name = "expira_en", nullable = false)
    @ToString.Include
    private Instant expiraEn;

    /** Respuesta de abordaje (HU-57). {@code null} mientras nadie responde. */
    @Column(name = "subio")
    private Boolean subio;

    /** Quien respondio el abordaje: el pasajero o el conductor (HU-57). */
    @Enumerated(EnumType.STRING)
    @Column(name = "abordaje_fuente", length = 20)
    private FuenteAbordaje abordajeFuente;

    @Column(name = "abordaje_en")
    private Instant abordajeEn;

    public Reserva(String dispositivoId, Parada parada, EstadoReserva estado,
                   Instant creadoEn, Instant expiraEn) {
        this.dispositivoId = dispositivoId;
        this.parada = parada;
        this.estado = estado;
        this.creadoEn = creadoEn;
        this.expiraEn = expiraEn;
    }

    /** Atajo para quien solo necesita el identificador, sin cargar la parada. */
    public Long getParadaId() {
        return parada == null ? null : parada.getId();
    }
}
