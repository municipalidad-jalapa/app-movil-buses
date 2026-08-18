package gt.muni.jalapa.ecoruta.flota.repositorio;

import gt.muni.jalapa.ecoruta.flota.dominio.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    /** Se ejecuta en cada peticion de ingesta; va contra uq_equipo_codigo_publico. */
    Optional<Equipo> findByCodigoPublico(String codigoPublico);

    List<Equipo> findAllByOrderByCreadoEnDesc();
}
