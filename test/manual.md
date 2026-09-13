# Manual de pruebas — "Zona sin señal" (artboard 09, DESIGN.md §7 `sin-conexion`)

## Historia

> Como pasajero en una zona sin señal
> quiero que la app me diga qué pasa en vez de quedarse cargando
> para entender si el problema es mío o del sistema.

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| **AC1** | Todo error de red muestra un mensaje entendible, nunca un `ApiError` crudo. |
| **AC2** | Existe forma de reintentar. |
| **AC3** | La app no se cierra ni se congela al perder la red. |

## Cómo está implementado hoy

| Pieza | Qué hace |
|---|---|
| `src/hooks/useEnLinea.ts` | Escucha `navigator.onLine` + eventos `online`/`offline` del navegador. |
| `src/componentes/AvisoSinConexion.tsx` | Pantalla de primera clase ("Sin internet") cuando `useEnLinea()` es `false`. Sin iconos de fallo ni disculpas — es el artboard 09. |
| `src/componentes/BannerConexion.tsx` | Con red pero el flujo en vivo cortado: "Buscando al bus" / "Sin datos nuevos. Se está reconectando." |
| `src/componentes/MensajeError.tsx` + `src/core/errores.ts` | Traduce cualquier `ErrorApi` (HTTP o red) a una frase clara. Nunca expone código HTTP, `ApiError`, `TypeError` ni `fetch`. |
| `src/core/apiClient.ts` | Timeout 10 s, 3 reintentos con backoff (250/500/1000 ms) ante red/5xx; los 4xx no se reintentan. |
| `src/hooks/usePosicionBus.ts` | Si el flujo en vivo se corta, sigue pidiendo la posición por la ruta de respaldo (HU-61) para no perder el dato. |
| `src/paginas/Mapa.tsx` | Orquesta todo: `!enLinea` → `AvisoSinConexion`; `enLinea` con error/reconectando → `BannerConexion` + `MensajeError`; cae al croquis en cualquiera de los dos casos. |

Regla clave en `Mapa.tsx`, la que hace que el aviso aparezca **solo** cuando corresponde:

```tsx
const capa = cargando ? 'cargando' : !enLinea || estadoConexion === 'reconectando' ? 'croquis' : 'mapa';
...
{!enLinea && <AvisoSinConexion .../>}
{enLinea && estadoConexion !== 'en-vivo' && <BannerConexion .../>}
{enLinea && error && <MensajeError .../>}
```

---

## 1. Pruebas automáticas (Vitest)

No necesitan backend ni navegador real. Se ejecutan con:

```bash
npm install
npm test                              # toda la bateria del proyecto
npx vitest run test/sin-conexion      # solo las pruebas nuevas de esta historia
```

### 1.1 Pruebas nuevas agregadas para esta historia

`useEnLinea` y `AvisoSinConexion` no tenían prueba propia (solo se tocaban de forma indirecta desde `Mapa.test.tsx`). Se agregaron en `test/sin-conexion/unitarios/`:

| Archivo | Prueba | Verifica |
|---|---|---|
| `useEnLinea.test.ts` | arranca en linea cuando navigator.onLine no dice lo contrario | Valor inicial correcto |
| `useEnLinea.test.ts` | arranca sin conexion si navigator.onLine ya es false al montar | Valor inicial correcto (caso negativo) |
| `useEnLinea.test.ts` | pasa a sin conexion cuando el navegador dispara "offline" | Reacciona al evento `offline` — AC1/AC3 |
| `useEnLinea.test.ts` | vuelve a en linea cuando el navegador dispara "online" | Reacciona al evento `online` — AC1/AC3 |
| `AvisoSinConexion.test.tsx` | muestra "Sin internet" como titulo | AC1 |
| `AvisoSinConexion.test.tsx` | sin ningun dato previo, lo dice sin sonar a error | AC1 (vocabulario DESIGN.md §10) |
| `AvisoSinConexion.test.tsx` | con un dato previo, muestra la hora de lo ultimo que se supo | AC1 (marca de tiempo, DESIGN.md §7) |
| `AvisoSinConexion.test.tsx` | avisa que los numeros pueden haber cambiado y que se van a actualizar solos | AC1 |
| `AvisoSinConexion.test.tsx` | el boton "Intentar de nuevo" dispara onReintentar | AC2 |
| `AvisoSinConexion.test.tsx` | es una pantalla de primera clase, no un error: nada de role="alert" | AC1 (DESIGN.md §7 [DURA]) |

### 1.2 Pruebas del proyecto que ya cubrían esta historia

