# EcoRuta — Backend

API del bus eléctrico municipal de Jalapa. Java 21 + Spring Boot 3.4, PostgreSQL 17 con PostGIS,
monolito modular (`catalogo`, `demanda`, `telemetria`, `identidad`, `notificaciones`).

## Levantar el entorno

```bash
docker compose up --build
```

Levanta PostGIS y el backend en `http://localhost:8080`. Flyway aplica las migraciones al arrancar.

Sin Docker (requiere PostGIS local):

```bash
mvn spring-boot:run
```

## Documentación de la API

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Colección de Postman: `docs/postman/EcoRuta.postman_collection.json` (importar en Postman;
  la variable `baseUrl` apunta a `http://localhost:8080`).

## Endpoints principales

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/api/v1/rutas` | público |
| `POST` | `/api/v1/demanda/registros` | público (UUID de dispositivo) |
| `GET` | `/api/v1/demanda/estado` | público |
| `POST` | `/api/v1/auth/login` | público — *pendiente, SCRUM-134 (Firebase)* |
| `POST` | `/api/v1/telemetria/posiciones` | **credencial de equipo** (`Authorization: Bearer eq_…`) |
| `GET` | `/api/v1/telemetria/posicion` | público |
| `GET` | `/api/v1/telemetria/stream` | público (SSE) — *pendiente, SCRUM-140* |
| `POST` `GET` | `/api/v1/admin/equipos` | `ROLE_ADMIN` |
| `POST` | `/api/v1/admin/equipos/{id}/revocacion` | `ROLE_ADMIN` |

## Provisionar un equipo a bordo

El equipo que reporta el GPS se autentica con **credencial propia**, no con la sesión de un
conductor (SCRUM-142). Así el módulo no depende de que nadie tenga sesión abierta, y se puede
revocar un solo equipo sin afectar a los demás.

```bash
curl -X POST localhost:8080/api/v1/admin/equipos \
     -H "X-Admin-Token: $ECORUTA_ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"etiqueta": "Tableta cabina 1"}'
```

```json
{"id":1,"codigoPublico":"eq_Uiay5Tc2kAB9",
 "credencial":"eq_Uiay5Tc2kAB9.gS1beUuHqfCxaNTVaCDDV2USfqkrU38y-RgtBI8pQZM",
 "etiqueta":"Tableta cabina 1"}
```

**La credencial se muestra una sola vez.** En la base solo queda su hash bcrypt: no se puede
recuperar. Si se pierde, se revoca el equipo y se emite otro.

El equipo la manda en cada lote:

```bash
curl -X POST localhost:8080/api/v1/telemetria/posiciones \
     -H "Authorization: Bearer eq_Uiay5Tc2kAB9.gS1beUuH..." \
     -H 'Content-Type: application/json' \
     -d '{"posiciones":[{"latitud":14.6335,"longitud":-89.9885,"velocidadKmh":18,
                         "timestamp":"2026-08-17T10:00:00Z"}]}'
```

Nunca en la URL: el secreto solo se acepta en la cabecera `Authorization`, porque los access
logs de un proxy inverso registran la URL pero no las cabeceras.

Revocar corta el acceso en la petición siguiente, sin esperar ninguna expiración:

```bash
curl -X POST localhost:8080/api/v1/admin/equipos/1/revocacion -H "X-Admin-Token: $ECORUTA_ADMIN_TOKEN"
```

> La credencial solo es confidencial sobre TLS. En producción el proxy inverso termina HTTPS
> (ADR-006); en desarrollo local viaja en claro.

## Configuración

Por variables de entorno: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`,
`ECORUTA_ADMIN_TOKEN`. Los del compose son solo de desarrollo.

`ECORUTA_ADMIN_TOKEN` es **provisional** (SCRUM-142, se retira con SCRUM-134): concede
`ROLE_ADMIN` por la cabecera `X-Admin-Token` mientras no exista la autenticación de personas
con Firebase. **Si la variable no está definida, nadie es admin y `/api/v1/admin/**` rechaza a
todos** — falla cerrado, que es lo que corresponde en producción.

Reglas de negocio configurables en `application.yml`: `ecoruta.demanda.umbral-salida` (10),
`ttl-minutos` (20), `geocerca-metros` (150), `ecoruta.telemetria.ventana-horas` (12).

## Pruebas

```bash
mvn test
```

Integración con Testcontainers e imagen `postgis/postgis:17-3.5` (requiere Docker en ejecución).
H2 no sirve: no tiene PostGIS y buena parte del dominio son columnas `geometry` (ADR-007).

Las pruebas `*IT` corren con surefire, no con failsafe, porque el pipeline ejecuta `mvn test`
y no `mvn verify`. Están declaradas en los `includes` del plugin: si se quitan de ahí se
compilan pero no se ejecutan, y el build sale verde igual.

Prueba manual del stream SSE con `curl` (pendiente de SCRUM-140):

```bash
curl -N localhost:8080/api/v1/telemetria/stream
```