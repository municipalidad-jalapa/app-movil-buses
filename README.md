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

Levanta PostgreSQL 17 con PostGIS y el backend. Flyway aplica las migraciones solo al arrancar.

Verificá que respondió:

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

Ese es el único endpoint público mientras no esté integrado el login (HU-39). El resto responde
401 — ver la sección de problemas comunes.

### App web

```bash
cd app-movil-buses
npm install
npm run dev
```

Abre `http://localhost:5173`. Apunta a `http://localhost:8080` por defecto.

El servidor de desarrollo escucha en toda la red, así que podés abrirlo desde tu teléfono con la IP
de tu máquina. Conviene: **el diseño es móvil primero**, la pantalla de referencia es un teléfono de
360 px, no tu monitor.

---

## 4. Estructura

### Monorepo

```
docs/adr/           Decisiones de arquitectura. LEER ANTES DE CAMBIAR DISEÑO
docs/postman/       Colección de pruebas de la API
docs/PRUEBAS.md     Guía de pruebas manuales
docker-compose.yml  Entorno de desarrollo completo
```

### Backend (`api-buses-jalapa`)

Monolito modular: un solo despliegue, un paquete por módulo de negocio, **un dev dueño por módulo**.

```
src/main/java/gt/muni/jalapa/ecoruta/
  catalogo/        Rutas y paradas (PostGIS)
  demanda/         Registro de pasajeros y contador hacia 10  <- corazón del producto
  telemetria/      Ingesta GPS por lotes + SSE
  identidad/       JWT para conductor y admin (los pasajeros son anónimos)
  notificaciones/  Puerto de push (adaptador FCM pendiente)
  config/          Security, OpenAPI
  common/          Errores uniformes (ApiError)
src/main/resources/db/migration/   Migraciones Flyway: el esquema vive AQUÍ
```

**Regla de propiedad: un módulo no toca los repositories de otro.** La comunicación entre módulos
pasa por los services públicos.

### App web (`app-movil-buses`)

```
src/core/          config, cliente HTTP, errores y tipos de la API
src/componentes/   Layout, Cargando, MensajeError
src/paginas/       Pantallas
src/estilos/       tema.css (tokens, claro/oscuro), global.css
public/config.js   URL del backend, editable SIN recompilar
```

---

## 5. Cómo trabajamos

- **Una rama por historia**: `feature/hu-XX-nombre-corto`.
- **`main` y `develop` están protegidas.** No se puede hacer push directo: se abre MR hacia
  `develop` con al menos una revisión.
- Commits con Conventional Commits, **en español**, cortos, con la clave de la historia entre
  paréntesis: `feat: consulta de rutas y paradas (HU-35)`.
- **Código y comentarios en español.** Nombres de clases, mensajes de error, documentación.
- DTOs como `record` de Java; entidades con Lombok.
- Todo error de la API sale por `GlobalExceptionHandler` con formato `ApiError`. No inventar
  formatos nuevos.
- Endpoints bajo `/api/v1/`, anotados con `@Tag` y `@Operation`.

---

## 6. Reglas de negocio (no romper)

1. **Umbral de salida: 10** registros activos (`ecoruta.demanda.umbral-salida`).
2. **Geocerca de 150 m**: un registro solo vale si el dispositivo está a ≤150 m de la parada
   (`ST_DWithin` sobre `geography`).
3. **Un registro activo por dispositivo**: validado en el service **y** con índice único parcial en
   la base.
4. **TTL de 20 min**: un job expira los registros vencidos cada 60 s. Los expirados no cuentan.
5. **Telemetría ordenada por el timestamp del dispositivo**, no por el de llegada. El equipo a bordo
   acumula posiciones sin señal y las manda en lote. No "simplificar" esto a la hora del servidor:
   rompe la reconstrucción de recorridos offline.

**Coordenadas:** SRID 4326, orden `(lon, lat)` en PostGIS y JTS, pero los DTO exponen `latitud` y
`longitud` con nombre. Invertirlas es el error clásico de este dominio.

---

## 7. Pruebas

Colección de Postman, con asserts automáticos:

```bash
npx newman run docs/postman/EcoRuta.postman_collection.json \
  --folder "Fase 1 — Levanta" \
  --folder "Fase 2 — El contador (el corazon)" \
  --folder "Fase 3 — Seguridad y telemetria"
```

Dejá fuera la carpeta **Extras**: el request de SSE no cierra la conexión y bloquea al runner.

Pruebas de integración del backend (Testcontainers, **requiere Docker corriendo**):

```bash
cd api-buses-jalapa && mvn verify
```

App web:

```bash
cd app-movil-buses && npm test
```

Los pasos manuales están en [`docs/PRUEBAS.md`](docs/PRUEBAS.md), con las particularidades de
PowerShell en Windows.

---

## 8. Problemas comunes

**`cannot find symbol: log` o setters que no existen, al compilar el backend**
Lombok no está procesando anotaciones. Pasa con JDK 23 o superior: esas versiones ignoran los
procesadores que solo están en el classpath. El `pom.xml` ya lo resuelve declarando Lombok en
`annotationProcessorPaths`. Si te aparece, tu rama no tiene ese `pom.xml` actualizado.

**`Could not find a valid Docker environment` al correr `mvn verify`**
Docker Desktop no está levantado. Las pruebas de integración usan Testcontainers con PostGIS real;
no se puede usar H2 porque no soporta PostGIS.

**Todo responde 401 menos `/actuator/health`**
Es lo esperado hasta que se integre el login (HU-39). Spring Security protege todo por defecto.
Para probar otro endpoint, usá el usuario `user` y la clave que aparece en el log de arranque:
`Using generated security password: ...`. Cambia en cada arranque.

**`You are not allowed to push code to protected branches`**
`main` y `develop` están protegidas. Creá una rama `feature/hu-XX-...`, subila y abrí un MR.

**El puerto 8080 ya está en uso**
Otra instancia quedó corriendo. En Windows: `netstat -ano | findstr :8080` y después
`taskkill /F /PID <pid>`.

**`npm ci` falla por la versión de Node**
Vite 7 pide Node 20.19+ o 22.12+. Actualizá Node.

**Cambié la URL del backend en la app web y no toma efecto**
No uses variables `VITE_*` para eso: se incrustan al compilar. La URL sale de `public/config.js` en
tiempo de ejecución. Si ya compilaste, editá `dist/config.js` y recargá.

**El emulador o el teléfono no alcanzan `localhost`**
`localhost` es la máquina donde corre el navegador. Desde otro dispositivo usá la IP de tu máquina
en la red local, y ajustá `apiUrl` en `config.js`.

---

## 9. Estado actual

Sprint 2. El backend está migrando del esqueleto de CI/CD al proyecto EcoRuta real: las historias
HU-17 (proyecto base), HU-18 (esquema Flyway), HU-19 (errores uniformes) y HU-25 (documentación de
la API) entran en estos días. Si clonás y no encontrás los módulos de negocio, es porque todavía no
se mergearon.

La app web tiene su esqueleto (HU-26). El mapa, el contador en pantalla y el registro llegan en los
sprints siguientes.

Fechas que condicionan todo: congelamiento de funciones el **15/09**, entrega en producción con
usuarios reales el **31/10/2026**.

---

## 10. Si algo no cuadra

Este documento se prueba con gente que no participó del setup. Si seguiste los pasos y te
trabaste, es un defecto acá: decile al dueño de HU-24 qué paso falló y qué esperabas. Es la forma
en que se mantiene útil.
