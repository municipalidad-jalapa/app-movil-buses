# Manual de pruebas — QA "En el menú, las letras se sobreponen"

## Historia

> Informe de QA (`Eco-Ruta (2).docx`), sección "Puntos de mejora en el Panel conductor":
> **"En el menú, las letras se sobreponen."** (Marlon Ruano)

Investigado: la app del conductor (`PanelConductor`) no tiene menú propio — usa `Layout`
solo en las pantallas de pasajero/legales, y `PanelConductor` no lo usa. El único
componente de navegación con esa fragilidad real es **`NavegacionPanel`**, las 7
pestañas del panel municipal (`Estado del servicio`, `Opiniones`, `Pasajeros subidos`,
`Rutas`, `Vehículos`, `Exportar datos`, `Ver el mapa`), en el breakpoint móvil de
`PanelMunicipal.css` (≤ 640px).

## Causa raíz

`src/componentes/admin/NavegacionPanel.css`, bloque `@media (max-width: 640px)`:

```css
/* antes */
.panel-navegacion__enlace {
  flex: 1 1 0;
  justify-content: center;
  min-width: 0;
  padding: 8px 4px;
  font-size: 13px;
  text-align: center;
}
```

Con 7 pestañas repartidas a partes iguales en un teléfono, cada una recibe ~50px.
`min-width: 0` le quita al navegador el ancho mínimo que reserva por contenido, así
que la caja puede encogerse por debajo del ancho de sus propias palabras. Como no hay
`overflow-wrap`/`white-space: nowrap`, una etiqueta larga ("Pasajeros subidos",
"Estado del servicio") no cabe y tampoco puede partirse: se desborda fuera de su
columna y queda flotando sobre el texto de la pestaña vecina.

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| **AC1** | En un teléfono (≤ 640 px) ninguna pestaña de `NavegacionPanel` invade visualmente a la pestaña vecina. |
| **AC2** | Las 7 secciones del panel siguen siendo alcanzables aunque no quepan todas a la vista a la vez. |
| **AC3** | El cambio es solo de maquetación (CSS): no rompe ninguna prueba existente del proyecto. |

## Cómo quedó implementado

`src/componentes/admin/NavegacionPanel.css`, mismo bloque, ahora una fila que se
desliza en vez de encoger el texto:

```css
/* despues */
.panel-navegacion {
  flex: 1 1 100%;
  width: 100%;
  margin-left: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.panel-navegacion__enlace {
  flex: 0 0 auto;
  padding: 8px 14px;
  font-size: 13px;
  white-space: nowrap;
}
```

Cada pestaña conserva su ancho natural en una sola línea; si no caben todas, el
usuario desliza el dedo. Nunca se parte ni se superpone texto.

---

## 1. Pruebas automáticas (Vitest)

```bash
npm install
npm test                                             # toda la bateria del proyecto
npx vitest run test/QA-navegacion-panel-superposicion # solo esta correccion
```

### 1.1 Prueba nueva agregada para esta corrección

`unitarios/navegacionPanelResponsive.test.ts` lee el CSS real (no hace falta montar
el componente ni un navegador) y fija el arreglo para que no vuelva a romperse:

| Prueba | Verifica |
|---|---|
| cada pestaña se queda en una sola linea (no se encoge por debajo de su texto) | `white-space: nowrap` en `.panel-navegacion__enlace` dentro del breakpoint móvil — AC1 |
| la fila de pestañas se desliza en vez de partir el texto | `overflow-x: auto` en `.panel-navegacion` dentro del breakpoint móvil — AC2 |
| ninguna pestaña vuelve a usar `min-width: 0` con `flex: 1 1 0` | la combinación exacta que causaba el desborde no reaparece — AC1 |

Se verificó que la prueba de verdad detecta el bug: al correrla contra el CSS
**anterior** al arreglo (`git stash` del archivo), las 3 pruebas fallan mostrando el
`min-width: 0` y el `flex: 1 1 0` que causaban la superposición. Contra el archivo
corregido, pasan las 3.

### 1.2 Resto de la batería (regresión)

El cambio es solo CSS en un archivo, así que no se esperaba que tocara otra prueba.
Se corrió toda la batería del proyecto para confirmarlo — ver `resultados.txt`.

---

## 2. Pruebas manuales / visuales

No hay backend real disponible en este entorno y esta sesión no tiene herramienta de
navegador, así que la verificación visual se hizo reproduciendo el CSS real del
componente (`panel-cabecera__marca` + `NavegacionPanel`, tal cual, sin inventar
estilos) en una página aparte, comparando el bloque móvil antes/después a 390px de
ancho.

| # | Paso | Resultado esperado | Resultado obtenido |
|---|------|--------------------|---------------------|
| M1 | Reproducción del CSS real, columna "antes", a 390px | "Pasajeros subidos", "Estado del servicio" y "Exportar datos" se desbordan sobre la pestaña vecina | ✅ Confirmado — así se ve la caja `min-width:0` con texto sin partir |
| M2 | Reproducción del CSS real, columna "después", a 390px | Cada pestaña en una sola línea; la fila se desliza; nada se superpone | ✅ Confirmado |
| M3 | Abrir `/admin` de verdad en Chrome/Edge con la ventana angosta (< 640px) o en un teléfono, después de `npm run dev` y loguearse como admin | Igual que M2: pestañas en una línea, se deslizan con el dedo | ⏳ Pendiente — necesita sesión real de admin (Firebase) y navegador, no disponibles en este entorno |
| M4 | Con lector de pantalla / solo teclado, recorrer las 7 pestañas con Tab | Cada `NavLink` sigue enfocable y anunciado en orden, aunque no esté a la vista (el desplazamiento es solo visual) | ⏳ Pendiente — no se tocó el DOM ni los atributos de accesibilidad, pero no se verificó a mano en esta sesión |

---

## 3. Matriz criterio → evidencia

| Criterio | Automática | Manual/visual |
|---|---|---|
| **AC1** — ninguna pestaña invade a la vecina | `navegacionPanelResponsive.test.ts` (2 de 3 pruebas) | M1, M2 |
| **AC2** — las 7 secciones siguen alcanzables | `navegacionPanelResponsive.test.ts` (`overflow-x: auto`) | M2 |
| **AC3** — no rompe nada existente | Batería completa del proyecto (`resultados.txt`) | — |

---

## 4. Cómo reproducir todo

```bash
npm install
npm test                                              # bateria completa
npx vitest run test/QA-navegacion-panel-superposicion # solo esta correccion
npx tsc --noEmit                                      # sin errores de tipos
npm run build                                         # build de produccion
```

Ver `resultados.txt` en esta misma carpeta para el resultado real de la última corrida.

## Actualización: rediseño responsive del panel

El rediseño del panel municipal (rama `correcciones-panel-de-administracion`) reemplazó
la fila deslizable de pestañas del teléfono por un cajón lateral: por debajo de 1024 px
`.panel-navegacion` no se muestra y las secciones van en `.panel-cajon`, una por renglón.
El bloque `@media (max-width: 640px)` ya no existe; `unitarios/navegacionPanelResponsive.test.ts`
ahora comprueba el cajón y sigue prohibiendo la combinación `flex: 1 1 0` + `min-width: 0`.
