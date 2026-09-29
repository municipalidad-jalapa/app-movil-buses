# Manual de pruebas — Panel del conductor: avance automático de parada (QA "Eco-Ruta (2).docx")

## Historia

> Hallazgo de QA (Marlon Ruano, panel del conductor):
> "Presionar 'Siguiente parada' varias veces genera un mensaje de error. Se
> propone que el avance por la ruta de paradas sea automático, en lugar de
> depender del botón."

## Nota sobre esta rama

Mientras se armaba esta corrección, en `develop` se fusionó una reescritura
completa del panel del conductor (commits `1e5bf34` y `182346a`, de WalyhU)
que ya resuelve este mismo hallazgo de otra forma, más a fondo: en vez de un
botón "Llegué" que abre la parada, el panel entra **directo** a la parada
donde el GPS ubica al bus (a 60 m o menos) y muestra ahí mismo "Subió" /
"Bajó"; para cerrarla, el botón se llama, literalmente, **"Siguiente
parada"**. Al fusionar `develop` en esta rama el archivo de pruebas quedó con
un conflicto mal resuelto (líneas sueltas con el nombre de cada rama) que
rompía la verificación de tipos; se corrigió retomando la versión de
`develop` y readaptando sobre ella la prueba de este hallazgo. Esta versión
del documento describe el panel **ya fusionado**, no el que había antes.

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| **AC1** | Tocar varias veces seguidas "Siguiente parada" no muestra un error crudo al conductor. |
| **AC2** | Mientras la petición está en curso, el botón que la dispara queda deshabilitado (no se puede volver a tocar). |
| **AC3** | El avance por la ruta de paradas es automático: el GPS ubica en qué parada está el bus (a 60 m o menos) y el panel entra directo a "Subió / Bajó" en esa parada, sin un paso de "Llegué". |
| **AC4** | Sigue existiendo una forma manual de elegir la parada (hoja "Paradas" → "Estoy aquí"), para cuando el GPS no está disponible o el conductor necesita corregir. |

## Cómo está implementado hoy

| Pieza | Qué hace |
|---|---|
| `src/core/panelConductor.ts` (`paradaDondeEstaElBus`, `proximaParada`) | Calcula, con la posición en vivo del bus y las coordenadas de cada parada, en cuál está el bus (≤ 60 m, posición de menos de 2 min) o cuál es la próxima del recorrido si no está en ninguna. |
| `src/hooks/usePosicionBus.ts` + `src/hooks/useRutas.ts` | Traen la posición en vivo del bus y la ubicación (lat/long) de las paradas de la ruta, que `PanelConductor.tsx` combina para saber "dónde está" el bus. |
| `src/hooks/usePanelConductor.ts` | Trae `GET /api/v1/conductor/panel`. `cerrarParada()` expone `marcando` (el id de la parada que se está guardando) y traduce el `409 Conflict` a un mensaje claro en vez de un error crudo. |
| `src/paginas/conductor/PanelConductor.tsx` (`actual`, `aqui`, `fijada`) | Sin pantalla de "Llegué": entra directo a la parada donde está el bus, o a la próxima si no está en ninguna. Al primer toque de "Subió"/"Bajó" la parada queda fija (`fijadaId`) aunque el GPS proponga otra, para no perder un conteo a medias (AC3). |
| `src/paginas/conductor/PanelConductor.tsx` (botón "Siguiente parada", `enviando = marcando === actual.paradaId`) | `disabled={enviando}`; mientras se guarda el texto cambia a "Guardando…". Evita el doble envío (AC1, AC2). |
| `src/paginas/conductor/PanelConductor.tsx` (hoja "Paradas" → "Estoy aquí") | Respaldo manual: elegir la parada a mano si el GPS no ubica bien al bus (AC4). |
| `design/EcoRuta.dc.html` (pantalla "08 · Conductor") | Mockup estático de referencia (no se usa en el build de Vite). Se actualizó para quitar el botón "Llegué" y mostrar "Estás aquí" + "Subió"/"Bajó"/"Siguiente parada" en una sola pantalla, con una leyenda que explica el avance automático y el bloqueo mientras se guarda. |

---

## 1. Pruebas automáticas (Vitest)

No necesitan backend ni navegador real.

```bash
npm install
npm test                                                        # toda la batería del proyecto
npx vitest run src/paginas/conductor/PanelConductor.test.tsx    # solo el panel del conductor
```

### 1.1 Prueba nueva agregada para este hallazgo

| Archivo | Prueba | Verifica |
|---|---|---|
| `src/paginas/conductor/PanelConductor.test.tsx` | `presionar "Siguiente parada" varias veces seguidas no dispara pedidos duplicados` | Deja la petición de `marcarParadaAtendida` sin resolver, toca el botón tres veces y confirma que (a) queda `disabled` con el texto "Guardando…" y (b) `marcarParadaAtendida` se llamó una sola vez — AC1, AC2 |

### 1.2 Pruebas existentes (de la reescritura en `develop`) que ya cubrían parte del hallazgo

