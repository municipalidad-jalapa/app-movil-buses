package gt.muni.jalapa.ecoruta.demanda.repositorio;

import gt.muni.jalapa.ecoruta.demanda.dominio.EstadoReserva;
import gt.muni.jalapa.ecoruta.demanda.dominio.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    /**
     * Una sola consulta: ¿el dispositivo ya tiene una reserva vigente?
     * Vigente = {@code ACTIVA} o {@code RENOVADA}. {@code ABORDO} no cuenta.
     */
    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END
              FROM Reserva r
             WHERE r.dispositivoId = :dispositivoId
               AND r.estado IN :estados
            """)
    boolean existeVigentePorDispositivo(@Param("dispositivoId") String dispositivoId,
                                        @Param("estados") Collection<EstadoReserva> estados);

    long countByDispositivoIdAndEstadoIn(String dispositivoId, Collection<EstadoReserva> estados);
}
