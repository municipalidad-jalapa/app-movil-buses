# Manual de pruebas — Panel del conductor (HU / Desarrollo-62)

Este manual cubre dos cosas:

1. **Pruebas automáticas** ya escritas para esta historia — dónde están y cómo correrlas.
2. **Pruebas manuales** — pasos para probar el panel a mano, en el navegador, mapeados a
   los criterios de aceptación de la historia.

> Nota sobre esta carpeta: los archivos `.test.ts` / `.test.tsx` reales **no están acá**,
> siguen junto a cada componente/hook/módulo (`src/componentes/Foo.test.tsx` al lado de
> `Foo.tsx`), que es la convención de todo el proyecto. Copiarlos a esta carpeta los
> rompería (sus `import './Foo'` son relativos a esa ubicación) y quedarían como copias
> muertas que Vitest no correría bien. Acá abajo tenés el índice de cuáles son y qué
> prueba cada uno. Como evidencia de que corrieron de verdad, sí dejé en esta carpeta
> [`resultado-npm-test.txt`](./resultado-npm-test.txt): la salida real y completa de
> `npx vitest run`, con rama, commit y fecha en el encabezado. Es un snapshot de
> solo lectura — no se actualiza solo, hay que regenerarlo si cambian las pruebas.

---

## 1. Pruebas automáticas

### Cómo correrlas

```bash
npm install        # si no lo hiciste ya
npm test           # corre toda la suite una vez
npm run test:watch # modo watch, útil mientras se desarrolla
npm run build      # tsc --noEmit + vite build, chequea tipos y que compile
```

Con estos cambios, la suite completa queda en **21 archivos / 114 pruebas** (95
preexistentes + 19 nuevas de esta historia), todas en verde.

### Archivos nuevos de esta historia (19 pruebas)

| Archivo | Qué prueba |
|---|---|
| `src/core/reservas.test.ts` (3) | `rutaReservasParada` arma bien la URL del contrato; `obtenerReservasParada` devuelve `{paradaId, activas, reservas}` en éxito y propaga un `ErrorApi` (401) cuando el backend rechaza. |
| `src/core/sesionConductor.test.ts` (3) | `haySesionConductor()` es `false` sin token, `true` con un JWT en `localStorage`, y respeta el proveedor de token activo (no solo `localStorage` directo). |
| `src/hooks/usePanelConductor.test.ts` (5) | Sin JWT la sesión es inválida; las paradas salen ordenadas por `orden` del recorrido y no como llegan del catálogo (criterio 1); se refresca sola cada 15 s sin recargar (criterio 3); si una parada falla en un ciclo conserva el último valor conocido en vez de mostrar 0; si **todas** las paradas rechazan por 401/403 invalida la sesión (criterio 6). |
| `src/componentes/TiraParadasConductor.test.tsx` (4) | Lista las paradas en el orden recibido; muestra el número grande cuando hay gente esperando (criterio 2); distingue una parada vacía con texto en vez de "0" (criterio 4); no confunde "sin datos" (falla de red) con "nadie esperando" (dato real en cero). |
| `src/paginas/PanelConductor.test.tsx` (4) | Sin sesión muestra el aviso y el enlace a `/conductor/iniciar-sesion` (criterio 6); mientras carga muestra un estado accesible (`role="status"`) en vez de una lista vacía; con datos pinta la tira con la demanda de cada parada; si una actualización falla pero ya hay datos, avisa sin tapar la lista. |

### Archivos existentes que **no** se tocaron

Todo lo demás en `src/core`, `src/hooks`, `src/componentes` y `src/paginas` (mapa,
registro de demanda, posición del bus, etc.) — sus pruebas siguen igual, no fueron parte
de esta historia.

---

## 2. Pruebas manuales (en el navegador)

### Preparación

1. Necesitás un archivo `.env` en la raíz del proyecto con:
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```
   (o la URL de tu backend). Sin esto la app no arranca.
2. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir `http://localhost:5173` en el navegador y tener las **DevTools** abiertas
   (pestaña *Console*) para poder ejecutar `localStorage.setItem(...)`.

