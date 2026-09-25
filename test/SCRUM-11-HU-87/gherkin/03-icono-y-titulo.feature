# language: es

Característica: Ícono y título definitivos del sitio (SCRUM-11)

  Como pasajero
  Quiero reconocer EcoRuta en la pestaña y en la pantalla de inicio de mi teléfono
  Para volver a abrirla sin buscarla

  Escenario: Título de la pestaña
    Dado que se abre el sitio
    Entonces la pestaña dice "EcoRuta — Bus eléctrico de Jalapa"
    Y el documento está en español
    Y hay una descripción con acentos correctos

  Escenario: Ícono en la pestaña
    Dado que se abre el sitio
    Entonces el navegador carga "/favicon.svg"
    Y el ícono usa solo los colores del sistema de diseño
    Y no queda el ícono por defecto de Vite

  Escenario: Ícono al instalar en Android
    Dado el manifest de la aplicación
    Entonces declara íconos PNG de 192 y 512 píxeles
    Y declara un ícono "maskable" de 512 píxeles
    Y cada tamaño declarado coincide con el tamaño real del archivo

  Escenario: Ícono al agregar en iOS
    Dado que se abre el sitio
    Entonces "index.html" enlaza "/apple-touch-icon.png" de 180 x 180 píxeles

  Escenario: Color de la barra del navegador
    Dado que se abre el sitio
    Entonces el color de tema es el verde Jumay "#10402a"
    Y coincide con el del manifest y con el token de "tema.css"
