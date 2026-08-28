# EcoRuta — App web

App web del bus eléctrico municipal de Jalapa. El pasajero abre la página, ve dónde viene el bus
y cuántos faltan para que salga. Sin instalar nada y sin crear cuenta.

React + TypeScript sobre Vite. **Diseño móvil primero**: la pantalla de referencia es un teléfono
de 360 px, no un escritorio.

## Requisitos

- Node.js 20 o superior
- El backend corriendo (repositorio `backend/api-buses-jalapa`, `docker compose up`)

## Arrancar

```bash
cp .env.example .env
```

En Windows (PowerShell o cmd):

```bat
copy .env.example .env
```

Editá `.env` y reemplazá los placeholders. En local, si el backend corre con `docker compose`,
`VITE_API_BASE_URL` suele ser `http://localhost:8080`. `VITE_GOOGLE_MAPS_API_KEY` puede ser la llave
de tu proyecto de Google Cloud (cualquier cadena no vacía pasa la validación; la restricción por
dominio es HU-132).
Después:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El servidor de desarrollo escucha en toda la red, así que podés
abrirlo desde tu teléfono con la IP de la máquina — conviene, porque el diseño es móvil primero.

Si falta una variable o el formato es inválido, la app **no arranca**: vas a ver un error que nombra
la variable (`VITE_API_BASE_URL` o `VITE_GOOGLE_MAPS_API_KEY`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Verifica tipos y genera el build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build de producción |
| `npm test` | Pruebas con Vitest |

## Configuración por entorno

La dirección del backend y la llave de Maps **no van en el código**. Se leen de variables `VITE_*`
a través del módulo único `src/core/config.ts` (HU-128). Ese módulo valida al arrancar con Zod y
falla de inmediato si falta un valor o el formato es inválido.

| Variable | Para qué |
|---|---|
| `VITE_API_BASE_URL` | URL absoluta del backend (`http://` o `https://`). Sin barra final. En local suele ser `http://localhost:8080`. |
| `VITE_GOOGLE_MAPS_API_KEY` | Llave pública de Google Maps. Cadena no vacía. |

Cómo configurar en local (solo esto hace falta):

1. Copiá `.env.example` a `.env`.
2. Reemplazá los placeholders por tus valores reales.
3. `npm run dev`.

`.env`, `.env.local` y el resto de variantes con valores reales están en `.gitignore`. Solo se
versiona `.env.example`.

Las variables `VITE_` quedan en el bundle que descarga el navegador. No pongas contraseñas, llaves
privadas ni tokens de servidor. `VITE_API_BASE_URL` y `VITE_GOOGLE_MAPS_API_KEY` son públicas por
diseño. Restringir la llave de Maps por dominio es **HU-132** (CI/CD y Google Cloud Console), no
esta historia.

Nadie más que `src/core/config.ts` debe leer `import.meta.env`.

## Estructura

```
src/
  core/          config, cliente HTTP, errores y tipos de la API
    notificaciones/  permiso, Firebase Cloud Messaging y registro del token
  componentes/   Layout, Cargando, MensajeError, MapaJalapa, TarjetaAbordaje…
  estado/        ReservaProvider (la reserva del pasajero, compartida)
  hooks/         useRutas, usePosicionBus, useReserva, useAvisosDelBus…
  paginas/       Mapa, PantallaRegistro, NoEncontrada
  estilos/       tema.css (tokens, claro/oscuro), global.css
public/          firebase-messaging-sw.js (Service Worker de los avisos)
.env.example     placeholders de VITE_API_BASE_URL y de las VITE_FIREBASE_*
```

## Avisos del bus (HU-58)

Cuando el bus se acerca a la parada reservada, el pasajero recibe un aviso; cuando llega, un
segundo aviso le pregunta si logró subir. Todo pasa por Firebase Cloud Messaging con un Service
Worker en `public/firebase-messaging-sw.js`, que atiende los avisos con la pestaña cerrada.

- El permiso se pide **después** de explicar para qué sirve, nunca de golpe, y solo una vez que ya
  hay una reserva que avisar. Si el pasajero dice que no, se recuerda en `localStorage` y la
  aplicación no vuelve a insistir.
- El protocolo de Firebase se carga con `import()` dinámico: no entra al bundle inicial.
- El Service Worker es un archivo estático y **no lee `import.meta.env`**. La configuración le
  llega en la query string con la que `core/notificaciones/mensajeria.ts` lo registra.
- La reserva vive en `estado/ReservaProvider` y se consulta con `useReserva()`. La respuesta de
  abordaje actualiza ese estado, y por eso la pantalla se refresca sin recargar.

Si las `VITE_FIREBASE_*` no están definidas, `config.mensajeria` queda en `null` y la aplicación
funciona con los avisos apagados. **O están las siete, o no está ninguna:** con algunas puestas la
app no arranca, porque un `.env` a medias casi siempre es un nombre mal escrito.

Para probarlo en local: `npm run dev`, reservar una parada, aceptar los avisos y disparar un push
desde DevTools → Application → Service Workers → Push, con
`{"data":{"tipo":"confirmar-abordaje","reservaId":"1"}}`.

Dos límites conocidos:

- Las notificaciones web exigen contexto seguro. `localhost` cuenta como seguro; un despliegue
  sobre HTTP con IP pública **no** recibe avisos. Hace falta HTTPS.
- `POST /api/v1/reservas/{id}/abordaje` todavía no existe en el backend. Para poder demostrar la
  respuesta de abordaje se puede usar `VITE_SIMULAR_ABORDAJE=true`, que la resuelve en el
  navegador. Nunca en producción.

## Capa de red

Todo acceso al backend pasa por `src/core/apiClient.ts`. Centraliza:

- la URL base (`config.apiBaseUrl`)
- timeout de 10 s con `AbortController` (la ruta tiene cobertura irregular)
- reintentos con backoff exponencial ante fallos de red y 5xx (3 intentos; los 4xx no se reintentan)
- el header `Authorization` cuando hay JWT de conductor
- la traducción de errores a lenguaje claro

Cualquier falla —HTTP o red caída— llega a la interfaz como un `ErrorApi`. Las pantallas **nunca**
muestran el `ApiError` crudo ni un código de estado: usan `error.mensajeParaUsuario()` (que delega
en `traducirError`) o el componente `<MensajeError />`.

```ts
import { apiClient } from './core/apiClient';
import type { Ruta } from './core/tipos';

const rutas = await apiClient.get<Ruta[]>('/api/v1/rutas');
```

El JWT del conductor se lee con `ProveedorDeToken`. Hoy la implementación temporal usa
`localStorage` bajo la clave `ecoruta_jwt`. Cuando exista HU-129, se sustituye con
`configurarProveedorDeToken(proveedorReal)` sin tocar el resto del cliente.

Los tipos de `src/core/tipos.ts` reflejan los records del backend. Ojo con las coordenadas: la API
expone `latitud`/`longitud` con nombre, pero PostGIS y Google Maps usan orden `(lon, lat)`.

## Convenciones

Código y comentarios en español, igual que el backend. Ver las convenciones de código del proyecto.

## Informe de cambios — HU-127

Capa única de acceso al backend, mensajes claros, reintentos, timeout y JWT automático.

| Subtarea | Qué se hizo |
|---|---|
| **SCRUM-261** | `apiClient` es el único punto HTTP (`fetch`, métodos tipados `get` / `post` / `put` / `delete`, URL desde `config.apiBaseUrl`). Las pantallas no llaman a `fetch`. |
| **SCRUM-262** | `traducirError` cubre 400, 404 y 422 (y 401/403/429/5xx/red) con fallback. `ErrorApi.mensajeParaUsuario()` delega ahí. `MensajeError` muestra icono + texto, nunca el código HTTP. |
| **SCRUM-263** | 3 intentos por defecto, backoff 250/500/1000 ms, solo red y 5xx. Timeout 10 s con `AbortController`. |
| **SCRUM-264** | `ProveedorDeToken` inyectable. Stub temporal: `localStorage` / `ecoruta_jwt`. Punto de integración documentado para HU-129. |
| **SCRUM-265** | Pruebas Vitest con `fetch` simulado: traductor, reintentos, timeout y `Authorization`. |

Mensajes que ve el usuario:

- **red / timeout** — `Sin datos nuevos: revisa tu conexion e intenta de nuevo.`
- **400** — `Los datos enviados no son validos.`
- **404** — `No encontramos lo que buscabas.`
- **422** — mensaje de negocio del backend si viene en lenguaje claro; si no, `No se pudo completar la accion.`

## Estado

Esqueleto de **HU-26**, **HU-127** (cliente HTTP) y **HU-128** (config por entorno). Lo que sigue: HU-27 (spike del mapa), HU-50 (mapa de la ruta), HU-51 (bus en tiempo real con `EventSource`), HU-52 (contador), HU-53 (registro desde la app), HU-129 (sesión real del conductor), HU-132 (inyección de entorno en CI/CD y restricción de la llave de Maps).
