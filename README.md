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
npm install
npm run dev
```

Abre `http://localhost:5173`. El servidor de desarrollo escucha en toda la red, así que podés
abrirlo desde tu teléfono con la IP de la máquina — conviene, porque el diseño es móvil primero.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Verifica tipos y genera el build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build de producción |
| `npm test` | Pruebas con Vitest |

## Configuración por entorno

**La URL del backend se cambia sin recompilar.** Es un criterio de aceptación de HU-26, y por eso
*no* usamos `VITE_*` para esto: esas variables se incrustan en el bundle al compilar.

La fuente real es `public/config.js`, que Vite copia tal cual a `dist/`:

```js
window.__ECORUTA__ = {
  apiUrl: 'https://api.ecoruta.jalapa.gob.gt',
};
```

Para apuntar a otro backend se edita `dist/config.js` en el servidor y se recarga la página. En
producción lo habitual es que el contenedor genere ese archivo al arrancar, desde una variable de
entorno.

Orden de precedencia que aplica `src/core/config.ts`:

1. `window.__ECORUTA__.apiUrl` — configuración de runtime
2. `VITE_API_URL` — comodidad para desarrollo local (copiá `.env.example` a `.env`)
3. `http://localhost:8080` — el backend de `docker compose`

## Estructura

```
src/
  core/          config, cliente HTTP, errores y tipos de la API
  componentes/   Layout, Cargando, MensajeError
  paginas/       Mapa (placeholder), NoEncontrada
  estilos/       tema.css (tokens, claro/oscuro), global.css
public/config.js configuración de tiempo de ejecución
```

## Capa de red

Todo acceso al backend pasa por `src/core/apiClient.ts`. Centraliza la URL base, un timeout de 10 s
(la ruta tiene cobertura irregular) y la traducción de errores.

Cualquier falla —HTTP o red caída— llega a la interfaz como un `ErrorApi`. Las pantallas **nunca**
muestran el `ApiError` crudo ni un código de estado: usan `error.mensajeParaUsuario()`, o
directamente el componente `<MensajeError />`.

```ts
import { apiClient } from './core/apiClient';
import type { Ruta } from './core/tipos';

const rutas = await apiClient.get<Ruta[]>('/api/v1/rutas');
```

Los tipos de `src/core/tipos.ts` reflejan los records del backend. Ojo con las coordenadas: la API
expone `latitud`/`longitud` con nombre, pero PostGIS y Google Maps usan orden `(lon, lat)`.

## Convenciones

Código y comentarios en español, igual que el backend. Ver las convenciones de código del proyecto.

## Estado

Esqueleto de **HU-26**. Lo que sigue: HU-27 (spike del mapa), HU-50 (mapa de la ruta),
HU-51 (bus en tiempo real con `EventSource`), HU-52 (contador), HU-53 (registro desde la app).
