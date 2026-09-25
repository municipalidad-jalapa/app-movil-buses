# Manual de pruebas — SCRUM-11 / HU-87 "Build de producción de la aplicación web"

## Historia

> Como equipo del proyecto
> quiero un build de producción de la aplicación web empaquetado como imagen Docker
> para poder desplegarla fuera del entorno de desarrollo.

## Criterios de aceptación (parte de Desarrollo / Frontend)

| ID | Criterio |
|----|----------|
| **A1** | Build optimizado de React generado con `npm run build`. |
| **A2** | Empaquetado como imagen Docker. |
| **A3** | Ícono del sitio definitivo. |
| **A4** | Título del sitio definitivo. |
| **A5** | Pantalla de carga definitiva. |
| **A6** | Variables de entorno apuntando al backend de producción, no a direcciones locales. |

## Cómo está implementado

| Pieza | Qué hace |
|---|---|
| `dockerfile` | Dos etapas: `node:20-alpine` compila con `npm ci` + `npm run build`; `nginx:alpine` sirve `dist/`. Las variables `VITE_*` entran como `--build-arg`. |
| `nginx.conf` | SPA (`try_files … /index.html`), `/health`, `.mjs` como JavaScript, `.webmanifest` como `application/manifest+json`, service worker sin caché. |
| `index.html` | Título, descripción, `theme-color`, `<link>` al ícono, al ícono de iOS y al manifest. **Contiene la pantalla de carga dentro de `#raiz`**: se pinta antes de que baje el JavaScript y React la reemplaza al montar. Un script de 20 s cambia el texto si la app no llega a montar. |
| `public/favicon.svg`, `icon-*.png`, `apple-touch-icon.png`, `manifest.webmanifest` | Ícono y manifest. Símbolo de `design/EcoRuta.dc.html` ("01 Marca y escudo municipal"). |
| `src/core/config.ts` | Único punto que lee `import.meta.env`. Si falta `VITE_API_BASE_URL` o no es una URL, la app no arranca. |
| `.github/workflows/desplegar.yml` | `develop` → imagen de QA + despliegue; `main` → imagen de producción (solo construye y publica). |

Las variables `VITE_*` se **hornean en el bundle al compilar**. Cambiar una exige
reconstruir la imagen; no se pueden cambiar con el contenedor ya corriendo.

---

## 1. Preparación

| Necesitas | Para | Cómo comprobarlo |
|---|---|---|
| Node 20 o superior y npm | Todo | `node --version` |
| Dependencias instaladas | Pruebas automáticas | `npm ci` |
| Docker Desktop **encendido** | Secciones 4 y 5 | `docker info` (si dice "cannot connect", ábrelo y espera) |
| Edge o Chrome | Secciones 4 y 6 | — |
| Un teléfono Android y un iPhone (opcional) | Sección 6, M9–M11 | — |

