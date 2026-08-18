package gt.muni.jalapa.ecoruta.telemetria.servicio;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * @param ventanaHoras tolerancia contra relojes desfasados del equipo a bordo
 *                     (SCRUM-138). Simetrica: la fija asi el criterio escrito
 */
@ConfigurationProperties("ecoruta.telemetria")
public record TelemetriaProperties(int ventanaHoras) {

    public TelemetriaProperties {
        ventanaHoras = ventanaHoras <= 0 ? 12 : ventanaHoras;
    }

    public Duration ventana() {
        return Duration.ofHours(ventanaHoras);
    }
}
