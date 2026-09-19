# DESIGN.md — EcoRuta

Reglas de diseño para agentes de IA que generen o modifiquen interfaz en este proyecto.

Este archivo es normativo. Si una instrucción del usuario contradice una regla marcada
como **[DURA]**, no la apliques: detente y pregunta. Las reglas marcadas **[BLANDA]**
son el valor por defecto y pueden negociarse.

Complementa a `CLAUDE.md`, que cubre el código. Este archivo cubre lo visual y el texto
de interfaz.

---

## 1. Contexto que condiciona todo

EcoRuta es un sistema de información en tiempo real para el bus eléctrico municipal de
Jalapa, Guatemala. Es un servicio público real, no un demo.

Antes de tomar cualquier decisión visual, asume esto sobre el usuario:

- Está **de pie, en la calle, bajo sol directo, con una mano, con prisa**.
- Usa **Android de gama baja** con datos móviles caros e intermitentes.
- El rango de edad y de alfabetización digital es amplísimo.
- **No tiene cuenta.** Es anónimo. No hay login, registro ni correo.

Criterio de aceptación de cualquier pantalla: **el dato principal se lee en menos de
tres segundos, bajo sol, sin leer nada más.**

Si una decisión es bonita pero falla ese criterio, la decisión está mal.

---

## 2. Identidad: "Cívico Jalapaneco"

Esqueleto de Material 3 Expressive (áreas táctiles grandes, contraste alto, tokens
semánticos, formas expresivas) con la disciplina de un sistema de diseño de gobierno
(claridad, lenguaje llano, accesibilidad como piso mínimo).

El ornamento sale de dos fuentes reales del municipio:

- **La bandera de Jalapa**, de donde vienen los colores y su significado.
- **La cerámica local**, que se hace en barro rojo y se decora con volutas y motivos
  fitomórficos en blanco o negro. De ahí sale el lenguaje de formas.

Las siluetas de los volcanes Alzatate, Jumay y Monterrico sirven como marca gráfica
secundaria.

**[DURA]** Nada de folclorismo turístico, textura fotográfica, ni ilustración 3D
genérica. El resultado debe verse contemporáneo y deliberado.

---

## 3. Color

### 3.1 La regla central

**[DURA]** El color de marca y el color de estado son **dos capas separadas que nunca
se mezclan**.

Razón: la bandera de Jalapa es roja, amarilla y verde. Esos tres juntos leen como
semáforo y como estados de sistema (error, advertencia, éxito). En una app cuyo trabajo
es señalizar estados, marca y estado se pisarían. Además, rojo contra verde es el par
que más falla en daltonismo: en deuteranopía y protanopía ambos derivan hacia el
amarillo y dejan de distinguirse.

Consecuencias, todas **[DURA]**:

- Ningún estado se comunica solo por color. **Siempre color + ícono + texto.**
- Los estados se distinguen por diferencia de **luminancia**, no de tono.
- Usa posición y forma como pista redundante.
- Verde nunca significa "éxito" por sí solo. Es el color de marca y de acción.
- Rojo nunca se usa como color decorativo o de acento alegre.

### 3.2 Tokens de marca

> Valores provisionales. El manual de marca de la Municipalidad existe pero aún no está
> disponible. Ver sección 11.

| Token | Hex | Rol |
|---|---|---|
| `--verde-jumay` | `#10402A` | Primario, acción, trazo de ruta |
| `--verde-jumay-fuerte` | `#0B2E1E` | Presionado; tarjetas sobre fondo verde |
| `--verde-jumay-suave` | `#CBDED1` | Texto sobre verde; línea de la tira |
| `--verde-jumay-apagado` | `#4E6B5A` | Bordes y líneas sobre fondo verde |
| `--verde-jumay-superficie` | `#E7EFE4` | Relleno suave, chips |
| `--amarillo-volcan` | `#F2B705` | Acento, "tu parada", espera confirmada |
| `--amarillo-volcan-tinta` | `#241C00` | Texto sobre amarillo |
| `--amarillo-volcan-superficie` | `#FBF0D6` | Relleno suave |
| `--rojo-santa-marta` | `#8C2B22` | Franja de identidad, "yo" en el mapa, soltar la reserva |
| `--rojo-santa-marta-superficie` | `#F6E4E0` | Relleno suave, avisos críticos |