El panel vive en `/conductor`. La app todavía no tiene login de conductor real (eso es
HU-129, aparte), así que la "sesión" se simula guardando un JWT cualquiera en
`localStorage` bajo la clave `ecoruta_jwt`.

---

### Escenario A — Sin sesión de conductor (criterio 6)

1. Asegurate de no tener nada guardado: en la consola, `localStorage.removeItem('ecoruta_jwt')`.
2. Navegá a `http://localhost:5173/conductor`.

**Esperado:**
- Fondo oscuro, mensaje "No tenés una sesión de conductor activa." con buen contraste.
- Botón/enlace dorado "Iniciar sesión".
- Al hacer click, navega a `/conductor/iniciar-sesion` (pantalla clara, explica que el
  login real todavía no existe).

---

### Escenario B — Con sesión, sin backend disponible (manejo de errores)

1. En la consola: `localStorage.setItem('ecoruta_jwt', 'cualquier-cosa')`.
2. Navegá (o recargá) `http://localhost:5173/conductor`.
3. Si tu backend en `VITE_API_BASE_URL` no está corriendo (o no tiene los endpoints de
   `/rutas` y `/paradas/{id}/reservas`), vas a ver el error.

**Esperado:**
- Mensaje traducido y en español ("Sin datos nuevos: revisa tu conexión e intenta de
  nuevo." o similar), nunca un código HTTP ni un stack técnico.
- Botón "Intentar de nuevo" visible y funcional.
- El aviso se ve legible sobre el fondo oscuro del panel (no los colores de error del
  tema claro del resto de la app).

---

### Escenario C — Con sesión y datos reales (criterios 1, 2, 3, 4, 5)

Necesitás un backend real corriendo con:
- `GET /api/v1/rutas` devolviendo al menos una ruta `activa: true` con `paradas`
  (cada una con su `orden`).
- `GET /api/v1/paradas/{id}/reservas` respondiendo `{ paradaId, activas, reservas }` por
  cada parada de esa ruta.

Pasos:

1. `localStorage.setItem('ecoruta_jwt', 'cualquier-cosa')` y navegá a `/conductor`.
2. Verificá contra la lista de abajo.

**Checklist de criterios de aceptación:**

- [ ] **Orden del recorrido** — las paradas aparecen en el orden real de la ruta (según
      `orden` del catálogo), no alfabético ni por id. Probalo con una ruta cuyo catálogo
      no venga ordenado.
- [ ] **Cantidad de gente esperando** — cada parada con reservas activas muestra su
      número, bien grande.
- [ ] **Se actualiza sola** — dejá el panel abierto ~15 segundos sin tocar nada y
      cambiá una reserva desde el backend (o esperá a que cambie el dato real); el
      número debería cambiar solo, sin recargar la página.
- [ ] **Paradas vacías se distinguen a simple vista** — una parada sin nadie esperando
      se ve claramente distinta (línea punteada, sin número grande, texto "nadie
      esperando"), no solo un color distinto.
- [ ] **Se lee de un vistazo** — números grandes, alto contraste, sin necesidad de
      acercarse a la pantalla ni hacer zoom.
- [ ] **Sin sesión válida** — ya cubierto en el Escenario A.

---

## 3. Si no tenés el backend de reservas todavía

Para ver el Escenario C sin backend real, se puede interceptar la red desde las DevTools
del navegador (pestaña *Network* → *Overrides*, o una extensión de mocking), simulando
las dos rutas del contrato:

- `GET /api/v1/rutas`
- `GET /api/v1/paradas/{paradaId}/reservas`

Si preferís un script reproducible, hay uno hecho con Playwright que intercepta ambas
rutas con datos de prueba (paradas fuera de orden a propósito, algunas en 0) y saca
capturas de los tres escenarios — pedímelo si lo querés de nuevo, no quedó guardado en
el repo porque era solo para verificar esta sesión.
