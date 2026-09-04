package gt.muni.jalapa.ecoruta.demanda.servicio;

import gt.muni.jalapa.ecoruta.catalogo.dominio.Parada;
import gt.muni.jalapa.ecoruta.catalogo.repositorio.ParadaRepository;
import gt.muni.jalapa.ecoruta.common.RecursoNoEncontradoException;
import gt.muni.jalapa.ecoruta.common.ReglaDeNegocioException;
import gt.muni.jalapa.ecoruta.demanda.dominio.EstadoReserva;
import gt.muni.jalapa.ecoruta.demanda.dominio.Reserva;
import gt.muni.jalapa.ecoruta.demanda.repositorio.ReservaRepository;
import gt.muni.jalapa.ecoruta.demanda.web.dto.CrearReservaRequest;
import gt.muni.jalapa.ecoruta.demanda.web.dto.ReservaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

/** Crea reservas de espera en parada (SCRUM-306). */
@Service
@RequiredArgsConstructor
public class ReservaService {

    /** Solo estos estados bloquean una reserva nueva. ABORDO no es vigente. */
    static final Set<EstadoReserva> ESTADOS_VIGENTES =
            EnumSet.of(EstadoReserva.ACTIVA, EstadoReserva.RENOVADA);

    private static final String INDICE_VIGENTE = "uq_registro_activo_por_dispositivo";

    private final ReservaRepository reservas;
    private final ParadaRepository paradas;
    private final DemandaProperties demanda;
    private final Clock reloj;

    @Transactional
    public ReservaResponse crear(CrearReservaRequest peticion) {
        Parada parada = paradas.findById(peticion.paradaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Parada", peticion.paradaId()));

        if (!paradas.estaDentroDeGeocerca(
                parada.getId(), peticion.latitud(), peticion.longitud(), demanda.geocercaMetros())) {
            throw new ReglaDeNegocioException(
                    "Debes acercarte más a la parada para registrar que estás esperando.");
        }

        if (reservas.existeVigentePorDispositivo(peticion.dispositivoId(), ESTADOS_VIGENTES)) {
            throw new ReglaDeNegocioException("Este dispositivo ya tiene una reserva activa.");
        }

        Instant ahora = Instant.now(reloj);
        Reserva reserva = new Reserva(
                peticion.dispositivoId(),
                parada,
                EstadoReserva.ACTIVA,
                ahora,
                ahora.plus(demanda.ttl()));

        try {
            // saveAndFlush fuerza el INSERT ahora: el indice parcial es la garantia
            // final bajo solicitudes concurrentes.
            Reserva guardada = reservas.saveAndFlush(reserva);
            return ReservaResponse.de(guardada);
        } catch (DataIntegrityViolationException ex) {
            if (esViolacionDeReservaVigente(ex)) {
                throw new ReglaDeNegocioException("Este dispositivo ya tiene una reserva activa.");
            }
            throw ex;
        }
    }

    private static boolean esViolacionDeReservaVigente(DataIntegrityViolationException ex) {
        Throwable causa = ex.getMostSpecificCause();
        String mensaje = causa != null ? causa.getMessage() : ex.getMessage();
        return mensaje != null && mensaje.contains(INDICE_VIGENTE);
    }
}