> **Sep. 2026:** estos valores se alinearon al proyecto de Claude Design, que es la
> fuente de verdad. Los anteriores (`#2F5D3A`, `#E8B33C`, `#A8321F`) no coincidían con
> ningún artboard. Los tokens exactos viven en `src/estilos/tema.css`.

### 3.3 Tokens neutros

| Token | Hex | Rol |
|---|---|---|
| `--superficie-base` | `#FBF7F0` | Fondo de pantalla, hoja inferior (blanco cálido) |
| `--superficie-tarjeta` | `#FBF7F0` | Tarjetas y pastillas sobre el mapa |
| `--superficie-suave` | `#F4EEE2` | Tarjetas internas, divisores |
| `--superficie-mapa` | `#E6DCC8` | Fondo del mapa mientras cargan los tiles |
| `--tinta` | `#1C1A17` | Texto primario y datos |
| `--tinta-cuerpo` | `#2E2A24` | Texto corrido |
| `--tinta-secundaria` | `#4A443A` | Texto de apoyo |
| `--tinta-tenue` | `#6B6357` | Metadatos, marcas de tiempo |
| `--borde` | `#DDD3C2` | Borde por defecto |
| `--borde-sutil` | `#E3DACB` | Divisores |

**[DURA]** Nunca negro puro (`#000`) ni blanco puro (`#FFF`) como superficie o texto.

### 3.4 Pares validados

Usa solo estas combinaciones para texto. Cualquier otra requiere verificar contraste.

| Texto | Sobre | Uso |
|---|---|---|
| `--tinta` | `--superficie-base` / `--superficie-tarjeta` | Cuerpo, títulos, datos |
| `--tinta-secundaria` | `--superficie-tarjeta` | Apoyo, subtítulos |
| `--verde-jumay` | `--superficie-tarjeta` / `--verde-jumay-superficie` | Enlaces, cifras destacadas |
| `--superficie-base` | `--verde-jumay` | Texto sobre botón primario |
| `--amarillo-volcan-tinta` | `--amarillo-volcan` / `--amarillo-volcan-superficie` | Insignias |
| `--rojo-santa-marta` | `--rojo-santa-marta-superficie` | Avisos críticos |

**[DURA]** Prohibido: texto amarillo sobre fondo claro. El amarillo es siempre relleno,
nunca tinta sobre claro.

### 3.5 Modo oscuro

**[DURA]** El modo oscuro se diseña a propósito. No se genera invirtiendo el modo claro.
Si no tienes valores explícitos para modo oscuro, no lo implementes a medias.

---

## 4. Tipografía

**[BLANDA]** Una sola familia variable, subconjunto latino, autoalojada. Máximo dos si
hay razón fuerte. El peso de descarga importa más que la variedad tipográfica.

**[DURA]** Números tabulares obligatorios en todo dato numérico:
`font-variant-numeric: tabular-nums`. Sin esto, los contadores y los ETA saltan al
actualizarse.

### Escala

| Nombre | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `dato-xl` | 40 / 44 | 500 | ETA, tiempo restante |
| `dato-l` | 28 / 32 | 500 | Contador de personas esperando |
| `titulo` | 20 / 26 | 500 | Título de pantalla |
| `subtitulo` | 16 / 22 | 500 | Nombre de parada, encabezado de tarjeta |
| `cuerpo` | 15 / 22 | 400 | Texto corrido |
| `etiqueta` | 13 / 18 | 400 | Etiquetas, apoyo |
| `micro` | 11.5 / 16 | 400 | Marca de tiempo, atribución |

**[DURA]** Nada por debajo de 11.5px. **[DURA]** Solo dos pesos: 400 y 500.

**[DURA]** Sentence case en toda la interfaz. Nunca Title Case, nunca MAYÚSCULAS
sostenidas.

---

## 5. Espaciado, forma y toque

Escala de espaciado, base 4: `4, 8, 12, 16, 24, 32, 48`.

| Token | Valor | Uso |
|---|---|---|
| `--radio-control` | 8px | Campos, chips |
| `--radio-etiqueta` | `6px 2px 6px 2px` | Atribución y contadores sobre el mapa |
| `--radio-tarjeta-chica` | `12px 3px 12px 3px` | Íconos en tarjeta, marcador del bus en la tira |
| `--radio-tarjeta` | `20px 6px 20px 6px` | Tarjetas |
| `--radio-hoja` | `28px 8px 0 0` | Hoja inferior |
| `--radio-pastilla` | 999px | Botones, insignias, contadores |

