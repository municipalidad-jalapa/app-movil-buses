package gt.muni.jalapa.ecoruta.telemetria.servicio;

import gt.muni.jalapa.ecoruta.common.RecursoNoEncontradoException;
import gt.muni.jalapa.ecoruta.flota.dominio.Equipo;
import gt.muni.jalapa.ecoruta.flota.repositorio.EquipoRepository;
import gt.muni.jalapa.ecoruta.flota.servicio.EquipoAutenticado;
import gt.muni.jalapa.ecoruta.telemetria.dominio.Geo;
import gt.muni.jalapa.ecoruta.telemetria.dominio.PosicionHistorica;
import gt.muni.jalapa.ecoruta.telemetria.repositorio.PosicionHistoricaRepository;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.LoteAceptadoResponse;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.PosicionActualResponse;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.PosicionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Ingesta y consulta de posiciones (SCRUM-138 y SCRUM-139). */
@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetriaService {

    private final PosicionHistoricaRepository posiciones;
    private final EquipoRepository equipos;
    private final TelemetriaProperties propiedades;
    private final ApplicationEventPublisher eventos;

    /**
     * Recibe un lote de posiciones de un equipo ya autenticado.
     *
     * <p>Las lecturas con el reloj fuera de la ventana de tolerancia se descartan
     * en silencio y el lote se acepta igual. Rechazar el lote entero no ayudaria:
     * el equipo no puede corregir su reloj a partir del rechazo y reintentaria en
     * bucle, perdiendo tambien las lecturas buenas.
     */
    @Transactional
    public LoteAceptadoResponse ingestar(EquipoAutenticado autenticado,
                                         List<PosicionRequest> lote) {
        Equipo equipo = equipos.findById(autenticado.equipoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Equipo", autenticado.equipoId()));
        Instant ahora = Instant.now();

        List<PosicionRequest> aceptables = lote.stream()
                .filter(posicion -> dentroDeLaVentana(posicion.timestamp(), ahora))
                .toList();

        int descartadas = lote.size() - aceptables.size();
        if (descartadas > 0) {
            log.warn("Posicion descartada por timestamp fuera de ventana: equipo={} descartadas={}",
                    equipo.getCodigoPublico(), descartadas);
        }

        aceptables.forEach(posicion -> posiciones.save(new PosicionHistorica(
                Geo.punto(posicion.latitud(), posicion.longitud()),
                posicion.velocidadKmh(),
                posicion.timestamp(),
                equipo)));

        equipo.setUltimoUsoEn(ahora);

        // La posicion vigente es la de timestamp mas reciente del lote, no la
        // ultima del array: un lote acumulado sin cobertura llega desordenado.
        if (!aceptables.isEmpty()) {
            aceptables.stream().max(Comparator.comparing(PosicionRequest::timestamp))
                    .flatMap(masReciente -> posiciones.findFirstByOrderByRegistradoEnDescIdDesc())
                    .ifPresent(vigente -> eventos.publishEvent(new PosicionVigenteActualizada(vigente)));
        }

        return new LoteAceptadoResponse(lote.size(), aceptables.size(), descartadas);
    }

    /** Simetrica, tal como la fija SCRUM-138. */
    private boolean dentroDeLaVentana(Instant registradoEn, Instant ahora) {
        return Duration.between(registradoEn, ahora).abs()
                .compareTo(propiedades.ventana()) <= 0;
    }

    @Transactional(readOnly = true)
    public Optional<PosicionActualResponse> posicionVigente() {
        // El DTO se arma aqui dentro: open-in-view esta en false.
        return posiciones.findFirstByOrderByRegistradoEnDescIdDesc()
                .map(PosicionActualResponse::de);
    }
}
