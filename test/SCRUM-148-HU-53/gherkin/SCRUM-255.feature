# language: es

Característica: Registrar la demanda del pasajero

  Como pasajero
  Quiero registrar que estoy esperando en una parada
  Para que el sistema conozca mi solicitud

  Escenario: Enviar correctamente el registro
    Dado que el pasajero se encuentra en la parada 3
    Y el sistema obtuvo su identificador de dispositivo
    Y el sistema obtuvo su ubicación
    Cuando el pasajero confirma el registro
    Entonces debe enviarse una petición POST a "/api/v1/reservas"
    Y debe enviarse el dispositivoId
    Y debe enviarse el paradaId
    Y debe enviarse la latitud
    Y debe enviarse la longitud

  Escenario: Registro creado correctamente
    Dado que los datos enviados son válidos
    Cuando el backend acepta la solicitud
    Entonces la pantalla debe mostrar "Ya estás anotado"