Todos los comandos se ejecutan desde la raíz del proyecto. Los de la sección 4 y 5
están escritos para PowerShell; en Git Bash o Linux cambia el acento grave (`` ` ``)
de fin de línea por `\`.

---

## 2. Mapa de pruebas

Qué tipo de dato y qué forma de ejecución tiene cada bloque:

| Bloque | Datos | Forma | Sección |
|---|---|---|---|
| Pruebas de archivos y de configuración (Vitest) | Valores de prueba escritos en el propio test | **Automática** | 3 |
| Build real de producción (Vitest) | Variables de producción de mentira | **Automática** | 3 |
| Imagen Docker + backend simulado + navegador | **Simulados** | Semiautomática (scripts) | 4 |
| Imagen construida con las variables reales de QA / producción | **Reales** | Semiautomática + manual | 5 |
| Ícono, pantalla de carga e instalación en dispositivos | Reales | **Manual** | 6 |

---

## 3. Pruebas automáticas (Vitest)

No necesitan backend, Docker ni navegador.

```bash
npm run test:hu87                       # las 136 pruebas de esta HU (~20 s)
npx vitest run test/SCRUM-11-HU-87/unitarios     # solo las rápidas (~2 s)
npx vitest run test/SCRUM-11-HU-87/integracion   # solo el build real (~20 s)
npm test                                # toda la batería del proyecto
```

### 3.1 Qué prueba cada archivo

| Archivo | Pruebas | Criterio | Verifica |
|---|---|---|---|
| `unitarios/iconoYTitulo.test.ts` | 22 | A3, A4 | Idioma, título, descripción y `theme-color` (igual al token de `tema.css`). `<link>` al favicon, al ícono de iOS y al manifest, y que los archivos existan. Favicon SVG válido, sin scripts ni imágenes, solo con colores del sistema de diseño. PNG reales de 192, 512, 512 (maskable) y 180 px, leídos de su cabecera. Manifest con nombre, colores, íconos que existen y tamaños que coinciden; cumple lo que pide Android (192, 512, maskable). |
| `unitarios/pantallaDeCarga.test.ts` | 21 | A5 | Está dentro de `#raiz`; muestra nombre, lema y "Cargando…"; `role="status"` y `aria-live="polite"`; símbolos decorativos ocultos a lectores de pantalla; contraste AAA/AA calculado; ningún texto bajo 11.5 px; `prefers-reduced-motion`; animación solo con `opacity`; colores tomados de `tema.css`; sin negro ni blanco puro; sin recursos externos; peso < 10 kB; microcopy sin "Error", "por favor" ni "!"; aviso sin JavaScript; el script de 20 s cambia el texto, y no falla si React ya montó. |
| `unitarios/variablesDeEntorno.test.ts` | 41 | A6 | Configuración de producción válida y congelada; simulador del conductor apagado por defecto; avisos: apagados sin variables, encendidos con las dos, error con una sola. URL ausente, vacía, sin protocolo o `undefined` → no arranca. Falta cada variable de Firebase → no arranca. El Dockerfile declara `ARG`+`ENV` de cada variable obligatoria (leída del esquema real de `config.ts`), sin valores por defecto, sin direcciones locales y sin el simulador. `.env` fuera de git y de Docker; `.env.example` solo con placeholders; ninguna llave `AIza…` en el repo; ningún `localhost` en `src/`; solo `config.ts` lee `import.meta.env`; el pipeline usa una sola fuente de variables. |
| `unitarios/imagenDocker.test.ts` | 28 | A1, A2 | Dockerfile de dos etapas, Node 20 (igual que el CI), `npm ci`, orden de capas para la caché, `EXPOSE 80`, `CMD` de Nginx. `.dockerignore` y `package-lock.json`. Scripts `build` y `preview`. Worker de MapLibre copiado en el build. Nginx: SPA, `/health`, `.mjs`, `.webmanifest`, service worker. Pipeline: `develop`→QA, `main`→producción, CI compila y prueba. |
| `integracion/buildProduccion.test.ts` | 24 | A1, A3, A5, A6 | Corre `tsc --noEmit` y `vite build` reales con variables de producción de mentira. `dist/` trae `index.html`, ícono, manifest, service worker; conserva la pantalla de carga; assets con hash; sin mapas de código; JS minificado; JS < 500 kB comprimido; sin Google Fonts; worker de MapLibre presente; **la URL de producción quedó horneada y no hay `localhost:8080`**; el simulador no quedó encendido; no se coló ningún `.env`. |

### 3.2 Comprobar que las pruebas de verdad detectan fallos

Si quieres ver una prueba fallar a propósito (y luego revertir):

```bash
# 1. Dale un valor por defecto a un ARG del dockerfile:
#      ARG VITE_API_BASE_URL=http://localhost:8080
# 2. Corre:
npx vitest run test/SCRUM-11-HU-87/unitarios/variablesDeEntorno.test.ts
#    Deben fallar 3 pruebas del bloque "El Dockerfile pasa las variables al build".
# 3. Revierte:
git checkout dockerfile
```

---

## 4. Pruebas con datos SIMULADOS (imagen Docker + navegador)

Objetivo: comprobar que **la imagen construida** arranca, sirve todo bien y que la
app monta y habla con el backend que se le configuró. El backend es falso
(`herramientas/backend-simulado.mjs`): responde ruta, paradas, posición del bus
(SSE) y reservas con datos válidos. **No lo uses en QA ni en producción.**

### 4.1 Imagen con variables de "producción" de mentira

```powershell
docker build -f dockerfile -t ecoruta-frontend:hu87 `
  --build-arg VITE_API_BASE_URL=https://api.produccion.ejemplo.test `
  --build-arg VITE_FIREBASE_API_KEY=clave-publica-de-prueba `
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=ecoruta-prod.firebaseapp.com `
  --build-arg VITE_FIREBASE_PROJECT_ID=ecoruta-prod `
  --build-arg VITE_FIREBASE_APP_ID=1:123:web:abc .

docker run --rm -d --name ecoruta-hu87 -p 8087:80 ecoruta-frontend:hu87

node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs http://localhost:8087 `
  --api https://api.produccion.ejemplo.test
```

**Esperado:** `Resultado: 17 pasaron, 0 fallaron.` (health, título, íconos, manifest,
SPA, service worker, bundle, worker de MapLibre y URL de backend correcta).

Esta imagen no puede mostrar el mapa (el backend de mentira no existe), y así debe
ser: sirve para comprobar el empaquetado y las variables, no la app.

### 4.2 Imagen contra el backend simulado (app montada)

Solo para esta prueba local, la URL del backend **sí** es local: es el simulador.

```powershell
# Terminal 1: el backend simulado
node test/SCRUM-11-HU-87/herramientas/backend-simulado.mjs --puerto 8090

# Terminal 2: imagen que apunta al simulador
docker build -f dockerfile -t ecoruta-frontend:hu87-simulado `
  --build-arg VITE_API_BASE_URL=http://localhost:8090 `
  --build-arg VITE_FIREBASE_API_KEY=clave-de-prueba `
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=ecoruta-prueba.firebaseapp.com `
  --build-arg VITE_FIREBASE_PROJECT_ID=ecoruta-prueba `
  --build-arg VITE_FIREBASE_APP_ID=1:1:web:prueba .
docker run --rm -d --name ecoruta-hu87-sim -p 8088:80 ecoruta-frontend:hu87-simulado

node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs http://localhost:8088 `
  --api http://localhost:8090 --permitir-local
```

Abre <http://localhost:8088> en el navegador. **Esperado:** el mapa con la ruta de 6
paradas, el bus moviéndose cada 3 s y la hoja "¿En qué parada vas a esperar?". En la
consola del simulador aparecen los `GET /api/v1/rutas`, `/resumen` y `/stream`.

### 4.3 Comprobaciones automáticas en navegador real

Opcional; necesita Playwright, que **no** es dependencia del proyecto:

```powershell
npm install --no-save playwright-core
node test/SCRUM-11-HU-87/herramientas/verificar-navegador.mjs `
  --imagen http://localhost:8087 `
  --imagen-simulada http://localhost:8088 --backend-simulado http://localhost:8090 `
  --salida test/SCRUM-11-HU-87/evidencias --canal msedge
```

**Esperado (12 comprobaciones, todas `[PASO ]`):**

- la pantalla de carga estaba visible antes de montar y React la reemplazó;
- título, ícono y `theme-color` correctos;
- la app pidió `/api/v1/rutas` al backend configurado y **nada** a `localhost:8080`;
- sin errores de JavaScript;
- con el JavaScript bloqueado, "Cargando…" y a los 20 s el mensaje de demora;
- sin JavaScript, el aviso "EcoRuta necesita JavaScript…" y sin "Cargando…".

Guarda 4 capturas en `evidencias/`.

### 4.4 Limpiar

```powershell
docker stop ecoruta-hu87 ecoruta-hu87-sim      # con --rm se borran solos
docker rmi ecoruta-frontend:hu87 ecoruta-frontend:hu87-simulado
# y Ctrl+C en la terminal del backend simulado
```

---

## 5. Pruebas con datos REALES

Necesitas los valores reales del entorno. **No están en el repositorio** (a propósito):

| Variable | De dónde sale |
|---|---|
| `VITE_API_BASE_URL` | La URL del backend de QA o de producción (pídela a DevOps o mírala en las variables del entorno de GitHub → Settings → Environments). QA usa `https://qa.mibusjalapa.lat` según el último commit de `develop`. |
| `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | Consola de Firebase → Configuración del proyecto → Tus apps → app web. Son públicas, pero no las subas al repo. |

### 5.1 Imagen local con variables reales

```powershell
$api = "https://<backend-real>"          # sin barra final
docker build -f dockerfile -t ecoruta-frontend:real `
  --build-arg VITE_API_BASE_URL=$api `
  --build-arg VITE_FIREBASE_API_KEY=<valor-real> `
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=<valor-real> `
  --build-arg VITE_FIREBASE_PROJECT_ID=<valor-real> `
  --build-arg VITE_FIREBASE_APP_ID=<valor-real> .
docker run --rm -d --name ecoruta-real -p 8089:80 ecoruta-frontend:real
node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs http://localhost:8089 --api $api
```

**Esperado:** 17 `[PASO ]`. Después abre <http://localhost:8089>: debe verse la ruta y
las paradas reales.

> Si el mapa no carga y la consola del navegador dice *CORS*, el backend no permite
> el origen `http://localhost:8089`. Es un tema del backend, no de esta HU.

### 5.2 Un despliegue ya publicado (QA o producción)

`verificar-imagen.mjs` solo hace `GET`, así que es seguro contra QA o producción:

```powershell
node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs https://<url-del-frontend> `
  --api https://<backend-real>
```

**Esperado:** 17 `[PASO ]`. Si falla el bloque del ícono/manifest/pantalla de carga,
significa que ese despliegue todavía tiene una imagen anterior a esta HU: hay que
volver a desplegar (merge a `develop` para QA, a `main` para producción).

### 5.3 Datos reales desde la terminal

```bash
curl -s https://<backend-real>/api/v1/rutas | head -c 300     # debe devolver JSON con la ruta y las paradas
```

### 5.4 Qué NO se puede probar sin credenciales reales

- Login de conductor y del panel municipal (necesitan Firebase real y cuentas).
- Avisos push: la imagen actual no recibe `VITE_FIREBASE_MESSAGING_SENDER_ID` ni
  `VITE_FIREBASE_VAPID_KEY` (ver "Hallazgos", punto 6).

---

## 6. Pruebas manuales (a ojo, en navegador y en teléfono)

Marca cada fila en la tabla de la sección 7.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| **M1** | Abre el sitio en Chrome de escritorio. | La pestaña dice **EcoRuta — Bus eléctrico de Jalapa** y muestra el símbolo (voluta verde sobre círculo claro, con punto rojo y amarillo). No aparece el ícono genérico. |
| **M2** | Repite en Edge, Firefox y Safari (si hay). | Mismo título e ícono. (Safari de escritorio puede ignorar el SVG: usa el de iOS, M10). |
| **M3** | DevTools → Network → *Slow 3G* + *Disable cache* → recarga. | Se ve **enseguida** la pantalla verde con el símbolo, "EcoRuta", "Bus eléctrico · Jalapa" y "Cargando…" parpadeando suave. Luego aparece el mapa. No hay pantalla en blanco. |
| **M4** | Mismo caso, pero bloquea `/assets/*.js` (Network → *Block request URL*) y espera 20 s. | El texto cambia a "Está tardando más de lo normal: revisa tu conexión y vuelve a abrir la página." |
| **M5** | Desactiva JavaScript (DevTools → Ctrl+Shift+P → *Disable JavaScript*) y recarga. | Se ve el aviso "EcoRuta necesita JavaScript…" y **no** el "Cargando…". |
| **M6** | Activa "reducir movimiento" en el sistema operativo y repite M3. | "Cargando…" ya no parpadea. |
| **M7** | Abre `/ruta/que/no/existe` y también recarga estando en cualquier pantalla de la app. | No sale un 404 de Nginx: carga la app. |
| **M8** | Abre `/health`. | Texto `healthy`. |
| **M9** | **Android + Chrome:** abre el sitio (por HTTPS) → menú ⋮ → *Instalar app* / *Añadir a pantalla de inicio*. | Ofrece instalar; el ícono en la pantalla de inicio es el símbolo de EcoRuta, **sin recortes raros** (es la versión *maskable*), y se llama "EcoRuta". Al abrirlo va sin barra del navegador y con la barra de estado verde. |
| **M10** | **iPhone + Safari:** Compartir → *Agregar a inicio*. | Ícono con el símbolo sobre fondo verde (apple-touch-icon) y nombre correcto. |
| **M11** | En el teléfono, con datos móviles y la app cerrada, ábrela desde el ícono. | La pantalla verde aparece de inmediato; nunca un fondo blanco. |
| **M12** | Al aire libre o con el brillo al máximo, mira la pantalla de carga. | "EcoRuta" y "Cargando…" se leen sin esfuerzo. |
| **M13** | Lighthouse (DevTools → Lighthouse → Móvil) sobre la imagen. | Sin errores de "manifest" ni "ícono maskable"; *Performance* anotada (ver Hallazgos, punto 4). |
| **M14** | `docker logs ecoruta-hu87` tras abrir el sitio. | Se ven los `GET` con 200; ningún `[error]` de Nginx. |
| **M15** | Con el contenedor corriendo, ejecuta el comando de abajo. | Imprime `sin-localhost-8080`: el bundle no apunta al backend local. |

```powershell
docker exec ecoruta-hu87 sh -c "grep -rl 'localhost:8080' /usr/share/nginx/html/assets || echo sin-localhost-8080"
```

### 6.1 Cómo se mide "se lee en menos de tres segundos" (DESIGN.md §1)

Para M12 pide a alguien que **no conozca la app**, en la calle, que te diga qué
pantalla es y qué está pasando, mirándola un instante. Si no lo dice, el contraste o
el tamaño no bastan.

---

## 7. Registro de resultados manuales

Llena esta tabla cada vez que hagas la prueba. Las marcadas ✅ ya se ejecutaron (ver
`resultados.txt`, secciones C y D).

| # | Qué | Fecha | Quién | Resultado | Notas |
|---|-----|-------|-------|-----------|-------|
| S1 | Imagen con variables de mentira: `verificar-imagen.mjs` | 2026-09-23 | Claude | ✅ 17/17 | Encontró y se corrigió el `.webmanifest` |
| S2 | Imagen contra backend simulado: `verificar-imagen.mjs` | 2026-09-23 | Claude | ✅ 17/17 | |
| S3 | App montada con backend simulado en Edge (Playwright) | 2026-09-23 | Claude | ✅ 12/12 | Capturas en `evidencias/` |
| R1 | Imagen con variables reales de QA | | | Pendiente | Necesita valores reales |
| R2 | `verificar-imagen.mjs` contra el frontend de QA | | | Pendiente | Falla hasta redesplegar QA |
| R3 | `verificar-imagen.mjs` contra el frontend de producción | | | Pendiente | |
| M1–M8 | Navegadores de escritorio | | | Pendiente | |
| M9 | Android + Chrome: instalar | | | Pendiente | Necesita HTTPS |
| M10 | iPhone + Safari: agregar a inicio | | | Pendiente | |
| M11–M12 | Teléfono real, datos móviles y sol | | | Pendiente | |
| M13 | Lighthouse | | | Pendiente | |

---

## 8. Cómo actualizar `resultados.txt`

```bash
npm run test:hu87:resultados
# con una imagen levantada, agrega su verificación:
node test/SCRUM-11-HU-87/herramientas/generar-resultados.mjs --imagen http://localhost:8087 --api https://api.produccion.ejemplo.test
```

Corre toda la batería, escribe una línea `[PASO]` / `[FALLO]` por prueba y separa
los fallos que **no** son de esta HU. Sale con código 1 si falla alguna prueba de la
HU-87.

---

## 9. Hallazgos y pendientes

1. **Corregido — Nginx servía el manifest mal.** `manifest.webmanifest` salía como
   `application/octet-stream`. Se agregó su tipo en `nginx.conf` y su prueba.
2. **Corregido — `MenuAcceso` leía `import.meta.env` directo**, saltándose la
   validación de `config.ts` (y podía armar `//swagger-ui` si la URL terminaba en
   `/`). Ahora usa `config.apiBaseUrl`.
3. **Corregido — `.env.example` describía un `public/config.js` y una variable
   `VITE_API_URL` que la app no lee.** Se reescribió esa sección.
4. **Pendiente (no es de esta HU) — un solo bundle de 1.4 MB (398 kB comprimido).**
   Vite ya avisa. "Optimizado" hoy es minificado, con hash y comprimible; partir el
   bundle (por ejemplo, cargar Firebase y MapLibre bajo demanda) bajaría el primer
   arranque. La prueba fija un tope de 500 kB comprimidos para que no crezca más.
5. **Pendiente — el pipeline de producción solo construye y publica la imagen; no la
   despliega** (lo dice el propio `desplegar.yml`).
6. **A revisar — el Dockerfile no recibe `VITE_FIREBASE_MESSAGING_SENDER_ID` ni
   `VITE_FIREBASE_VAPID_KEY`**, así que las imágenes salen con los avisos push
   apagados. No verifiqué si el pipeline compartido las inyecta de otra forma.
7. **Aviso de Docker (informativo):** `SecretsUsedInArgOrEnv` sobre las variables
   de Firebase y `VITE_GOOGLE_MAPS_API_KEY`. Son valores públicos que de todos modos
   viajan en el bundle. `VITE_GOOGLE_MAPS_API_KEY` ya no la lee ningún archivo de
   `src/`; se puede quitar del Dockerfile.
8. **Pendiente de diseño — escudo municipal.** DESIGN.md §14 pide reservar un hueco
   para el escudo en las superficies de identidad. La pantalla de carga no lo
   reserva todavía porque el manual de marca no está disponible.
9. **La URL real del backend de producción no está en el repositorio.** Hay que
   confirmarla con DevOps para la prueba R1/R3.
10. **Fallo ajeno a esta HU:** `test/sin-conexion/unitarios/AvisoSinConexion.test.tsx`
    ("con un dato previo, muestra la hora…") no encuentra el texto "de las 7:09 p. m."
    en esta máquina (Node 22.14, ICU 76). Parece depender de cómo Node/ICU escribe el
    espacio entre "p." y "m." en el formato `es-GT`; no lo investigué a fondo. Falla
    igual en una copia del repo sin estos cambios. No se tocó.
11. **Aviso del entorno:** existe `.kilo/worktrees/…` (un worktree de Kilo Code dentro
    del proyecto). Hace que `npx vitest run` a secas duplique pruebas y cuente ese
    fallo dos veces. `generar-resultados.mjs` lo excluye.
