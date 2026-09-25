# Manual de pruebas — HU Desarrollo-86 «Exportar los datos del servicio» (frontend)

## Historia

> Como administrador municipal
> quiero descargar los datos de demanda y recorridos
> para usarlos en informes propios de la Municipalidad

| ID | Criterio de aceptación |
|----|------------------------|
| **C1** | Exportación en formato de hoja de cálculo desde el panel web. |
| **C2** | Rango de fechas seleccionable. |
| **C3** | La exportación no expone datos que identifiquen a un pasajero. |

El backend (endpoint `GET /api/v1/admin/exportaciones/servicio?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`, ya hecho y probado por su lado: 425/425) genera el `.xlsx`. **Este manual cubre el frontend**: la pantalla, la validación del rango, la descarga y el manejo de errores.

## Qué se probó y qué no

| Se prueba aquí | No se prueba aquí (es del backend o de otra HU) |
|---|---|
| Pantalla `/admin/exportar`, selector de fechas, validación del rango (1–366 días, sin invertir) | Contenido de las 3 hojas del `.xlsx` (Resumen, Demanda, Recorridos) |
| Petición: `GET` con `Authorization: Bearer`, solo `desde` y `hasta` | Que el `.xlsx` no contenga UUID ni ids de pasajero (lo prueba el backend) |
| Descarga del archivo y su nombre (`Content-Disposition`) | Login con Firebase (SCRUM-173) |
| Errores 400/401/403/422/500/red mostrados en lenguaje claro | Cálculo de distancia y velocidad |
| Hora de Guatemala (UTC-6) para «hoy» | |

---

## 1. Cómo ejecutar todo

```bash
npm install
npm test                                                     # toda la batería (384 pruebas)
npx vitest run test/HU-Desarrollo-86-exportar-datos          # solo lo nuevo de la HU (en carpeta test/)
node test/HU-Desarrollo-86-exportar-datos/e2e-navegador.mjs  # E2E en Chromium real
node test/HU-Desarrollo-86-exportar-datos/generar-resultados.mjs   # TODO junto y regenera RESULTADOS.txt
```

`generar-resultados.mjs` corre `tsc`, `build`, `vitest`, el E2E y el chequeo del entorno real, y reescribe `RESULTADOS.txt`. Sale con código 1 si algo falla.

El E2E necesita Playwright con Chromium. No es dependencia del proyecto: el script lo busca en `node_modules`, en la variable `PLAYWRIGHT_DIR` o en la caché de `npx`. Si falta: `npm i -D playwright && npx playwright install chromium`.

---

## 2. Pruebas automáticas

### 2.1 Simuladas — servidor HTTP falso (`simulados/servidorSimulado.test.ts`, 16 pruebas)

Un servidor HTTP real en un puerto local imita el endpoint del backend (Bearer, 400/401/403/422, `.xlsx`, `Content-Disposition`, sin caché). La función real `exportarDatosDelServicio` le habla con `fetch` de verdad, **sin stubs de fetch**.

| Grupo | Verifica | Criterio |
|---|---|---|
| Descarga correcta | Bytes del `.xlsx` intactos y firma ZIP (`PK`); nombre tomado del servidor; archivo de 5 MB completo; rango máximo (366 días) y un solo día | C1, C2 |
| Lo que sale del navegador | Es `GET` con Bearer y **solo** `desde` y `hasta`; sin `X-Dispositivo-Id`, sin cookies, sin cuerpo; el token no viaja en la URL | C3 (lado cliente) |
| Errores | 401, 403, 400 (formato inválido y fecha faltante), 422 (invertido y 367 días), 500, servidor caído (estado 0), cancelación con `AbortSignal`; ningún mensaje al usuario expone códigos HTTP ni jerga | C2 |

### 2.2 Unitarias (`unitarios/rangoDeFechas.test.ts`, 29 pruebas · `src/core/panelAdmin/exportacion.test.ts`, 8 pruebas)

