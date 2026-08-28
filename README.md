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
`VITE_API_BASE_URL` suele ser `http://localhost:8080`. Completá también las variables
`VITE_FIREBASE_*` con el proyecto web de Firebase (HU-129). Para probar el login del conductor
sin backend, descomentá `VITE_AUTH_CONDUCTOR_SIMULADO=true`.
Después:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El servidor de desarrollo escucha en toda la red, así que podés
abrirlo desde tu teléfono con la IP de la máquina — conviene, porque el diseño es móvil primero.

Si falta una variable o el formato es inválido, la app **no arranca**: vas a ver un error que nombra
la variable (`VITE_API_BASE_URL` o `VITE_FIREBASE_*`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Verifica tipos y genera el build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build de producción |
| `npm test` | Pruebas con Vitest |

## Configuración por entorno

La dirección del backend y la config de Firebase **no van en el código**. Se leen de variables `VITE_*`
a través del módulo único `src/core/config.ts` (HU-128). Ese módulo valida al arrancar con Zod y
falla de inmediato si falta un valor o el formato es inválido.

| Variable | Para qué |
|---|---|
| `VITE_API_BASE_URL` | URL absoluta del backend (`http://` o `https://`). Sin barra final. En local suele ser `http://localhost:8080`. |
| `VITE_FIREBASE_API_KEY` | Clave pública del proyecto web de Firebase Authentication. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de Auth (`tu-proyecto.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto Firebase. |
| `VITE_FIREBASE_APP_ID` | App ID web de Firebase. |
| `VITE_AUTH_CONDUCTOR_SIMULADO` | Opcional. `true` solo en desarrollo local: simula `POST /api/v1/auth/conductor`. En producción no definir o dejar en `false`. |

Cómo configurar en local (solo esto hace falta):

1. Copiá `.env.example` a `.env`.
2. Reemplazá los placeholders por tus valores reales.
3. `npm run dev`.

`.env`, `.env.local` y el resto de variantes con valores reales están en `.gitignore`. Solo se
versiona `.env.example`.

Las variables `VITE_` quedan en el bundle que descarga el navegador. No pongas contraseñas, llaves
privadas ni tokens de servidor. `VITE_API_BASE_URL` y las `VITE_FIREBASE_*` son públicas por
diseño (la API key de Firebase de cliente no es un secreto de servidor). Inyectar entorno en
CI/CD es **HU-132**.

Nadie más que `src/core/config.ts` debe leer variables `VITE_*` de `import.meta.env`. El simulador
de auth usa `import.meta.env.DEV` (bandera de Vite, no una variable de la app).

## Estructura

```
src/
  core/          config, cliente HTTP, Firebase, sesión del conductor, errores y tipos
  componentes/   Layout, Cargando, MensajeError, RutaProtegida
  paginas/       Mapa, registro, NoEncontrada, login y panel del conductor
  estilos/       tema.css (tokens), global.css
.env.example     placeholders de VITE_API_BASE_URL y VITE_FIREBASE_*
```

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

El JWT del conductor lo inyecta HU-129: `sesionConductor` registra el `ProveedorDeToken` y guarda
`{ token, expiraEn, rol }` en `localStorage` bajo `ecoruta_jwt`. El resto del cliente HTTP no
cambia. Un 401 con sesión activa se trata como caducada; un 401 durante el login es credenciales
inválidas.

### Simulador de auth del conductor (solo desarrollo)

Mientras no exista `POST /api/v1/auth/conductor` en el backend, en local se puede simular:

1. En `.env`: `VITE_AUTH_CONDUCTOR_SIMULADO=true`
2. `npm run dev` (nunca corre en `vite build` / producción: exige `import.meta.env.DEV`)

El simulador intercepta ese POST y responde 200 con un JWT falso. Si el correo (o el `idToken`)
contiene `@fallo.test`, responde 401 para probar el camino de error a mano.

Cuando el endpoint real exista, apagalo cambiando la variable (o no definiéndola). El resto del
código de HU-129 no se toca.

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

## Informe de cambios — HU-129

Login del conductor con Firebase, JWT propio y rutas protegidas.

| Qué | Dónde |
|---|---|
| Firebase Auth + config | `src/core/firebase.ts`, variables `VITE_FIREBASE_*` en `config.ts` |
| Intercambio JWT | `POST /api/v1/auth/conductor` vía `apiClient` |
| Sesión persistida | `sesionConductor` + `AuthProvider` / `useAuth` |
| Rutas | `/conductor/login`, `/conductor` detrás de `RutaProtegida` |
| Simulador DEV | `VITE_AUTH_CONDUCTOR_SIMULADO=true` |

## Estado

En `develop`: **HU-26**, **HU-50**, **HU-51**, **HU-53**, **HU-127**, **HU-128** y **HU-129** (login del conductor). Lo que sigue: HU-52 (contador), HU-126 (pantallas reales del conductor; hoy el panel es un placeholder), HU-132 (inyección de entorno en CI/CD).
