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
 * <p>SCRUM-306 crea la reserva en estado {@link EstadoReserva#ACTIVA}. La
 * renovacion, el abordaje, la cancelacion y la expiracion programada pertenecen
 * a otras historias.
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

    public Reserva(String dispositivoId, Parada parada, EstadoReserva estado,
                   Instant creadoEn, Instant expiraEn) {
        this.dispositivoId = dispositivoId;
        this.parada = parada;
        this.estado = estado;
        this.creadoEn = creadoEn;
        this.expiraEn = expiraEn;
    }
}
