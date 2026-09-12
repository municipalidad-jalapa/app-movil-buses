# Pruebas Desarrollo-75 — HU-75

## Historia de usuario

**Desarrollo-75 — HU-75: Ver el ETA por parada como conductor**

Como conductor quiero ver el tiempo estimado a cada parada de mi recorrido
junto con las reservas activas, para ordenar mi salida y saber dónde me van a
estar esperando.

> **Origen del cambio.** La redacción anterior mostraba el tiempo estimado
> junto al conteo de pasajeros hacia un umbral de diez. Esa regla no existe:
> lo que se muestra son las **reservas activas** de la parada. Todo lo que
> sigue (código y pruebas) usa ese contrato, no el de umbral.

## Criterios de aceptación cubiertos

| # | Criterio |
|---|---|
| AC1 | El panel muestra, por cada parada, el ETA y la cantidad de reservas activas. |
| AC2 | El panel se acota a la ruta del conductor (deducida de su sesión, nunca elegida a mano). No muestra paradas ni reservas de otra ruta. |
| AC3 | Se actualiza con la misma frecuencia que la pantalla del pasajero. |
| AC4 | Es legible de un vistazo, sin navegar entre pantallas. |
| AC5 | Las paradas ya atendidas se distinguen de las pendientes. |
| AC6 | Si el ETA no es confiable, la parada lo indica en vez de mostrar un número engañoso. |
| Contrato | `GET /api/v1/rutas/{rutaId}/eta` y `GET /api/v1/rutas/{rutaId}/reservas/activas`, JWT de conductor, 403 si la ruta no es la del conductor autenticado. |

## Código de la funcionalidad

| Archivo | Qué hace |
|---|---|
| `src/core/tipos.ts` | Tipos `ParadaEta`, `RutaEta`, `ReservasActivasPorParada` (contrato de esta HU). |
| `src/core/panelConductor.ts` | Lógica pura: combina ruta + ETA + reservas en filas, decide confianza del ETA, decide frescura del dato, microcopy. Probada sin DOM. |
| `src/core/frecuenciaActualizacion.ts` | Constante `INTERVALO_ACTUALIZACION_DATOS_MS`, única fuente de la cadencia (AC3). |
| `src/hooks/usePanelConductor.ts` | Deduce la ruta de la sesión (`useRutas`, ADR-009: una sola ruta activa), sondea `eta` + `reservas/activas`, expone filas + estado. |
| `src/paginas/conductor/PanelConductor.tsx` | Pantalla. Sin mapa, sin navegación, un solo scroll vertical. |
| `src/paginas/conductor/FilaParadaConductor.tsx` | Una fila: nombre, estado (atendida/pendiente), ETA, reservas activas. Estado nunca depende solo del color. |

### Por qué la ruta nunca se elige a mano

ADR-009 (`src/hooks/useRutas.ts`) establece que el producto opera **una sola
ruta activa**. `usePanelConductor` reutiliza `useRutas()` para esa ruta: no
hay ningún selector en la pantalla del conductor ni un `rutaId` escrito a
mano. Si el backend en el futuro asigna varias rutas por conductor, el único
lugar que hay que tocar es ese hook — el resto (la lógica de `panelConductor.ts`
y la pantalla) no cambia.

### Por qué "misma frecuencia que el pasajero" no es una promesa vacía

DESIGN.md §13 fija que los datos en vivo del producto llegan cada 2–5
minutos. Como todavía no existe una pantalla de pasajero que consuma estos
mismos endpoints, se creó una única constante
(`src/core/frecuenciaActualizacion.ts`) documentada para que, el día que el
pasajero también consuma ETA/reservas, importe la misma constante en lugar de
declarar la suya. Así el criterio se cumple por construcción, no por
coincidencia.

## Tipos de prueba incluidos en esta carpeta

1. **Automáticas, con datos simulados** — `unitarios/*.test.ts(x)`, Vitest +
   Testing Library. Cubren cada criterio de aceptación con datos de fixture
   controlados (no dependen de ningún backend).
2. **Manuales, con datos reales** — checklist para ejecutar contra el backend
   real y una base de datos con una ruta activa (ver más abajo).
3. **Manuales, con datos simulados** — checklist para ejecutar sin backend,
   sobreescribiendo las respuestas HTTP desde las DevTools del navegador. Útil
   para reproducir casos raros (confianza baja, 403, dato viejo) que son
   difíciles de forzar en un backend real.
