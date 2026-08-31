# Manual de pruebas — Contador de demanda

Cubre las cuatro subhistorias de la HU:

| # | Subhistoria | Se prueba con |
|---|---|---|
| 1 | Hook `useEstadoDemanda` sobre `GET /api/v1/demanda/estado` (registros activos, umbral, faltantes, carga y error) | Capa A |
| 2 | Componente visual `ContadorDemanda` | Capa A + Capa C |
| 3 | Actualización periódica cada 15 s + pausa con `visibilitychange` | Capa A + Capa C |
| 4 | Variantes de carga, error con reintento y umbral de 10 alcanzado | Capa A + Capa C |
| — | Contrato real del endpoint | Capa B |

Con las tres capas en verde, está al 100 %.

---

## Modo rápido (todo lo automático de un tirón)

```bash
node test/correr-todo.mjs
# opcional: URL del backend para la Capa B
node test/correr-todo.mjs http://localhost:8080
```

Corre la Capa A (tests del contador + suite completa + build) y la Capa B
(contrato), imprime un **RESUMEN** con PASÓ / FALLÓ / PENDIENTE por bloque y deja
todo escrito en **`test/RESULTADOS.txt`**, con el checklist manual (PM‑1…PM‑11)
al final para marcar a mano.

Sale con código 0 si todo lo automático pasó, 1 si algún bloque falló.

---

## Qué archivos hay en `test/` y qué es cada uno

| Archivo | Qué es | Se corre con |
|---|---|---|
| `MANUAL.md` | Este manual | se lee |
| `correr-todo.mjs` | Lanza todo lo automático y genera `RESULTADOS.txt` | `node test/correr-todo.mjs` |
| `contrato-demanda.mjs` | Comprueba el contrato de `GET /api/v1/demanda/estado` contra el backend real | `node test/contrato-demanda.mjs` |
| `stub-demanda.mjs` | Servidor falso que cicla las variantes cada 15 s, para la Capa C | `node test/stub-demanda.mjs` |
| `RESULTADOS.txt` | Salida de la última corrida de `correr-todo.mjs` | se lee |

Los **tests automáticos** (archivos `*.test.ts` / `*.test.tsx`) viven **al lado
del código**, no en esta carpeta — es la convención del repo y así los descubre
Vitest. Son:

| Archivo | Casos | Subhistoria |
|---|---|---|
| `src/hooks/useEstadoDemanda.test.ts` | 4 | 1 |
| `src/hooks/useEstadoDemandaConPolling.test.ts` | 7 | 3 |
| `src/componentes/ContadorDemanda.test.tsx` | 12 | 2 y 4 |

---

## Capa A — Tests automáticos (obligatoria)

```bash
npm test          # toda la suite del repo
```

Solo los de esta HU (23 casos):

```bash
npx vitest run \
  src/hooks/useEstadoDemanda.test.ts \
  src/hooks/useEstadoDemandaConPolling.test.ts \
  src/componentes/ContadorDemanda.test.tsx
```

Qué garantiza cada archivo:

- **`useEstadoDemanda.test.ts`** (4) — pide el estado, expone `registrosActivos`,
  `umbral`, `faltantes` y `porParada`; ante un 4xx expone un `ErrorApi`
  (mensaje traducido, sin código HTTP); `reintentar()` repite la consulta; no
  actualiza el estado si el componente se desmontó.
- **`useEstadoDemandaConPolling.test.ts`** (7) — consulta inicial; segunda
  consulta a los 15 s; con `document.hidden` **no** consulta; al volver visible
  consulta de inmediato; traduce errores; `reintentar()`; aborta la petición en
  curso al desmontar.
- **`ContadorDemanda.test.tsx`** (12) — variante *cargando* (`aria-busy`, sin
  número, esqueleto `aria-hidden`); variante *error* (texto del traductor para
  fallo de red y para 500, botón Reintentar dispara el callback, sin botón si no
  hay handler, `role="alert"` + icono); variante *umbral alcanzado* ("Ya se
  puede ir." con icono a las 10, singular/plural de faltantes, sin la palabra
  "umbral", `progressbar` con `aria-valuenow/max`).

También: `npm run build` (typecheck + bundle) sin errores.

---

## Capa B — Contrato contra el backend real

Con el backend levantado:

```bash
node test/contrato-demanda.mjs
node test/contrato-demanda.mjs http://localhost:8080   # otra URL
```

