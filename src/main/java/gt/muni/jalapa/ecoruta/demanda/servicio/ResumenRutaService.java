package gt.muni.jalapa.ecoruta.demanda.servicio;

import gt.muni.jalapa.ecoruta.catalogo.servicio.CatalogoService;
import gt.muni.jalapa.ecoruta.catalogo.web.dto.ParadaResponse;
import gt.muni.jalapa.ecoruta.catalogo.web.dto.RutaResponse;
import gt.muni.jalapa.ecoruta.telemetria.servicio.TelemetriaService;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.PosicionActualResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Orquesta ruta, posicion y demanda para la pantalla del pasajero (SCRUM-283). */
@Service
@RequiredArgsConstructor
public class ResumenRutaService {

    private final CatalogoService catalogo;
    private final TelemetriaService telemetria;
    private final DemandaService demanda;

    @Transactional(readOnly = true)
    public ResumenRutaCompuesto componer(Long rutaId) {
        RutaResponse ruta = catalogo.buscar(rutaId);

        List<Long> paradaIds = ruta.paradas().stream().map(ParadaResponse::id).toList();
        Map<Long, Long> conteos = demanda.contarReservasActivasPorParada(paradaIds);

        Map<Long, Long> conteosCompletos = new LinkedHashMap<>();
        for (Long paradaId : paradaIds) {
            conteosCompletos.put(paradaId, conteos.getOrDefault(paradaId, 0L));
        }

        // Piloto con un solo bus y sin relacion Ruta-Vehiculo todavia: la ultima
        // posicion conocida en general es la unica fuente integrada en develop.
        PosicionActualResponse posicion = telemetria.posicionVigente(null).orElse(null);

        return new ResumenRutaCompuesto(ruta, posicion, conteosCompletos);
    }
}