| Archivo | Prueba relevante | Criterio |
|---|---|---|
| `src/paginas/Mapa.test.tsx` | "sin red muestra el estado del artboard 09, sin tono de error" | AC1 |
| `src/paginas/Mapa.test.tsx` | "con un dato de mas de 5 minutos, la hora pasa al frente" / "con un dato fresco no se avisa nada" | AC1 (dato rancio, HU-60) |
| `src/hooks/usePosicionBus.test.ts` | "si falla la carga inicial, el flujo en vivo sigue funcionando" | AC3 |
| `src/hooks/usePosicionBus.test.ts` | "mientras el flujo reconecta, sigue pidiendo la posicion por la ruta de respaldo (HU-61)" | AC1/AC3 |
| `src/hooks/usePosicionBus.test.ts` | "un 204 significa que aun no hay posicion, no un error" | AC1 |
| `src/componentes/BannerConexion.test.tsx` | "al reconectar informa, no alarma" / "mientras conecta dice que busca al bus" / "en vivo combina color, icono y texto" | AC1 |
| `src/core/errores.test.ts` (11 pruebas) | traduce 400/404/422/401/403/429/5xx/red a texto claro; nunca expone código HTTP, `TypeError`, `fetch` ni inglés técnico | AC1 |
| `src/core/apiClient.test.ts` (18 pruebas) | toda falla llega como `ErrorApi`; reintenta red y 5xx (3 intentos, backoff 250/500/1000 ms); no reintenta 4xx; corta a los 10 s con `AbortController` y trata el timeout como fallo de red | AC1, AC2, AC3 |
| `src/componentes/MapaJalapa.test.tsx` | "sin WebGL2 cae al croquis en vez de romperse"; "la capa de croquis no dice que algo fallo"; "mientras carga avisa sin tapar el mapa con un error" | AC3 |
| `src/componentes/HoraUltimoDato.test.tsx` | muestra la hora con números tabulares; un dato de otro día lleva la fecha | AC1 (marca de tiempo siempre visible) |
| `src/hooks/useUbicacion.test.ts` | mensaje claro al negar el permiso o sin soporte de geolocalización | AC1 (mismo vocabulario, otro origen de error) |

### 1.3 Resto de la batería

El resto de los 34 archivos (login del conductor, reservas, avisos de abordaje, dato rancio, etc.) no toca esta historia directamente, pero corre igual en `npm test` como prueba de regresión: nada de lo agregado puede romper lo demás. Ver `resultados.txt` para el detalle completo.

---

## 2. Pruebas manuales / simuladas (navegador real)

No hay backend real disponible en este entorno, así que se armó un backend simulado (Node puro, sin dependencias nuevas) que responde `/api/v1/rutas`, `/api/v1/telemetria/posicion`, `/api/v1/telemetria/stream` (SSE) y `/api/v1/rutas/:id/resumen` con datos válidos. Con eso se probaron **los dos estados**, no solo el de error, usando Playwright headless para tomar capturas reales del navegador.

| # | Paso | Resultado esperado | Resultado obtenido |
|---|------|--------------------|---------------------|
| M1 | Backend simulado arriba, abrir `/` | Mapa real con ruta, paradas y contador, bus ubicado. **Sin ningún aviso.** | ✅ Verificado con captura (`01-conectado.png`) |
| M2 | Apagar el backend simulado, recargar `/` | Banner "Sin datos nuevos. Se está reconectando." + tarjeta "Sin datos nuevos: revisa tu conexion e intenta de nuevo." con botón "Intentar de nuevo" + mapa en croquis. Nada de `ApiError` ni código HTTP. | ✅ Verificado con captura (`02-sin-conexion.png`) |
| M3 | DevTools → Network → Offline con la app abierta | `navigator.onLine` pasa a `false` → aparece `AvisoSinConexion` ("Sin internet") en vez del banner de reconexión | Cubierto por `Mapa.test.tsx` ("sin red muestra el estado del artboard 09") + `useEnLinea.test.ts`; pendiente de repetir a mano en un navegador si se quiere doble verificación visual |
| M4 | Con el aviso visible, pulsar "Intentar de nuevo" y luego levantar el backend | El aviso desaparece y el mapa vuelve a cargar datos reales | Cubierto por M1↔M2 (mismo mecanismo de reintento); repetir a mano para confirmar la transición en vivo |
| M5 | Slow 3G / red intermitente | La app no se congela: corta a los 10 s (timeout) y ofrece reintentar | Cubierto por `apiClient.test.ts` ("aborta la peticion al agotar el tiempo de espera") |

Las capturas M1 y M2 se enviaron aparte durante la sesión de pruebas.

---

## 3. Matriz criterio → evidencia

| Criterio | Automática | Manual/simulada |
|---|---|---|
| **AC1** — mensaje entendible, nunca crudo | `errores.test.ts`, `apiClient.test.ts`, `AvisoSinConexion.test.tsx`, `BannerConexion.test.tsx`, `Mapa.test.tsx`, `usePosicionBus.test.ts` | M1, M2 |
| **AC2** — forma de reintentar | `AvisoSinConexion.test.tsx` (botón), `MensajeError` vía `Mapa.test.tsx` | M2, M4 |
| **AC3** — no se cierra ni se congela | `apiClient.test.ts` (timeout), `MapaJalapa.test.tsx` (sin WebGL2), `usePosicionBus.test.ts` (HU-61), `useEnLinea.test.ts` | M3, M5 |

---

## 4. Cómo reproducir todo

```bash
npm install
npm test                              # 34 archivos, 259 pruebas
npx vitest run test/sin-conexion      # las 10 nuevas de esta historia
npx tsc --noEmit                      # sin errores de tipos
npm run build                         # build de produccion
```

Ver `resultados.txt` en esta misma carpeta para el resultado real de la última corrida.