Valida `GET /api/v1/demanda/estado`: HTTP 200, JSON con `totalEsperando`,
`umbralSalida`, `faltanParaSalir` (enteros ≥ 0) y `porParada` (mapa
`paradaId → cantidad`), coherencia `faltanParaSalir = max(umbral − total, 0)`,
y que una segunda llamada seguida responde igual (base del polling).

Salidas posibles:

- **`TODO OK`** (exit 0) — el contrato funciona contra el backend real.
- **`PENDIENTE`** (exit 0) — el backend responde `404`: el endpoint **todavía no
  está implementado**. Es lo esperado según la nota de *Independencia* de la HU;
  `src/core/apiClient.ts` detecta ese 404 y devuelve `DEMANDA_SIMULADA`, así que
  la UI y el polling funcionan igual. Repetir cuando exista el endpoint.
- **`N comprobación(es) fallaron`** (exit 1) — el endpoint responde pero **no
  cumple el contrato**: bug real, hay que corregir backend o `tipos.ts`.

> Estado hoy: el backend en `:8080` (`api-buses-jalapa`) es el esqueleto de
> CI/CD y aún no expone la demanda → la prueba sale **PENDIENTE**.

---

## Capa C — Pruebas manuales en la interfaz (~10 min)

### Preparación

```bash
# Terminal 1 — servidor falso que cicla las cuatro variantes cada 15 s
node test/stub-demanda.mjs

# Terminal 2 — la app apuntando al stub
#  (si el backend real ocupa el 8080: correr el stub con  PORT=8081 node test/stub-demanda.mjs
#   y arrancar la app con  VITE_API_URL=http://localhost:8081 npm run dev)
npm run dev
```

Abrir **http://localhost:5173** en el navegador. Abrir **DevTools → pestaña
Network**, marcar **Preserve log** y filtrar por `demanda`.

El stub rota en este orden, un paso cada 15 s: `7 personas` → `9 personas` →
`11 personas` → `error 500` → (vuelve a empezar). Cada prueba de abajo dice en
qué paso mirar.

> Nota: el número tarda hasta 15 s en cambiar porque así es el sondeo. Para no
> esperar, se puede pulsar **Reintentar** (solo aparece en el paso de error) o
> recargar la página.

---

### PM‑1 · Estado de carga

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 4 (carga) · 2 |
| **Pasos** | Recargar `http://localhost:5173` con la pestaña Network abierta. Mirar la tarjeta durante el primer segundo. |
| **Resultado esperado** | Se ve la tarjeta con un **esqueleto gris animado** (3 barras) y el texto **"Actualizando el conteo…"**. No hay número, no hay barra de progreso, no hay error. En Network aparece **1** petición `GET /api/v1/demanda/estado`. Al responder, el esqueleto se reemplaza por el contador sin salto de tamaño de la tarjeta. |

### PM‑2 · Dato normal y cuántas personas faltan

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 1 · 2 |
| **Pasos** | Esperar al paso "7 personas". |
| **Resultado esperado** | Chip **"Tu parada"**, nombre de la parada, número grande **7**, texto **"personas esperando"**, barra de progreso ~70 % llena, y mensaje **"Faltan 3 personas para que el bus salga."**. Chip de estado: **"En espera"**. Los tres datos (registros activos, umbral, faltantes) salen del mismo hook. |

### PM‑3 · Texto en singular y refresco sin recargar

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 4 · 3 |
| **Pasos** | Quedarse en la página y esperar al paso "9 personas" (~15 s después de PM‑2). |
| **Resultado esperado** | El número pasa a **9** **solo, sin recargar la página** (la pestaña no parpadea, no hay flash blanco). El mensaje ahora dice **"Falta 1 persona para que el bus salga."** — en **singular**, no "Faltan 1 personas". |

### PM‑4 · Umbral alcanzado

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 4 (umbral de 10) |
| **Pasos** | Esperar al paso "11 personas". |
| **Resultado esperado** | Número **11**. La tarjeta cambia a **fondo y borde verdes**. El chip de estado pasa a **"Listo"** con un **ícono ✓**. El mensaje es un bloque con **ícono ✓ + "Ya se puede ir."** y debajo **"Hay suficientes personas para que el bus salga."**. Barra de progreso al 100 %. En **ningún** lugar aparece la palabra "umbral". El estado no se distingue solo por color: hay ícono + texto además del verde. |