| Qué | Casos |
|---|---|
| `diasDelRango` (extremos inclusivos) | 1 día, 2 días, cruce de mes, año bisiesto 2024, 365, 366 y 367 días |
| `validarRango` | Acepta 1 día, 15 días, exactamente 366, año bisiesto completo; rechaza fechas vacías o mal formadas, rango invertido y 367 días |
| `hoyEnGuatemala` (UTC-6, no UTC) | 03:00 UTC → día anterior; 05:59 UTC → día anterior; 06:00 UTC → día nuevo; cambio de año |
| Nombre del archivo | `filename="…"`, sin comillas, `filename*=UTF-8''…` con acentos, sin cabecera, cabecera sin `filename` |
| Petición (fetch simulado) | URL y Bearer correctos; 400/401/403/422 → `ErrorApi`; falla de red → estado 0 |

### 2.3 Componente (`componentes/ExportarDatos.test.tsx`, 23 pruebas)

| Grupo | Verifica |
|---|---|
| Acceso | Sin sesión manda al login; con sesión muestra título, correo y enlaces «Estado del servicio» / «Exportar datos» |
| Selector de fechas (C2) | «Hasta» = hoy Guatemala y «Desde» vacío; campos `type=date` con `max` = hoy; avisa «Máximo 366 días» y «hora de Guatemala»; sin «Desde» no envía; un solo día se envía; corregir el rango limpia el error |
| Descarga (C1) | Guarda con el nombre del servidor y confirma; libera la URL temporal; el botón se bloquea mientras genera y no duplica la petición; permite otro rango después; al desmontar cancela y no descarga |
| Errores | 422 muestra el motivo del backend; 400 mensaje genérico; 401 y 403 cierran sesión y van al login; sin red → «revisa tu conexión» y reintenta con el mismo rango; 500 sin jerga; error inesperado con mensaje propio |
| Privacidad (C3) | Avisa que solo hay datos agregados; describe las 3 hojas; la pantalla solo tiene 2 campos de fecha (nada de pasajero ni dispositivo) |

### 2.4 Gherkin (`src/pruebas/features/exportar_datos_del_servicio.feature`, 5 escenarios `@HU-86`)

| Escenario | Criterio |
|---|---|
| Descargo la hoja de cálculo de un rango de fechas | C1, C2 |
| Un rango invertido no se envía | C2 |
| Un rango de más de 366 días no se envía | C2 |
| El backend rechaza el rango | C2 |
| La pantalla avisa que no hay datos de pasajeros | C3 |

### 2.5 Regresión

El resto de la batería (290 pruebas, 37 archivos) corre igual en `npm test`. Se tocaron `PanelAdmin.tsx` (ahora usa `CabeceraPanel`) y `App.tsx` (ruta nueva); las pruebas de SCRUM-173 del panel siguen en verde.

---

## 3. E2E en navegador real (`e2e-navegador.mjs`, 12 pruebas)

Levanta un backend falso en `:8787` (con CORS y `Access-Control-Expose-Headers: Content-Disposition`) y `vite dev` en `:5199` apuntando a él. Inyecta una sesión de administrador en `localStorage`. Chromium real, ventana de escritorio 1366×768. Las capturas quedan en `evidencia/`.

| # | Prueba | Criterio |
|---|---|---|
| E1 | Desde la portada, el enlace «Exportar datos» de la cabecera lleva a la pantalla | — |
| E2 | Descarga real: nombre, bytes y firma `PK` intactos; una sola petición con Bearer y solo `desde`/`hasta` | C1, C2, C3 |
| E3 | Rango invertido: aviso y cero peticiones | C2 |
| E4 | 367 días: aviso y cero peticiones | C2 |
| E5 | Exactamente 366 días: sí se descarga | C2 |
| E6 | El backend responde 422: se muestra su mensaje y no se descarga nada | C2 |
| E7 | 401: vuelve al login y borra la sesión guardada | — |
| E8 | Sin sesión, `/admin/exportar` manda al login | — |
| E9 | Aviso de privacidad visible y solo 2 campos en pantalla | C3 |
| E10 | «Hasta» arranca en hoy de Guatemala y no deja elegir el futuro | C2 |
| E11 | Sin scroll horizontal en escritorio | — |
| E12 | Servicio caído: mensaje de conexión sin jerga; al volver, el reintento descarga | — |

