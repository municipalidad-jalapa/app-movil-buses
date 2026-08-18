package gt.muni.jalapa.ecoruta.aceptacion;

import gt.muni.jalapa.ecoruta.flota.servicio.AltaDeEquipo;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.List;

/**
 * Estado compartido entre los pasos de un mismo escenario.
 *
 * <p>Se limpia en el {@code @Before} de {@link ConfiguracionDeCucumber} en vez de
 * usar {@code @ScenarioScope}: el contexto de Spring es el mismo que usan las
 * pruebas JUnit, y un ambito propio de Cucumber sobre un contexto compartido es
 * una fuente de sorpresas que no compensa para un puñado de campos.
 */
@Component
public class ContextoDelEscenario {

    private final List<AltaDeEquipo> equipos = new ArrayList<>();
    private ResultActions ultimaRespuesta;

    public void reiniciar() {
        equipos.clear();
        ultimaRespuesta = null;
    }

    public void registrarEquipo(AltaDeEquipo alta) {
        equipos.add(alta);
    }

    /** El equipo del que habla el escenario cuando solo hay uno. */
    public AltaDeEquipo equipo() {
        return equipos.get(0);
    }

    public AltaDeEquipo equipo(int indice) {
        return equipos.get(indice);
    }

    public int cuantosEquipos() {
        return equipos.size();
    }

    public ResultActions ultimaRespuesta() {
        return ultimaRespuesta;
    }

    public void guardarRespuesta(ResultActions respuesta) {
        this.ultimaRespuesta = respuesta;
    }
}
