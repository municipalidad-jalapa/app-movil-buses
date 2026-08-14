package gt.gob.jalapa.buses.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ecoRutaOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("EcoRuta API")
                .description("Plataforma del bus eléctrico municipal de Jalapa")
                .version("v1"));
    }
}
