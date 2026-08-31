# Pruebas manuales — HU-58 (SCRUM-153)

Guion para verificar a mano lo que ninguna prueba automática alcanza.

Los criterios automatizados viven en `src/pruebas/features/avisos_y_abordaje.feature`
y corren con `npm test`. Este documento cubre **solo los escenarios marcados
`@manual`** en ese archivo, más un repaso completo del flujo para la demo.

Un escenario está acá por una de dos razones: depende de que Firebase entregue un
push de verdad, o depende de un navegador real con permisos concedidos. Ninguna
de las dos se puede simular con honestidad en jsdom.

---

## Antes de empezar

| Requisito | Cómo se comprueba |
|---|---|
| Backend arriba | `curl http://localhost:8080/actuator/health` responde `{"status":"UP"}` |
| Frontend arriba | `npm run dev`, abre `http://localhost:5173` |
| Firebase configurado | Las siete `VITE_FIREBASE_*` en `.env`. Sin ellas los avisos quedan apagados y **esta guía no aplica** |
| Contexto seguro | Usar `http://localhost:5173`. El navegador trata `localhost` como seguro; una IP de LAN sobre HTTP **no** |

Para ver el bus moviéndose durante la prueba:

```bash
cd backend
ECORUTA_ADMIN_TOKEN='solo-para-desarrollo-local-no-usar-en-produccion' python tools/simulador-gps.py
```

### Estado limpio

Antes de cada corrida, en la consola del navegador (F12):

```js
localStorage.removeItem('ecoruta_avisos_rechazados');
localStorage.removeItem('ecoruta_reserva');
```

Y en Chrome, revocar el permiso de notificaciones: candado en la barra de
direcciones → Configuración del sitio → Notificaciones → Restablecer.

---

## PM-1 · El permiso se pide explicando antes

Cubre el criterio 1. Automatizado a nivel de componente, pero conviene verlo con
el diálogo real del navegador al menos una vez.

1. Abrir `http://localhost:5173/registro/1` y completar la reserva.
2. **Verificar:** aparece la tarjeta "Avisos" con el texto *"Te avisamos cuando el
   bus ya viene para tu parada"*, y el navegador **todavía no** ha mostrado su
   diálogo.
3. Tocar "Activar avisos".
4. **Verificar:** ahora sí aparece el diálogo nativo de Chrome.

> Falla si el diálogo del navegador aparece antes de que el usuario toque el
> botón. Es criterio de aceptación, no preferencia.

---

## PM-2 · Rechazar no rompe nada y no se insiste

Cubre el criterio 2.

1. Con el estado limpio, reservar y tocar **"Seguir sin dar permisos"**.
2. **Verificar:** la reserva sigue en pie y no aparece ningún error.
3. Recargar la página y volver a la pantalla de reserva.
4. **Verificar:** la tarjeta de avisos **no** vuelve a aparecer.
5. Confirmar en consola: `localStorage.getItem('ecoruta_avisos_rechazados')` → `"true"`.

---

## PM-3 · El Service Worker queda registrado

Prerrequisito de PM-4 y PM-5.

1. Conceder el permiso de avisos.
2. DevTools → **Application → Service Workers**.
3. **Verificar:** `firebase-messaging-sw.js` aparece como *activated and running*.

> Si dice *redundant* o no aparece: revisar que la URL responda con
> `Content-Type: application/javascript` y no el `index.html` del SPA. En el
> contenedor eso lo garantiza el bloque `location = /firebase-messaging-sw.js`
> de `nginx.conf`.

Marcar **"Update on reload"** en ese panel mientras se desarrolla: el navegador
cachea los service workers y es fácil quedarse probando una versión vieja.

---

## PM-4 · Los avisos llegan con la pestaña cerrada

**Escenario `@manual` — criterio 7.** Es el que ninguna herramienta cubre: hace
falta que el push viaje de verdad.

1. Con el Service Worker activo (PM-3), **cerrar la pestaña** de la aplicación.
2. En DevTools → Application → Service Workers, usar el botón **Push** con:

   ```json
   {"data":{"tipo":"confirmar-abordaje","reservaId":"1","titulo":"El bus llegó a tu parada","cuerpo":"¿Lograste subir?"}}
   ```

3. **Verificar:** aparece la notificación del sistema, con el título y cuerpo
   enviados, y con dos botones: **"Sí subí"** y **"No subí"**.

> El botón *Push* de DevTools simula la entrega, no prueba que FCM funcione de
> punta a punta. Para eso hace falta enviar desde el backend con la cuenta de
> servicio, que es de otra historia.

Repetir con `"tipo":"bus-cerca"` para el criterio 3: la notificación debe nombrar
la parada y **no** llevar botones.

---

## PM-5 · Tocar el aviso abre la aplicación en el mapa

**Escenario `@manual` — criterio 6.**

1. Con la notificación de PM-4 en pantalla, tocar el **cuerpo** del aviso.
2. **Verificar:** la aplicación se abre —o se enfoca, si ya estaba abierta— en la
   pantalla del mapa.
3. **Verificar:** aparece la tarjeta **"¿Lograste subir?"** abajo, y **no tapa el
   marcador del bus**. Es regla `[DURA]` de `DESIGN.md` §8.

Después, con una notificación nueva, tocar directamente el botón **"Sí subí"**:

4. **Verificar:** la aplicación se abre y **no** vuelve a preguntar. Muestra
   directamente *"Buen viaje. Tu reserva quedó cerrada."*

---

## PM-6 · La respuesta se refleja sin recargar

Cubre el criterio 5. Automatizado, pero conviene verlo en la demo.

1. Con la tarjeta "¿Lograste subir?" en pantalla, tocar **"Sí subí"**.
2. **Verificar:** el texto cambia sin recargar la página.
3. Confirmar en consola:
   `JSON.parse(localStorage.getItem('ecoruta_reserva')).estado` → `"ABORDO"`.
4. Repetir con **"No subí"** → `"CANCELADA"` y el mensaje
   *"Anotamos que no lograste subir..."*.

> Mientras `POST /api/v1/reservas/{id}/abordaje` no exista en el backend, esto
> requiere `VITE_SIMULAR_ABORDAJE=true`. Con esa bandera la interfaz es la real,
> pero **la respuesta no se persiste en el servidor**.

---

## PM-7 · En pantalla de teléfono

El diseño es móvil primero y la referencia es 390×844.

1. DevTools → modo dispositivo → 390×844.
2. **Verificar:** la tarjeta de abordaje entra completa, los dos botones son
   alcanzables con el pulgar y ninguno mide menos de 48×48 px.

> En una ventana de escritorio baja (~670 px de alto) la tarjeta queda cortada.
> Es un caso conocido y fuera de la pantalla de referencia.

---

## Lo que esta guía NO prueba

Decirlo explícitamente evita que alguien dé por verificado lo que no lo está:

- **Entrega real de FCM desde el servidor.** El botón *Push* de DevTools inyecta
  el mensaje localmente. El envío real lo hace el backend con la cuenta de
  servicio, y es otra historia.
- **Avisos en un entorno publicado.** Requieren HTTPS. Sobre HTTP con IP pública
  no llegan, y está declarado como limitación de la historia.
- **iOS.** Safari solo entrega avisos si la aplicación está guardada en la
  pantalla de inicio. Necesita `manifest.json` y el flujo PWA, que quedó fuera
  de alcance.
- **Persistencia del abordaje.** Hasta que exista el endpoint, la respuesta vive
  solo en el navegador.
