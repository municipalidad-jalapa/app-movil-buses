package gt.gob.jalapa.buses;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Prueba minima para el job 'maven-test' del pipeline.
 *
 * IMPORTANTE para el equipo de backend:
 * Esta prueba solo valida que el contexto de Spring Boot arranque.
 * Como el pom.xml todavia no incluye Spring Data JPA ni el driver de
 * PostgreSQL, esta prueba NO intenta conectarse a ninguna base de datos,
 * por lo que corre sin necesitar las variables DB_HOST/DB_USER/DB_PASSWORD.
 *
 * Cuando agreguen 'spring-boot-starter-data-jpa' y el driver de PostgreSQL,
 * esta prueba empezara a requerir una base de datos real (o un perfil de
 * pruebas con una base de datos en memoria / Testcontainers) para poder
 * levantar el contexto completo.
 */
@SpringBootTest
class ApiBusesJalapaApplicationTests {

    @Test
    void contextLoads() {
        // Intencionalmente vacio: si el contexto de Spring Boot no logra
        // levantar, esta prueba falla automaticamente.
    }
}
