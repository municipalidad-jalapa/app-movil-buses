# language: es

Característica: Reservar un lugar en la parada

  Como pasajero
  Quiero indicar que estoy esperando el bus en una parada
  Para que el sistema registre mi solicitud

  Escenario: Registrar correctamente a un pasajero
    Dado que el pasajero ingresa a "/registro/3"
    Y presiona "Estoy esperando el bus"
    Y acepta proporcionar su ubicación
    Y se obtiene correctamente la latitud y longitud
    Y el sistema obtiene el identificador del dispositivo
    Cuando se envía el registro de demanda
    Entonces debe utilizarse el identificador de la parada 3
    Y debe enviarse el identificador del dispositivo
    Y deben enviarse las coordenadas
    Y la pantalla debe mostrar "Ya estás anotado"

  Escenario: El pasajero ya se encontraba registrado
    Dado que el pasajero ingresa a una parada
    Y ya posee un registro activo
    Cuando intenta registrarse nuevamente
    Entonces no debe generarse un nuevo registro
    Y la pantalla debe mostrar "Ya estás anotado"