| Archivo | Prueba | Criterio |
|---|---|---|
| `PanelConductor.test.tsx` | `entra directo a la parada con Subió y Bajó, sin paso de Llegué` | Confirma que no existe botón "Llegué" ni pantalla "Hoy manejás": se entra directo a contar — AC3 |
| `PanelConductor.test.tsx` | `con el bus en una parada, esa es la que cuenta aunque otra llegue antes por el orden` | El GPS (≤ 60 m) manda sobre el orden del recorrido para decidir la parada activa — AC3 |
| `PanelConductor.test.tsx` | `lejos de toda parada o con la posicion vieja, propone la proxima del recorrido` | Sin GPS útil, cae a la próxima parada del recorrido (no se traba) — AC3/AC4 |
| `PanelConductor.test.tsx` | `al empezar a contar la parada queda fija aunque el GPS proponga otra` | Un conteo en curso no salta de parada aunque el GPS mande otra señal — evita perder el conteo, relacionado con AC3 |
| `PanelConductor.test.tsx` | `si no se pudo guardar se queda en la parada con su conteo y lo dice` | Un `409` del backend se traduce a "Esta parada ya la cerraste hace un momento: este conteo no se guardó." en vez de un error crudo — AC1 |
| `PanelConductor.test.tsx` | `la lista de paradas deja elegir en cual esta y marca las cerradas` | El "Estoy aquí" manual de la hoja "Paradas" sigue disponible — AC4 |
| `PanelConductor.test.tsx` | `cuenta, deshace y al pasar a la siguiente guarda el conteo y sigue con otra parada` | Flujo feliz completo con el nombre real del botón, "Siguiente parada" |
| `src/hooks/useUbicacion.test.ts` | mensaje claro al negar el permiso o sin soporte de geolocalización | Mismo vocabulario de error para el otro origen de GPS del proyecto (ubicación del pasajero) |

### 1.3 Resto de la batería

El resto de los archivos de prueba del proyecto no tocan esta historia directamente, pero corren igual en `npm test` como regresión: nada de lo agregado puede romper lo demás. Ver `resultados.txt` en esta misma carpeta para el detalle completo de la corrida, incluida una prueba (`CorregirRutas.test.tsx`, ajena a este hallazgo) que salió intermitente en el CI de GitHub y no se reprodujo en ninguna corrida local, en solitario ni en la batería completa.

---

## 2. Verificación de tipos y build

```bash
npx tsc --noEmit     # sin errores de tipos
npm run build        # tsc --noEmit + vite build; dist/ generado sin errores
```

---

## 3. Pruebas manuales (navegador real / dispositivo)

No hay backend real disponible en este entorno, así que estos pasos quedan para
repetir a mano contra un backend real (QA o producción) antes de cerrar el
hallazgo del todo.

| # | Paso | Resultado esperado | Resultado |
|---|------|--------------------|-----------|
| M1 | Iniciar sesión como conductor con una ruta asignada, tocar "Siguiente parada" varias veces muy rápido (o con la red lenta) | El botón se deshabilita en el primer toque, muestra "Guardando…" y no aparece ningún error aunque se siga tocando | Pendiente (necesita backend real) |
| M2 | Con el bus físico o simulado acercándose a una parada | El panel entra solo a esa parada con "Subió"/"Bajó", sin ningún botón de "Llegué" | Pendiente (necesita backend real o simulador de posición) |
| M3 | Cerrar la misma parada desde dos pestañas/dispositivos a la vez | La segunda pantalla muestra "Esta parada ya la cerraste hace un momento: este conteo no se guardó." en vez de un error técnico | Pendiente (necesita backend real) |
| M4 | Con el GPS del teléfono apagado o sin señal | La hoja "Paradas" → "Estoy aquí" sigue permitiendo elegir la parada a mano | Pendiente (necesita backend real) |

La prueba automática de la sección 1.1 cubre M1 y M3 a nivel de componente
(sin red real); M2 y M4 dependen del GPS real del dispositivo y del backend,
así que quedan marcadas como pendientes hasta poder probarlas contra un
entorno con datos reales.

---

## 4. Matriz criterio → evidencia

| Criterio | Automática | Manual |
|---|---|---|
| **AC1** — sin error crudo al tocar varias veces | `PanelConductor.test.tsx` ("pedidos duplicados", "si no se pudo guardar...") | M1, M3 |
| **AC2** — botón deshabilitado mientras se envía | `PanelConductor.test.tsx` ("pedidos duplicados") | M1 |
| **AC3** — avance automático por GPS (≤ 60 m) | `PanelConductor.test.tsx` ("entra directo...", "con el bus en una parada...", "lejos de toda parada...") | M2 |
| **AC4** — forma manual de elegir la parada | `PanelConductor.test.tsx` ("la lista de paradas deja elegir...") | M4 |

---

## 5. Cómo reproducir todo

```bash
npm install
npx vitest run                                                  # toda la bateria del proyecto
npx vitest run src/paginas/conductor/PanelConductor.test.tsx    # solo este hallazgo
npx tsc --noEmit
npm run build
```

Ver `resultados.txt` en esta misma carpeta para el resultado real de la última corrida.
