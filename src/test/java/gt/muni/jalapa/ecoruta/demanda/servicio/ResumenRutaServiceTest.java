package gt.muni.jalapa.ecoruta.demanda.servicio;

import gt.muni.jalapa.ecoruta.catalogo.servicio.CatalogoService;
import gt.muni.jalapa.ecoruta.catalogo.web.dto.ParadaResponse;
import gt.muni.jalapa.ecoruta.catalogo.web.dto.RutaResponse;
import gt.muni.jalapa.ecoruta.common.RecursoNoEncontradoException;
import gt.muni.jalapa.ecoruta.telemetria.servicio.TelemetriaService;
import gt.muni.jalapa.ecoruta.telemetria.web.dto.PosicionActualResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** SCRUM-283: orquestacion del resumen de arranque. */
@ExtendWith(MockitoExtension.class)
class ResumenRutaServiceTest {

    @Mock
    private CatalogoService catalogo;

    @Mock
    private TelemetriaService telemetria;

    @Mock
    private DemandaService demanda;

    @InjectMocks
    private ResumenRutaService servicio;

    private RutaResponse rutaEjemplo;
    private PosicionActualResponse posicionEjemplo;

    @BeforeEach
    void preparar() {
        rutaEjemplo = new RutaResponse(
                1L,
                "Ruta de ejemplo",
                true,
                List.of(
                        parada(1L, 1),
                        parada(2L, 2),
                        parada(3L, 3),
                        parada(4L, 4)),
                List.of());
        posicionEjemplo = new PosicionActualResponse(14.63, -89.98, 20.0, Instant.parse("2026-08-17T10:00:00Z"), "BUS-01");
    }

    @Test
    void compone_ruta_posicion_y_reservas() {
        when(catalogo.buscar(1L)).thenReturn(rutaEjemplo);
        when(demanda.contarReservasActivasPorParada(List.of(1L, 2L, 3L, 4L)))
                .thenReturn(Map.of(1L, 2L, 3L, 1L));
        when(telemetria.posicionVigente(null)).thenReturn(Optional.of(posicionEjemplo));

        ResumenRutaCompuesto resumen = servicio.componer(1L);

        assertThat(resumen.ruta()).isEqualTo(rutaEjemplo);
        assertThat(resumen.posicionActual()).isEqualTo(posicionEjemplo);
        assertThat(resumen.reservasActivasPorParada())
                .containsExactly(
                        Map.entry(1L, 2L),
                        Map.entry(2L, 0L),
                        Map.entry(3L, 1L),
                        Map.entry(4L, 0L));
    }

    @Test
    void tolera_que_el_bus_no_tenga_posicion() {
        when(catalogo.buscar(1L)).thenReturn(rutaEjemplo);
        when(demanda.contarReservasActivasPorParada(any())).thenReturn(Map.of());
        when(telemetria.posicionVigente(null)).thenReturn(Optional.empty());

        ResumenRutaCompuesto resumen = servicio.componer(1L);

        assertThat(resumen.ruta()).isEqualTo(rutaEjemplo);
        assertThat(resumen.posicionActual()).isNull();
        assertThat(resumen.reservasActivasPorParada()).containsExactly(
                Map.entry(1L, 0L),
                Map.entry(2L, 0L),
                Map.entry(3L, 0L),
                Map.entry(4L, 0L));
    }

    @Test
    void completa_con_cero_las_paradas_sin_reservas() {
        when(catalogo.buscar(1L)).thenReturn(rutaEjemplo);
        when(demanda.contarReservasActivasPorParada(List.of(1L, 2L, 3L, 4L)))
                .thenReturn(Map.of(1L, 2L, 3L, 1L));
        when(telemetria.posicionVigente(null)).thenReturn(Optional.empty());

        ResumenRutaCompuesto resumen = servicio.componer(1L);

        assertThat(resumen.reservasActivasPorParada())
                .containsExactly(
                        Map.entry(1L, 2L),
                        Map.entry(2L, 0L),
                        Map.entry(3L, 1L),
                        Map.entry(4L, 0L));
    }

    @Test
    void propaga_recurso_no_encontrado_si_la_ruta_no_existe() {
        when(catalogo.buscar(999L)).thenThrow(new RecursoNoEncontradoException("Ruta", 999L));

        assertThatThrownBy(() -> servicio.componer(999L))
                .isInstanceOf(RecursoNoEncontradoException.class);

        verifyNoInteractions(demanda);
        verifyNoInteractions(telemetria);
    }

    @Test
    void consulta_demanda_una_sola_vez_para_todas_las_paradas() {
        when(catalogo.buscar(1L)).thenReturn(rutaEjemplo);
        when(demanda.contarReservasActivasPorParada(any())).thenReturn(Map.of());
        when(telemetria.posicionVigente(null)).thenReturn(Optional.empty());

        servicio.componer(1L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(demanda).contarReservasActivasPorParada(captor.capture());
        assertThat(captor.getValue()).containsExactly(1L, 2L, 3L, 4L);
    }

    @Test
    void consulta_telemetria_una_sola_vez() {
        when(catalogo.buscar(1L)).thenReturn(rutaEjemplo);
        when(demanda.contarReservasActivasPorParada(any())).thenReturn(Map.of());
        when(telemetria.posicionVigente(null)).thenReturn(Optional.empty());

        servicio.componer(1L);

        verify(telemetria).posicionVigente(eq(null));
    }

    private static ParadaResponse parada(long id, int orden) {
        return new ParadaResponse(id, "Parada " + id, 14.63, -89.98, orden);
    }
}
