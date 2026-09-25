# language: es

Característica: Build de producción de la aplicación web

  Como equipo del proyecto
  Quiero un build de producción de la aplicación web empaquetado como imagen Docker
  Para poder desplegarla fuera del entorno de desarrollo

  # Parte de Desarrollo (Frontend): build optimizado de React con `npm run build`,
  # con ícono, título del sitio y pantalla de carga definitivos, y variables de
  # entorno apuntando al backend de producción (no a direcciones locales).
  #
  # Cada bloque se detalla en su propio .feature:
  #   01 build optimizado · 02 imagen Docker · 03 ícono y título ·
  #   04 pantalla de carga · 05 variables de producción

  Escenario: De extremo a extremo
    Dado que el equipo construye la imagen con las variables de producción
    Cuando el contenedor arranca
    Y una persona abre el sitio desde un teléfono
    Entonces ve la pantalla de carga de EcoRuta mientras baja la aplicación
    Y después ve el mapa
    Y la pestaña muestra el título y el ícono de EcoRuta
    Y la aplicación habla con el backend de producción, nunca con una dirección local