4. **Escenarios Gherkin** — `gherkin/*.feature`, uno por criterio de
   aceptación más un feature general, en español.

No se incluye una suite automática contra backend real (E2E tipo
Playwright/Cypress): el proyecto no tiene ese tooling instalado todavía. Se
deja como pendiente explícito en `resultados.txt`, no se simula un resultado.

## 1. Pruebas automáticas (datos simulados)

### Ejecución

Desde la raíz del proyecto:

```bash
npm install
npm test
```

Solo los archivos de esta historia:

```bash
npx vitest run src/core/panelConductor.test.ts src/hooks/usePanelConductor.test.ts src/paginas/conductor/PanelConductor.test.tsx test/Desarrollo-75-HU-75
```

### Qué cubre cada archivo

| Archivo | Nivel | Qué valida |
|---|---|---|
| `src/core/panelConductor.test.ts` | Lógica pura | Orden de filas, acotamiento a la ruta (AC2), las 3 presentaciones del ETA por confianza (AC6), próxima salida, dato rancio suspende el ETA (AC6), atendida vs. pendiente (AC5), reservas por parada (AC1), reservas en cero. 17 casos. |
| `src/hooks/usePanelConductor.ts` (`test`) | Hook | La ruta consultada es siempre la de la sesión (AC2), combina ETA + reservas (AC1), 403 no deja datos engañosos, vuelve a sondear a `INTERVALO_ACTUALIZACION_DATOS_MS` sin acción del conductor (AC3). 5 casos. |
| `src/paginas/conductor/PanelConductor.test.tsx` | Componente | Muestra ETA y reservas por fila (AC1), distingue atendida/pendiente en texto (AC5), "Tiempo no disponible" en vez de un número (AC6), estado de carga, error 403 en lenguaje claro con reintento, ruta sin paradas. 6 casos. |
| `test/Desarrollo-75-HU-75/unitarios/*` | Copias con nomenclatura de HU | Mismos casos que arriba, con imports relativos a `src/`, agrupados por criterio (AC1…AC6) para trazabilidad desde este README. 20 casos. |

Resultado esperado y obtenido: ver `resultados.txt`.

## 2. Pruebas manuales con datos reales

Requiere el backend corriendo (`backend/api-buses-jalapa`, ver el `README.md`
raíz) con:

- Un conductor con credenciales válidas.
- Una ruta activa con al menos 3 paradas.
- Al menos una reserva activa en alguna parada.

### Checklist

| # | Paso | Resultado esperado |
|---|---|---|
| M1 | Iniciar sesión en `/conductor/login` con el correo/contraseña del conductor. | Entra a `/conductor` sin errores. |
| M2 | Observar el panel. | Aparece una fila por cada parada de la ruta del conductor, con nombre, ETA y cantidad de reservas activas — visibles sin scroll ni clics adicionales (AC1, AC4). |
| M3 | Comparar el orden de las filas contra el orden real del recorrido. | Coincide con el campo `orden` de cada parada. |
| M4 | Revisar que no exista ningún control para cambiar de ruta. | No hay selector de ruta en la pantalla (AC2). |
| M5 | Dejar el panel abierto sin tocarlo durante el intervalo de actualización (2 min). | El ETA/reservas cambian solos si el backend tiene datos nuevos; la hora de "Último dato" avanza (AC3). |
| M6 | Si el backend marca una parada como atendida (el bus ya pasó), refrescar. | Esa parada se lee "Atendida"; el resto sigue en "Pendiente" (AC5). |
| M7 | Buscar una parada con ETA de confianza baja (o sin historial suficiente). | Muestra "Próxima salida HH:mm" o "Tiempo no disponible por ahora", nunca un número de minutos (AC6). |
| M8 | Cortar la red del dispositivo (modo avión) y esperar al siguiente sondeo. | Aparece el mensaje de error en lenguaje claro con botón "Intentar de nuevo"; ningún número cambia mientras tanto. |
| M9 | Reactivar la red y presionar "Intentar de nuevo". | El panel se recupera sin recargar la página. |
| M10 | Con las herramientas de desarrollador o un segundo conductor de otra ruta, intentar `GET /api/v1/rutas/{otraRutaId}/eta` con el JWT de este conductor. | El backend responde 403; si se hace desde la app, se ve el mensaje "No tienes permiso para hacer esto." |
| M11 | Revisar la pantalla en un dispositivo/tablet en horizontal, con luz de sol directa. | Texto legible, alto contraste, sin ilustraciones detrás de los números (DESIGN.md §6/§11). |
| M12 | Verificar con un lector de pantalla o con el zoom del sistema que el estado atendida/pendiente se anuncia como texto, no solo como color. | El texto "Atendida"/"Pendiente" está presente en el DOM, no solo un color de fondo. |