### PM‑5 · Error con mensaje traducido

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 1 · 4 (error) |
| **Pasos** | Esperar al paso "error 500". |
| **Resultado esperado** | La tarjeta muestra un **aviso rojo** con **ícono triangular de advertencia** y el texto **"El servicio no esta disponible en este momento. Intenta mas tarde."** más un botón **"Reintentar"**. **Nunca** se ve `500`, `Internal Server Error`, `ApiError` ni ningún código. En Network la petición figura en rojo con estado 500. |

### PM‑6 · Botón Reintentar

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 1 (`reintentar`) |
| **Pasos** | Durante el paso de error, pulsar **"Reintentar"**. |
| **Resultado esperado** | Sale **de inmediato** una nueva petición en Network, sin esperar los 15 s. Si el stub sigue en error, se vuelve a ver el aviso; cuando el stub pase a un paso OK, la tarjeta vuelve a mostrar el número. |

### PM‑7 · Sondeo cada 15 segundos

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 3 |
| **Pasos** | Dejar la pestaña **visible y quieta** ~1 minuto mirando Network. |
| **Resultado esperado** | Sale **exactamente 1** petición `GET /api/v1/demanda/estado` cada **~15 s** (±1 s). No hay ráfagas ni peticiones dobles. La tarjeta se actualiza sola en cada ciclo. La página nunca se recarga. |

### PM‑8 · Pausa al ocultar la pestaña

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 3 (`visibilitychange`) |
| **Pasos** | Cambiar a otra pestaña (o minimizar el navegador) durante 40–60 s y volver. Mirar Network con **Preserve log**. |
| **Resultado esperado** | Mientras la pestaña está oculta **no sale ninguna** petición. Al volver sale **1 petición de inmediato** (no espera al siguiente ciclo de 15 s). Debajo del contador aparece el texto **"El sondeo está pausado (pestaña no visible)"** mientras está oculta y desaparece al volver. |

### PM‑9 · Sobrevive a la recarga

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 3 |
| **Pasos** | Recargar la página (F5) en cualquier paso del ciclo. |
| **Resultado esperado** | Vuelve a arrancar por el estado de carga (PM‑1) y retoma el ciclo con normalidad. No queda en blanco ni en un estado a medias. |

### PM‑10 · Accesibilidad y diseño

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 2 · 4 (reglas de `DESIGN.md`) |
| **Pasos** | En el paso de error, inspeccionar el botón **Reintentar** con DevTools (recuadro de tamaño). Revisar los textos chicos. Activar el **modo oscuro** del sistema operativo y recorrer los cuatro pasos otra vez. |
| **Resultado esperado** | El botón Reintentar mide **≥ 48 × 48 px**. Ningún texto por debajo de **11.5 px**. En modo oscuro la tarjeta, el verde de "alcanzado" y el rojo de error siguen **legibles** (sin texto oscuro sobre fondo oscuro). Cada estado se reconoce por **color + ícono + texto**, nunca solo por el color. |

### PM‑11 · (opcional) Contra el backend real

| Campo | Detalle |
| --- | --- |
| **Subhistoria** | 1 · contrato |
| **Pasos** | Parar el stub. `npm run dev` apuntando al backend real (`:8080`). Abrir la app. |
| **Resultado esperado hoy** | Como el backend responde 404, `apiClient` usa `DEMANDA_SIMULADA`: se ve el contador con **7 / 10 fijo** ("Faltan 3 personas"), **sin** error en pantalla. Cuando el backend implemente `GET /api/v1/demanda/estado`, se verán los datos reales y `node test/contrato-demanda.mjs` dará `TODO OK`. |

---

## Checklist de aceptación

- [ ] Capa A — `npm test` todo verde (incluye los 23 casos del contador).
- [ ] Capa A — `npm run build` sin errores de tipos.
- [ ] Capa B — `node test/contrato-demanda.mjs` da `TODO OK` (o `PENDIENTE`
      documentado mientras el backend no exponga el endpoint).
- [ ] Capa C — PM‑1 carga · PM‑2 dato normal · PM‑3 singular + refresco solo ·
      PM‑4 umbral alcanzado · PM‑5 error traducido · PM‑6 Reintentar.
- [ ] Capa C — PM‑7 una petición cada 15 s · PM‑8 pausa al ocultar la pestaña ·
      PM‑9 sobrevive a la recarga.
- [ ] Capa C — PM‑10 botón ≥ 48 px, sin texto < 11.5 px, legible en modo oscuro,
      estados con color + ícono + texto.
