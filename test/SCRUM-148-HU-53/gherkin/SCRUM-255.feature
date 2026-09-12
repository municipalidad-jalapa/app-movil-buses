# language: es

Característica: Registro de la reserva (SCRUM-255)

  Escenario: Enviar correctamente la reserva
    Dado que el pasajero eligió la parada 3
    Y el sistema obtuvo su identificador de dispositivo
    Y el sistema obtuvo su ubicación
    Cuando presiona "Estoy esperando aquí"
    Entonces debe enviarse una petición POST a "/api/v1/reservas"
    Y debe enviarse el dispositivoId
    Y debe enviarse el paradaId
    Y debe enviarse la latitud
    Y debe enviarse la longitud

  Escenario: Reserva creada correctamente
    Dado que los datos enviados son válidos
    Cuando el backend acepta la solicitud
    Entonces la hoja debe mostrar "Ya avisamos que estás esperando"
    Y los minutos de aviso que le quedan a la reserva