## 3. Pruebas manuales con datos simulados (sin backend)

Sirve para reproducir a demanda los casos raros de la sección anterior (M7,
M8, M10) sin depender de que el backend real tenga esos datos en ese momento.

### Preparación

```bash
cp .env.example .env
# En .env: VITE_AUTH_CONDUCTOR_SIMULADO=true
npm install
npm run dev
```

Con `VITE_AUTH_CONDUCTOR_SIMULADO=true` el login del conductor no necesita
backend real (HU-129). Para simular las respuestas de `eta` y
`reservas/activas`, usar las DevTools del navegador (Chrome/Edge: pestaña
Network → clic derecho en la petición → **Override content**, o **Local
overrides** para que persista entre recargas) y pegar uno de los cuerpos de
abajo.

### Fixtures para pegar en la respuesta

**Confianza alta (AC6):**

```json
{
  "rutaId": 1,
  "calculadoEn": "2026-09-08T10:00:00Z",
  "paradas": [
    { "paradaId": 1, "confianza": "alta", "etaMinMinutos": 6, "etaMaxMinutos": 6, "proximaSalida": null, "atendida": false }
  ]
}
```

**Confianza media (rango, AC6):**

```json
{ "paradaId": 1, "confianza": "media", "etaMinMinutos": 6, "etaMaxMinutos": 9, "proximaSalida": null, "atendida": false }
```

**Confianza baja con próxima salida (AC6):**

```json
{ "paradaId": 1, "confianza": "baja", "etaMinMinutos": null, "etaMaxMinutos": null, "proximaSalida": "10:15", "atendida": false }
```

**Confianza baja sin ningún dato (AC6):**

```json
{ "paradaId": 1, "confianza": "baja", "etaMinMinutos": null, "etaMaxMinutos": null, "proximaSalida": null, "atendida": false }
```

**Parada atendida (AC5):**

```json
{ "paradaId": 1, "confianza": "alta", "etaMinMinutos": 4, "etaMaxMinutos": 4, "proximaSalida": null, "atendida": true }
```

**Reservas activas (AC1):**

```json
{ "rutaId": 1, "porParada": { "1": 3, "2": 0, "3": 12 } }
```

**403 (contrato):** en la pestaña Network, bloquear la petición
(`Block request URL`) y responder manualmente con estado 403, o forzar la
respuesta con **Override content** dejando el código de estado en 403; el
panel debe mostrar "No tienes permiso para hacer esto." en vez de quedar en
blanco.

### Checklist

| # | Paso | Resultado esperado |
|---|---|---|
| S1 | Servir el fixture de confianza alta. | La fila muestra "Llega en 6 min". |
| S2 | Servir el fixture de confianza media. | La fila muestra "Llega en 6–9 min", nunca un solo número. |
| S3 | Servir confianza baja con `proximaSalida`. | La fila muestra "Próxima salida 10:15". |
| S4 | Servir confianza baja sin `proximaSalida`. | La fila muestra "Tiempo no disponible por ahora". |
| S5 | Servir `atendida: true`. | La fila se lee "Atendida" y no muestra minutos. |
| S6 | Servir reservas con `"1": 0`. | La parada 1 muestra "0 reservas activas", no queda vacía. |
| S7 | Forzar 403 en la respuesta de `eta`. | El panel muestra el mensaje de permiso con botón de reintento. |
| S8 | No tocar la respuesta durante más de 5 minutos y dejar pasar el reloj. | El ETA deja de mostrar minutos aunque el fixture diga confianza alta (regla de dato rancio, DESIGN.md §7). |

## Estructura de esta carpeta

```
test/Desarrollo-75-HU-75/
  README.md              este manual
  resultados.txt         qué se ejecutó y si pasó o no
  gherkin/                escenarios en Gherkin, uno por criterio
  unitarios/              copias de las pruebas automatizadas, con imports a src/
```
