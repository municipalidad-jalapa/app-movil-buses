# language: es

Característica: Pantalla de carga definitiva (SCRUM-11)

  Como pasajero
  Quiero ver algo de EcoRuta apenas abro la página
  Para saber que la aplicación está cargando y no que falló

  Escenario: Se ve antes de que baje el JavaScript
    Dado que el navegador recibe "index.html"
    Entonces dentro de "#raiz" ya está la pantalla de carga
    Y muestra el símbolo, "EcoRuta", "Bus eléctrico · Jalapa" y "Cargando…"

  Escenario: React la reemplaza al montar
    Dado que la pantalla de carga está visible
    Cuando la aplicación termina de arrancar
    Entonces la pantalla de carga desaparece
    Y se ve el mapa

  Escenario: Es accesible
    Dado que la pantalla de carga está visible
    Entonces anuncia su estado con role "status" y aria-live "polite"
    Y el símbolo y los volcanes están ocultos a los lectores de pantalla
    Y el texto principal tiene contraste AAA sobre el fondo verde
    Y ningún texto baja de 11.5 px

  Escenario: Respeta a quien pide menos movimiento
    Dado que la persona tiene activado "reducir movimiento"
    Entonces la animación del "Cargando…" se apaga
    Y la animación solo mueve la opacidad

  Escenario: No depende de nada externo
    Dado el archivo "index.html"
    Entonces no pide fuentes, imágenes ni scripts a otros servidores
    Y pesa menos de 10 kB

  Escenario: La aplicación tarda más de 20 segundos en arrancar
    Dado que la pantalla de carga sigue visible
    Cuando pasan 20 segundos
    Entonces el texto cambia a "Está tardando más de lo normal: revisa tu conexión y vuelve a abrir la página."

  Escenario: La aplicación ya arrancó cuando vence el plazo
    Dado que React ya reemplazó la pantalla de carga
    Cuando pasan 20 segundos
    Entonces no ocurre nada y no hay errores

  Escenario: JavaScript desactivado
    Dado que el navegador tiene JavaScript desactivado
    Cuando se abre el sitio
    Entonces se ve "EcoRuta necesita JavaScript para mostrar dónde va el bus. Actívalo e intenta de nuevo."
    Y no se muestra un "Cargando…" engañoso