**Gesto característico:** las tarjetas llevan esquinas alternas, abiertas arriba a la
izquierda y abajo a la derecha, cerradas en las otras dos (`20px 6px 20px 6px`). Es la
destilación de la voluta de la cerámica jalapaneca. Se aplica con consistencia o no se
aplica. Los botones son pastilla completa.

**[DURA]** Área táctil mínima 48×48px, incluso si el elemento visible es menor.

**[DURA]** Una sola acción primaria por pantalla.

---

## 6. Ornamento

Permitido en: pantalla de bienvenida, pantalla de instalación, cabeceras de identidad,
ilustraciones de estado vacío, fuera de servicio y sin conexión.

**[DURA]** Prohibido:

- Cualquier ornamento detrás de números, horas o contadores.
- Ornamento que baje el contraste del texto por debajo del mínimo.
- Ornamento en el panel del conductor. Esa superficie es funcional pura.
- Imágenes rasterizadas para ornamento. Solo SVG inline optimizado.

Si un motivo no cabe en el presupuesto de peso, se simplifica. Nunca se sustituye por
una imagen.

---

## 7. Estados de datos

**[DURA]** Estos cinco estados existen y toda vista que muestre datos en vivo debe
manejarlos explícitamente. Ninguno es un error genérico.

| Estado | Condición | Tratamiento |
|---|---|---|
| `fresco` | Dato de menos de 5 min | Presentación normal, marca de tiempo discreta |
| `rancio` | Dato de más de 5 min | Atenuado, marca de tiempo prominente, ETA suspendido |
| `sin-conexion` | Sin red | Croquis en lugar de mapa, último dato con su hora |
| `fuera-de-servicio` | 13:30–15:30 o fuera de horario | Pantalla propia que informa cuándo vuelve el servicio |
| `en-desvio` | El bus se separó del trazo conocido | Ruta oficial atenuada, recorrido real visible, ETA marcado como poco confiable |

**[DURA]** `fuera-de-servicio` y `sin-conexion` son pantallas de primera clase, no
pantallas de error. Nunca uses iconografía de fallo ni tono de disculpa en ellas.

**[DURA]** La marca de tiempo del último dato recibido es visible siempre que se muestre
posición o ETA. Sin excepciones.

---

## 8. Componentes

Nombres en español, convención del repositorio.

| Componente | Qué es | Regla clave |
|---|---|---|
| `MapaRuta` | Mapa con tiles propios (MapLibre + PMTiles de OSM) | Solo ruta, bus y tu parada llevan color saturado. Todo lo demás apagado. Atribución de OpenStreetMap permanente |
| `CroquisRuta` | Trazo dibujado a mano, respaldo del mapa | Mismo trazo, mismos marcadores, misma tarjeta. Solo cambia el fondo |
| `MarcadorBus` | Posición del bus | Se desliza, no salta. Lleva orientación |
| `MarcadorParada` | Parada en el mapa | Dos pesos: normal y "tu parada" |
| `TarjetaFlotante` | Información sobre el mapa | Estado recogido y expandido. **[DURA]** En estado recogido no puede tapar el `MarcadorBus` |
| `BloqueETA` | Tiempo estimado | Ver sección 9 |
| `ContadorDemanda` | Personas esperando en una parada | Dato de primera clase. `dato-l`, tabular |
| `TarjetaParada` | Parada en lista | Referencia reconocible, no nombre oficial |
| `ChipEstadoServicio` | Estado del servicio | Color + ícono + texto, siempre los tres |
| `TemporizadorEspera` | Cuenta de 5 min hasta expirar el aviso, renovable (SCRUM-307) | Debe sentirse tranquilizador, no ansioso |
| `BotonPrimario` | Acción principal | Uno por pantalla |
| `BannerConexion` | Aviso de degradación | Informa, no alarma |

Cada componente necesita sus estados: normal, presionado, deshabilitado, cargando,
error, vacío.

---

## 9. El bloque de ETA

El ETA se calcula con un modelo propio entrenado con el historial GPS del bus. Su
precisión mejora con las semanas. **[DURA]** El diseño refleja esa incertidumbre con
honestidad.

Tres presentaciones del mismo dato:

| Confianza | Presentación | Ejemplo |
|---|---|---|
| Alta | Número exacto | "Llega en 6 min" |
| Media | Rango | "Llega en 6 – 9 min" |
| Baja o sin datos | Sin estimación, próxima salida programada | "Próxima salida 10:15" |

