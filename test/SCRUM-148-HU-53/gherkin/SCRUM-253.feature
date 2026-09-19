# language: es

Característica: Obtener la ubicación del pasajero

  Como pasajero
  Quiero autorizar mi ubicación
  Para demostrar que estoy cerca de la parada

  Escenario: Usuario permite obtener la ubicación
    Dado que el pasajero aceptó continuar con el registro
    Cuando el navegador solicita permiso de ubicación
    Y el pasajero permite el acceso
    Entonces el sistema debe obtener la latitud
    Y debe obtener la longitud

  Escenario: Usuario niega el permiso de ubicación
    Dado que el navegador solicita permiso de ubicación
    Cuando el pasajero niega el permiso
    Entonces el sistema debe mostrar un mensaje claro
    Y no debe enviar el registro al backend

  Escenario: Navegador sin soporte para geolocalización
    Dado que el navegador no soporta geolocalización
    Cuando el pasajero intenta continuar
    Entonces el sistema debe informar que no puede obtener su ubicación