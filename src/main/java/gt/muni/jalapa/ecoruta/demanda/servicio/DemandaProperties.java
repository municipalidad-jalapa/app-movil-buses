package gt.muni.jalapa.ecoruta.demanda.servicio;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Parametros de la demanda en parada.
 *
 * <p>{@code ttl-minutos} fija la expiracion al crear la reserva (SCRUM-306).
 * Cambiarlo a cinco minutos pertenece a SCRUM-307; aqui solo se lee el valor
 * configurado. {@code geocerca-metros} es el radio anti-abuso (ADR-002 / ADR-007).
 */
@ConfigurationProperties("ecoruta.demanda")
public record DemandaProperties(int umbralSalida, int ttlMinutos, int geocercaMetros) {

    public DemandaProperties {
        umbralSalida = umbralSalida <= 0 ? 10 : umbralSalida;
        ttlMinutos = ttlMinutos <= 0 ? 20 : ttlMinutos;
        geocercaMetros = geocercaMetros <= 0 ? 150 : geocercaMetros;
    }

    public Duration ttl() {
        return Duration.ofMinutes(ttlMinutos);
    }
}