**[DURA]** Las tres ocupan el mismo espacio y tienen el mismo peso visual. La tarjeta no
puede cambiar de tamaño al cambiar de estado.

**[DURA]** El indicador de confianza es discreto. Nunca parece un error ni una alarma.

---

## 10. Contenido y microcopy

**[DURA]** Español de Guatemala, lenguaje llano, sin tecnicismos ni inglés.

| En lugar de | Escribe |
|---|---|
| Check-in | Avisar que estoy esperando |
| Tracking / rastreo | Dónde va el bus |
| Geofence, radio, umbral | (no se menciona nunca al usuario) |
| Tu ubicación actual | Dónde estás |
| ETA | Cuánto falta / Llega en |
| Error de conexión | Sin datos nuevos |
| Servicio no disponible | El bus descansa hasta las 3:30 |

Reglas de redacción:

- Verbo primero en botones. "Elegir parada", no "Selección de parada".
- Sin "por favor", sin signos de admiración, sin "exitosamente".
- Los errores dicen qué pasó y qué hacer. Una oración. Sin prefijo "Error:".
- Los estados vacíos invitan, no se disculpan.
- Las paradas se nombran por referencia reconocible: esquinas, negocios, hitos.
  **En Jalapa las paradas no están señalizadas físicamente.**

---

## 11. Reglas por superficie

### Pasajero (móvil, React web, PWA)
Máxima carga de identidad. Mapa como vista principal. Croquis como respaldo.

### Conductor (tablet horizontal, navegador)
**[DURA]** Sin mapa. Sin ornamento. Lista de paradas con demanda, en alto contraste,
legible a un metro mientras se maneja. Sin scroll. Asume pantalla siempre encendida y
luz cambiante dentro del bus.

### Panel municipal (escritorio)
Sobrio. Identidad solo en la cabecera. Orientado a que un funcionario justifique
decisiones de servicio.

---

## 12. Accesibilidad

Mínimos no negociables, todos **[DURA]**:

- Contraste WCAG AA como piso. **AAA** en: contador de personas, ETA y hora de salida.
- Ningún estado depende solo del color.
- Área táctil 48×48px.
- Respeta `prefers-reduced-motion`.
- Movimiento solo con `opacity` y `transform`.
- Toda decisión de color se valida en simulador de deuteranopía y protanopía antes de
  darse por buena.

---

## 13. Presupuesto de peso

**[DURA]** El mapa no es excusa para engordar la app.

- Tipografía variable, subconjunto latino, autoalojada.
- Ornamento en SVG inline, nunca imágenes.
- Tiles de OSM restringidos al área de Jalapa y a los niveles de zoom que se usan.
- Sin librerías de ilustración.
- Los datos llegan por SSE cada 2–5 minutos. **[DURA]** El diseño no promete precisión
  al segundo.

---

## 14. Decisiones abiertas

No inventes respuestas a estas. Si una tarea depende de alguna, detente y pregunta.

1. **Escudo municipal.** Existe un manual de marca de la Municipalidad que aún no está
   en manos del equipo. Todo layout debe reservar un hueco de marca institucional que
   funcione con un escudo vertical, horizontal o circular. Los hex de la sección 3.2 son
   provisionales hasta entonces.
2. **Horario contra umbral.** No está resuelto si el bus sale por horario fijo o por
   umbral de 10 pasajeros. El bloque de próxima salida debe funcionar con ambos modelos.
3. **Precisión del ETA propio.** Se decide con evidencia tras las primeras semanas de
   operación. Hasta entonces, el modo de baja confianza es el comportamiento por defecto.

---

## 15. Lista de verificación antes de entregar cualquier pantalla

- [ ] El dato principal se lee en menos de tres segundos bajo sol.
- [ ] Ningún estado depende solo del color.
- [ ] Los cinco estados de datos de la sección 7 están contemplados.
- [ ] La marca de tiempo del último dato es visible donde corresponde.
- [ ] Una sola acción primaria.
- [ ] Áreas táctiles de 48px.
- [ ] Nada por debajo de 11.5px.
- [ ] Sentence case en todo.
- [ ] Sin ornamento sobre datos numéricos.
- [ ] La tarjeta flotante no tapa el marcador del bus.
- [ ] Atribución de OpenStreetMap presente si hay mapa.
- [ ] El microcopy usa el vocabulario de la sección 10.
- [ ] Contraste verificado, incluida la simulación de daltonismo.
