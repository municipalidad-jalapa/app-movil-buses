# language: es

Característica: Pantalla para registrar que el pasajero espera el bus

  Como pasajero
  Quiero indicar que estoy esperando el bus
  Para informar al sistema que debe considerarme en la parada

  Escenario: Mostrar la pantalla de registro
    Dado que el pasajero ingresa a la ruta "/registro/3"
    Cuando la pantalla termina de cargar
    Entonces debe mostrarse el mensaje "¿Estás esperando el bus?"
    Y debe mostrarse el botón "Estoy esperando el bus"

  Escenario: Iniciar el proceso de registro
    Dado que el pasajero se encuentra en la pantalla de registro
    Cuando presiona el botón "Estoy esperando el bus"
    Entonces debe mostrarse la explicación del uso de la ubicación