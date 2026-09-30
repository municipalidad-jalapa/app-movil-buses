# Manual de pruebas — El botón "Enviar" tapado por el pie legal (QA "Eco-Ruta (2).docx")

## Historia

> Hallazgo de QA: "Al escribir un comentario, el botón 'ENVIAR' queda oculto
> por el panel negro de política de privacidad y no es posible enviarlo."

## Dónde vive esto en el código

- **El formulario:** `src/componentes/opiniones/OpinarSobreElServicio.tsx` — la
  hoja "Opinar sobre el servicio" del pasajero. Uno de los tipos de opinión es,
  literalmente, "Comentario"; el botón dice "Enviar opinión".
- **El "panel negro":** `src/componentes/PieLegal.tsx` — el pie de página con
  el enlace "Política de privacidad" (de ahí el nombre que le dio QA). Su
  fondo es `var(--superficie-base)`, que en modo claro es un crema
  (`#fbf7f0`) pero en modo oscuro (`prefers-color-scheme: dark`, definido en
  `src/estilos/tema.css`) es `#1a1712`: se ve casi negro. `PieLegal` se monta
  en **todas** las pantallas que usan `<Layout>` sin `sinPie`, incluida la
  pantalla principal del mapa (`App.tsx`, ruta `/`), que es donde vive el
  formulario de opiniones.

## Diagnóstico

Con un repro que carga el CSS real del proyecto (ver `herramientas/repro.html`)
contra un navegador de verdad (Chromium vía Playwright, no jsdom — jsdom no
pinta CSS real ni resuelve `z-index`), confirmé dos cosas:

1. **El solapamiento es real.** La hoja de opinar es un `position: fixed`
   (`.opinion-velo`) que cubre `inset: 0`, así que su rectángulo (y el del
   botón "Enviar", que va al final de la hoja) coincide exactamente con el
   rectángulo del pie legal, que sigue montado detrás.
2. **Pero antes del arreglo, ganaba por una razón frágil.** `.opinion-velo`
   tenía `z-index: 40`. Como `PieLegal` no declara ningún `z-index` propio,
   cualquier valor positivo ya le ganaba — el botón *sí* quedaba arriba y
   clicable en un navegador estándar. El problema es que esa victoria no
   estaba garantizada por nada: bastaba con que **cualquier otro elemento del
   layout** (el menú de acceso, por ejemplo, que usa `z-index: 41` en
   `MenuAcceso.css`) quedara montado con un valor mayor a 40 para que ese
   elemento tapara el botón en su lugar. La herramienta de verificación
   reproduce exactamente ese escenario y confirma que, con el `z-index`
   viejo (40), un competidor con `z-index: 41` sí gana la pelea — es decir,
   el hallazgo de QA es real bajo las condiciones correctas (probablemente un
   navegador o una combinación de capas abiertas donde algo terminó por
   encima de 40).

## El arreglo

`src/componentes/opiniones/OpinarSobreElServicio.css`, `.opinion-velo`:

```diff
- z-index: 40;
+ z-index: 60;
```

Con un comentario en el CSS explicando por qué (para que nadie lo baje sin
saber que existe este hallazgo). 60 queda por encima de **todo** lo que hoy
usa z-index en el proyecto (`MenuAcceso` 41, `.vinculado-velo` 45,
`InstalarApp` 35, `AvisoDeDemora` 25, `PanelConductor` 50 en su propia
pantalla sin pie legal). No se tocó `padding-bottom` ni `margin-bottom`: la
hoja ya reserva el área segura de iOS (`--seguro-abajo`) en su `padding`, y
agregar espacio extra ahí sería incorrecto — la hoja es un modal de pantalla
completa que **debe** cubrir el pie legal mientras está abierta; el problema
nunca fue de espacio, sino de qué capa gana la pelea del `z-index`.

---

## 1. Verificación con navegador real (no hay forma de probar esto en jsdom)

Playwright no es dependencia del proyecto — instálalo aparte:

```bash
npm install --no-save playwright
npx playwright install chromium
node test/QA-comentario-boton-enviar-tapado/herramientas/verificar-boton-enviar.mjs
```

Qué hace: levanta el propio `vite dev`, abre
`herramientas/repro.html` (mismas clases y mismos archivos CSS que usa la app
real: `Layout.css`, `PieLegal.css`, `OpinarSobreElServicio.css`) en 4
combinaciones (claro/oscuro × dos anchos de teléfono chicos) y en cada una
comprueba dos cosas:

1. **Con el arreglo (z-index: 60):** el botón "Enviar" recibe el toque en su
   centro, incluso con un competidor de `z-index: 41` presente.
2. **Sin el arreglo (z-index: 40, forzado con una hoja de estilo extra):** el
   competidor de `z-index: 41` sí le gana al botón — confirma que el hallazgo
   de QA es real y que el arreglo no es cosmético.

**Resultado esperado:** `Resultado: todo paso.` (8 comprobaciones, ver
`resultados.txt`).

## 2. Pruebas automáticas del proyecto (regresión)

```bash
npm install
npx vitest run     # 73 archivos, 784 pruebas
npx tsc --noEmit
npm run build
```

Este hallazgo es puramente de CSS (ningún componente cambió su lógica), así
que no había una prueba de Vitest que cubriera esto directamente ni falta
agregar una: la cobertura real está en la sección 1.

## 3. Pruebas manuales (dispositivo real)

| # | Paso | Resultado esperado | Resultado |
|---|------|--------------------|-----------|
| M1 | Abrir la app en un teléfono Android real, en modo oscuro, tocar "Opinar" → "Comentario", escribir texto largo hasta que aparezca el teclado | El botón "Enviar opinión" se ve y se puede tocar en todo momento | Pendiente (necesita dispositivo real; cubierto en navegador de escritorio emulando móvil, ver sección 1) |
| M2 | Repetir en iPhone (Safari) | Igual que M1 | Pendiente |

---

## 4. Cómo reproducir todo

```bash
npm install
npx vitest run
npx tsc --noEmit
npm run build
npm install --no-save playwright
npx playwright install chromium
node test/QA-comentario-boton-enviar-tapado/herramientas/verificar-boton-enviar.mjs
```

Ver `resultados.txt` en esta misma carpeta para el resultado real de la
última corrida.
