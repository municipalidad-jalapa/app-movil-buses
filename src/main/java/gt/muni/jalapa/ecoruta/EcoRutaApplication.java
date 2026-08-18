package gt.muni.jalapa.ecoruta;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
// Hasta ahora las propiedades ecoruta.* estaban declaradas en application.yml y
// nadie las leia. Con esto los records @ConfigurationProperties se enlazan solos.
@ConfigurationPropertiesScan
public class EcoRutaApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcoRutaApplication.class, args);
    }
}
