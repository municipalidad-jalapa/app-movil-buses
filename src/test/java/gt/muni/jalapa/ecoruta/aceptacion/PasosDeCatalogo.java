package gt.muni.jalapa.ecoruta.aceptacion;

import io.cucumber.java.es.Cuando;
import io.cucumber.java.es.Entonces;
import io.cucumber.java.es.Y;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Traduce los pasos de {@code consultar_rutas_y_paradas.feature} (SCRUM-130). */
public class PasosDeCatalogo {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ContextoDelEscenario contexto;

    @Cuando("alguien consulta las rutas")
    public void alguien_consulta_las_rutas() throws Exception {
        contexto.guardarRespuesta(mockMvc.perform(get("/api/v1/rutas")));
    }

    @Cuando("alguien consulta las rutas sin ninguna credencial")
    public void alguien_consulta_sin_credencial() throws Exception {
        // Es lo mismo: el pasajero nunca manda credencial. El escenario existe
        // para dejar el criterio escrito.
        alguien_consulta_las_rutas();
    }

    @Entonces("la consulta se acepta")
    public void la_consulta_se_acepta() throws Exception {
        contexto.ultimaRespuesta().andExpect(status().isOk());
    }

    @Entonces("se devuelve la ruta activa con sus {int} paradas")
    public void se_devuelve_la_ruta_con_paradas(int cuantas) throws Exception {
        contexto.ultimaRespuesta()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].activa").value(true))
                .andExpect(jsonPath("$[0].paradas", org.hamcrest.Matchers.hasSize(cuantas)));
    }

    @Entonces("la primera parada del recorrido es {string}")
    public void la_primera_parada_es(String nombre) throws Exception {
        contexto.ultimaRespuesta()
                .andExpect(jsonPath("$[0].paradas[0].orden").value(1))
                .andExpect(jsonPath("$[0].paradas[0].nombre").value(nombre));
    }

    @Y("la última parada del recorrido es {string}")
    public void la_ultima_parada_es(String nombre) throws Exception {
        contexto.ultimaRespuesta()
                .andExpect(jsonPath("$[0].paradas[3].nombre").value(nombre));
    }

    @Entonces("cada parada trae su latitud y su longitud por nombre")
    public void cada_parada_trae_lat_y_lon() throws Exception {
        contexto.ultimaRespuesta()
                .andExpect(jsonPath("$[0].paradas[0].latitud").isNumber())
                .andExpect(jsonPath("$[0].paradas[0].longitud").isNumber());
    }

    @Y("las coordenadas caen dentro de Jalapa")
    public void las_coordenadas_caen_en_jalapa() throws Exception {
        // Si se invirtieran (ADR-007), la latitud saldria en -89 y el bus
        // apareceria en el oceano Indico.
        String cuerpo = contexto.ultimaRespuesta().andReturn().getResponse().getContentAsString();
        double latitud = Double.parseDouble(cuerpo.replaceAll(".*?\"latitud\":([-0-9.]+).*", "$1"));
        double longitud = Double.parseDouble(cuerpo.replaceAll(".*?\"longitud\":([-0-9.]+).*", "$1"));

        assertThat(latitud).isBetween(14.0, 15.0);
        assertThat(longitud).isBetween(-91.0, -89.0);
    }
}
