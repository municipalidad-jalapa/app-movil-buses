# EcoRuta

Plataforma del bus eléctrico municipal de Jalapa, Guatemala. Proyecto de Seminario de la
Universidad Mariano Gálvez, con la Municipalidad de Jalapa como sponsor.

**El problema que resuelve:** el bus solo sale cuando se reúnen 10 pasajeros, y hoy nadie puede ver
ese conteo. La funcionalidad central es el contador *"faltan N para que salga el bus"*. Todo lo
demás —mapa, ETA, notificaciones— orbita alrededor de eso.

Este documento busca dejarte trabajando en **menos de una hora**. Si te toma más, es un defecto del
documento: avisá para corregirlo.

---

## 1. Dónde está el código

El proyecto vive en **tres repositorios**. Esto es lo primero que confunde a quien llega:

| Repositorio | Qué tiene | Dónde |
|---|---|---|
| **Monorepo** | Documentación, ADR, colección de Postman, `docker-compose.yml` | GitHub: `WalyhU/ecoruta` |
| **Backend** | API Java + Spring Boot | GitLab: `municipalidad-jalapa/backend/api-buses-jalapa` |
| **App web** | Frontend React | GitLab: `municipalidad-jalapa/frontend/app-movil-buses` |

Para trabajar necesitás clonar el que te toque según tu rol. Para levantar el sistema completo,
los tres.

```bash
mkdir ecoruta && cd ecoruta
git clone https://github.com/WalyhU/ecoruta.git .
git clone https://gitlab.com/municipalidad-jalapa/backend/api-buses-jalapa.git
git clone https://gitlab.com/municipalidad-jalapa/frontend/app-movil-buses.git
```

Si el clon de GitLab te da **401**, pedí que te agreguen como miembro del proyecto: no es un
problema de tu configuración.

---

## 2. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| **Docker Desktop** | Cualquiera reciente | Base de datos, backend y pruebas de integración |
| **JDK** | 21 (LTS) | Compilar el backend |
| **Maven** | 3.9+ | Build del backend |
| **Node.js** | 20.19+ o 22.12+ | App web (Vite 7 no arranca con menos) |
| **Git** | Cualquiera reciente | — |

Verificá todo de una vez:

```bash
docker --version && java -version && mvn -version && node --version
```

**Docker tiene que estar corriendo**, no solo instalado. Es el requisito que más se olvida: sin él
no levanta la base ni corren las pruebas de integración.

---

## 3. Arranque

### Backend y base de datos

Desde el monorepo, con `docker-compose.yml`:

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
| `POST` | `/api/v1/auth/login` | público |
| `POST` | `/api/v1/telemetria/posiciones` | rol `CONDUCTOR` |
| `GET` | `/api/v1/telemetria/posicion` | público |
| `GET` | `/api/v1/telemetria/stream` | público (SSE) |

## Configuración

Por variables de entorno: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.
El `JWT_SECRET` del compose es solo de desarrollo.

Reglas de negocio configurables en `application.yml`: `ecoruta.demanda.umbral-salida` (10),
`ttl-minutos` (20), `geocerca-metros` (150).

## Pruebas

```bash
mvn test
```

Integración con Testcontainers e imagen `postgis/postgis:17-3.5` (requiere Docker en ejecución).