---

## 4. Entorno real (solo lectura, sin credenciales)

`generar-resultados.mjs` consulta `https://mibusjalapa.lat` **sin token** para confirmar que el servidor responde y exige sesión (esperado 401). Hallazgos honestos:

- Da 401 igual para una ruta admin que no existe, así que **no demuestra** que el endpoint de exportación esté desplegado.
- La respuesta a una petición con `Origin: https://mibusjalapa.lat` **no trae** `Access-Control-Allow-Origin`. Si el panel se sirve desde el mismo dominio que la API (proxy de nginx), no importa; si se sirve desde otro origen, hay que definir `CORS_ORIGENES` en el despliegue (SCRUM-274, pendiente según el backend). Sin eso el navegador bloquea la descarga.

---

## 5. Revisión manual con datos reales (la hace una persona, con el backend desplegado en QA)

No se puede automatizar desde aquí: exige una cuenta de administrador de QA. Marcar cada paso en el informe.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| R1 | Iniciar sesión en el panel con una cuenta de administrador. Abrir «Exportar datos». | Pantalla visible; «Hasta» = hoy. |
| R2 | Elegir un rango con actividad (ej. últimos 7 días) y pulsar «Descargar hoja de cálculo». | Se descarga un `.xlsx` y aparece «Listo: se descargó …». |
| R3 | Abrir el archivo en Excel o LibreOffice. | 3 hojas: Resumen, Demanda, Recorridos; fechas y números como tales (no texto); filtro y encabezado fijo. |
| R4 | Revisar las 3 hojas buscando cualquier dato de persona (id de dispositivo, id de reserva, token, usuario del conductor). | No hay ninguno (C3). Solo cantidades por día, ruta, parada y bus. |
| R5 | Comparar un total de «Demanda» con lo que se ve en el sistema para ese día. | Coincide. |
| R6 | Pedir un rango del mismo día (desde = hasta). | Descarga con un solo día. |
| R7 | Pedir un rango sin actividad (fechas antiguas). | Descarga un archivo con filas vacías o solo el resumen, sin error. |
| R8 | Cerrar sesión y abrir `/admin/exportar` directo. | Redirige al login. |
| R9 | Iniciar sesión con una cuenta de conductor. | No entra al panel (acceso denegado). |
| R10 | Con el panel en otro origen que la API: repetir R2 y revisar el nombre del archivo. | Nombre del servidor (no el de respaldo); si sale el de respaldo, falta exponer `Content-Disposition` en CORS. |

---

## 6. Verificación de que las pruebas detectan errores

Se rompió el código a propósito y se comprobó que las pruebas fallan (después se restauró):

| Cambio malicioso | Pruebas que fallaron |
|---|---|
| Máximo de días 366 → 365 | 6 |
| Enviar un parámetro extra (`dispositivo`) en la URL | 1 |
| No cerrar la sesión ante 401/403 | 2 |
| «Hoy» calculado en UTC en vez de Guatemala | 3 |

---

## 7. Matriz criterio → evidencia

| Criterio | Automática | E2E navegador | Manual (QA) |
|---|---|---|---|
| **C1** hoja de cálculo | Simuladas (bytes, nombre), componente (descarga), Gherkin | E2, E5, E12 | R2, R3 |
| **C2** rango de fechas | Unitarias (`validarRango`, `diasDelRango`, `hoyEnGuatemala`), componente, Gherkin | E3–E6, E10 | R6, R7 |
| **C3** sin datos de pasajero | Simuladas (solo `desde`/`hasta`, sin ids), componente (aviso, 2 campos), Gherkin | E2, E9 | R4 |

Los resultados de cada ejecución están en `RESULTADOS.txt`.
