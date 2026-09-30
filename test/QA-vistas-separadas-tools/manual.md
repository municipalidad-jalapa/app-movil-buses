# Manual de pruebas — Vistas separadas para el pasajero y el personal (`/tools`)

## Historia

Informe de QA, panel conductor:

> Arreglar las vistas del panel, que una persona que no sea parte de
> administración o conductor no sea posible ver las opciones de inicio de sesión
> como una persona normal (que tengan URL distintos, la vista pasajero con las
> vistas admin y conductor).

Indicación de la jefatura: no cambiar toda la URL, solo la parte final.

| URL (QA) | Para quién | Qué muestra |
|---|---|---|
| `https://qa.mibusjalapa.lat/` | Pasajeros (público) | Mapa y menú con **solo** la cuenta del pasajero (invitado / Iniciar sesión con Google) y "Pasajero". |
| `https://qa.mibusjalapa.lat/tools` | Personal de la municipalidad | Las **tres** opciones: Pasajero, Conductor y Administrador. |

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| **C1** | El menú del pasajero (invitado o con cuenta) no ofrece "Conductor" ni "Administrador". |
| **C2** | `/tools` ofrece las tres opciones y cada una lleva a su pantalla. |
| **C3** | La seguridad no depende de la vista: la API sigue exigiendo el rol en cada petición (lo prueba el backend, `AccesoPorRolIT`). |

## Qué cambió

| Archivo | Cambio |
|---|---|
| `src/componentes/MenuAcceso.tsx` | Se quitaron los enlaces "Conductor" (`/conductor/login`) y "Administrador" (`/admin`). |
| `src/paginas/Herramientas.tsx` + `.css` | Página nueva `/tools` con las tres opciones. Usa la `PantallaDeIdentidad` del panel. |
| `src/App.tsx` | Ruta `/tools`. `/conductor/login` y `/admin/login` siguen existiendo (a ellas llevan `/tools` y las guardas de sesión). |
| `src/pruebas/features/acceso_del_personal.feature` + `.test.tsx` | Aceptación en Gherkin (6 escenarios). |
| `test/SCRUM-11-HU-87/integracion/buildProduccion.test.ts` | Arreglo de una prueba preexistente que fallaba en local (ver "Nota" abajo). |

> `/tools` no es una barrera de seguridad: saca las opciones del personal de la
> vista pública. Quien abra `/tools` o `/admin/login` sin una cuenta con rol no
> puede entrar: el backend responde 401/403.

---

## 1. Requisitos

| Requisito | Detalle |
|---|---|
| Node | 24.x (probado con v24.19.0). |
| Dependencias | `npm install` en la raíz del repo. |
| `.env` | Copia de `.env.example`. Las pruebas automáticas **no** lo necesitan (usan valores de `vite.config.ts > test.env`). |
| Backend (solo prueba manual) | `docker compose up -d` en `api-buses-jalapa`. |

## 2. Pruebas automáticas

Desde la raíz de `app-movil-buses`:

```bash
# Solo las de esta historia (19 pasos, 6 escenarios)
npx vitest run src/pruebas/features/acceso_del_personal.test.tsx

# Toda la suite
npm test

# Verificación de tipos
npx tsc --noEmit
```

Resultado esperado: todo en verde. Ver `resultados.txt`.

### Comprobar que la prueba detecta el defecto

La prueba debe **fallar** con el menú viejo. Para verlo:

```bash
git stash push src/componentes/MenuAcceso.tsx
npx vitest run src/pruebas/features/acceso_del_personal.test.tsx   # falla: "no veo Conductor ni Administrador"
git stash pop
```

## 3. Pruebas manuales en el navegador

Con `npm run dev` (http://localhost:5173) y el backend levantado:

| # | Paso | Resultado esperado |
|---|---|---|
| M1 | Abrir `http://localhost:5173/`, entrar como invitado y abrir el menú (esquina superior derecha). | Se ven "Estás como invitado", "Iniciar sesión" y "Pasajero". **No** se ven "Conductor" ni "Administrador". |
| M2 | Iniciar sesión con Google y abrir el menú. | Se ven la cuenta, "Cerrar sesión" y "Pasajero". **No** se ven "Conductor" ni "Administrador". |
| M3 | Abrir `http://localhost:5173/tools`. | Pantalla "¿Cómo querés entrar?" con Pasajero, Conductor y Administrador. |
| M4 | En `/tools`, elegir **Conductor**. | Abre `/conductor/login`. |
| M5 | En `/tools`, elegir **Administrador** sin sesión. | Abre `/admin` y la guarda redirige a `/admin/login`. |
| M6 | En `/tools`, elegir **Pasajero**. | Vuelve al mapa `/`. |
| M7 | Repetir M1 y M3 en modo responsive (F12, ancho 375 px). | Sin desbordes; opciones legibles y tocables. |
| M8 | Recargar el navegador directamente en `/tools`. | Carga la página (nginx y Vite sirven `index.html` para cualquier ruta). |

## 4. Nota: prueba preexistente de HU-87

`test/SCRUM-11-HU-87/integracion/buildProduccion.test.ts > el simulador del
conductor no quedó encendido` fallaba en cualquier máquina con
`VITE_AUTH_CONDUCTOR_SIMULADO=true` en su `.env` (el valor recomendado para
desarrollo). La prueba intentaba quitar la variable con `undefined`, pero una
variable `undefined` no llega al proceso y Vite tomaba la del `.env`. Ahora se
pasa `'false'` explícito (la app solo activa el simulador con `'true'`), que es
lo que la prueba siempre quiso simular: un build de producción sin simulador.
