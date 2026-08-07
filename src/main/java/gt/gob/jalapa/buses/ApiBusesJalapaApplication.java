package gt.gob.jalapa.buses;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Punto de entrada de la aplicacion.
 *
 * Este es un esqueleto minimo, usado unicamente para validar el pipeline
 * de CI/CD (build -> test -> docker build/push) mientras el equipo de
 * backend desarrolla la logica de negocio real del proyecto:
 * gestion de rutas, monitoreo GPS, usuarios, paradas y reportes.
 */
@SpringBootApplication
@RestController
public class ApiBusesJalapaApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiBusesJalapaApplication.class, args);
    }

    /**
     * Endpoint de verificacion simple, sin dependencias externas.
     * Util para confirmar que la imagen Docker generada por el pipeline
     * efectivamente levanta la aplicacion correctamente.
     */
    @GetMapping("/health")
    public String health() {
        return "OK - api-buses-jalapa (esqueleto de prueba CI/CD)";
    }
}
