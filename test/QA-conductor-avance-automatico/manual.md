# Manual de pruebas — Panel del conductor: avance automático de parada (QA "Eco-Ruta (2).docx")

## Historia

> Hallazgo de QA (Marlon Ruano, panel del conductor):
> "Presionar 'Siguiente parada' varias veces genera un mensaje de error. Se
> propone que el avance por la ruta de paradas sea automático, en lugar de
> depender del botón."

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| **AC1** | Tocar varias veces seguidas el botón que cierra la parada no muestra un error crudo al conductor. |
| **AC2** | Mientras la petición está en curso, el botón que la dispara queda deshabilitado (no se puede volver a tocar). |
| **AC3** | El avance por la ruta de paradas es automático: el GPS detecta cuándo el bus llega a la parada que toca y el conductor pasa solo a la pantalla "Estás en la parada", sin depender de un botón. |
| **AC4** | Sigue existiendo un botón manual ("Llegué") como respaldo, para cuando el GPS no está disponible o falla. |

## Cómo está implementado hoy

| Pieza | Qué hace |
|---|---|
| `src/core/tipos.ts` (`EstadoDelBusEta`) y `src/core/eta.ts` | El backend calcula, a partir del GPS real del bus, un estado (`EN_RUTA`, `DETENIDO_EN_PARADA`, `DETENIDO_FUERA_DE_PARADA`, `EN_DESVIO`, `SIN_DATOS`) y los minutos a cada parada. El cliente no hace geocerca por su cuenta: consume el estado ya calculado. |
| `src/hooks/usePanelConductor.ts` | Trae `GET /api/v1/conductor/panel` cada 15 s (`REFRESCO_PANEL_MS`). `cerrarParada()` expone `marcando` (el id de la parada que se está guardando) y traduce el `409 Conflict` ("la misma parada se cerró hace un momento") a un mensaje claro en vez de un error crudo. |
| `src/paginas/conductor/PanelConductor.tsx` (líneas 60-69, `autoLlegada`) | `useEffect` que mira `panel.estadoBus === 'DETENIDO_EN_PARADA'` y `proxima.minutos <= 0`: si se cumple, pasa solo a la pantalla "Estás en la parada" (AC3). Un `useRef` evita que se dispare dos veces para la misma parada. |
| `src/paginas/conductor/PanelConductor.tsx` (botón "Llegué") | Botón manual de respaldo (AC4), con la nota "El GPS también la detecta solo". |
| `src/paginas/conductor/PanelConductor.tsx` (botón "Salir de la parada", líneas 349-352) | `disabled={enviando}` (`enviando = marcando === fase.parada.paradaId`); mientras se guarda el texto cambia a "Guardando…". Evita el doble envío (AC2). |
| `design/EcoRuta.dc.html` (pantalla "08 · Conductor") | Mockup estático de referencia (no se usa en el build de Vite). Se actualizó para reflejar el mismo comportamiento: "Próxima parada" en vez de la etiqueta suelta "Siguiente parada", el botón "Llegué" con la nota del GPS, y una leyenda que explica el avance automático y el bloqueo mientras se guarda. |

---

## 1. Pruebas automáticas (Vitest)

No necesitan backend ni navegador real.

```bash
npm install
npm test                                              # toda la batería del proyecto
npx vitest run src/paginas/conductor/PanelConductor.test.tsx   # solo el panel del conductor
```

### 1.1 Prueba nueva agregada para este hallazgo

| Archivo | Prueba | Verifica |
|---|---|---|
| `src/paginas/conductor/PanelConductor.test.tsx` | `presionar "Salir de la parada" varias veces seguidas no dispara pedidos duplicados` | Deja la petición de `marcarParadaAtendida` sin resolver, toca el botón tres veces y confirma que (a) el botón queda `disabled` con el texto "Guardando…" y (b) `marcarParadaAtendida` se llamó una sola vez — AC1, AC2 |

### 1.2 Pruebas existentes que ya cubrían parte del hallazgo

| Archivo | Prueba | Criterio |
|---|---|---|
| `PanelConductor.test.tsx` | `el GPS detecta la llegada: bus detenido en la proxima parada` | Con `estadoBus: 'DETENIDO_EN_PARADA'` y la próxima parada a 0 minutos, la pantalla pasa sola a "Estás en la parada" sin tocar nada — AC3 |
| `PanelConductor.test.tsx` | `si no se pudo guardar se queda en la parada y lo dice` | Un `409` del backend se traduce a "Esta parada ya la cerraste hace un momento: este conteo no se guardó." en vez de un error crudo — AC1 |
| `PanelConductor.test.tsx` | `en camino muestra la proxima parada...` | El botón "Llegué" sigue presente como respaldo manual — AC4 |
| `PanelConductor.test.tsx` | `en la parada cuenta con Subió y Bajó, deshace y guarda el conteo al salir` | Flujo completo feliz: llegar, contar, salir, y que `marcarParadaAtendida` reciba el conteo correcto |
| `src/hooks/useUbicacion.test.ts` | mensaje claro al negar el permiso o sin soporte de geolocalización | Mismo vocabulario de error para el otro origen de GPS del proyecto (ubicación del pasajero) |

### 1.3 Resto de la batería

El resto de los archivos de prueba del proyecto no tocan esta historia directamente, pero corren igual en `npm test` como regresión: nada de lo agregado puede romper lo demás. Ver `resultados.txt` en esta misma carpeta para el detalle completo de la corrida.

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
| M1 | Iniciar sesión como conductor con una ruta asignada, tocar "Salir de la parada" varias veces muy rápido (o con la red lenta) | El botón se deshabilita en el primer toque, muestra "Guardando…" y no aparece ningún error aunque se siga tocando | Pendiente (necesita backend real) |
| M2 | Con el bus físico o simulado acercándose a una parada (`VITE_UBICACION_SIMULADA` en desarrollo, o GPS real) | Al llegar, la pantalla pasa sola a "Estás en la parada" sin tocar "Llegué" | Pendiente (necesita backend real o simulador de posición) |
| M3 | Cerrar la misma parada desde dos pestañas/dispositivos a la vez | La segunda pantalla muestra "Esta parada ya la cerraste hace un momento: este conteo no se guardó." en vez de un error técnico | Pendiente (necesita backend real) |
| M4 | Con el GPS del teléfono apagado o sin señal | El botón "Llegué" sigue disponible y funciona igual que antes | Pendiente (necesita backend real) |

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
| **AC3** — avance automático por GPS | `PanelConductor.test.tsx` ("el GPS detecta la llegada...") | M2 |
| **AC4** — botón manual de respaldo | `PanelConductor.test.tsx` (botón "Llegué" en todas las pruebas del estado "camino") | M4 |

---

## 5. Cómo reproducir todo

```bash
npm install
npm test                                              # toda la bateria del proyecto
npx vitest run src/paginas/conductor/PanelConductor.test.tsx   # solo este hallazgo
npx tsc --noEmit
npm run build
```

Ver `resultados.txt` en esta misma carpeta para el resultado real de la última corrida.
