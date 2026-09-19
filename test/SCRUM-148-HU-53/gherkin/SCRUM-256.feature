# language: es

Característica: Manejo de una reserva ya activa (SCRUM-256)

  Escenario: Ya existe una reserva activa en este teléfono
    Dado que el pasajero ya avisó desde este teléfono
    Cuando intenta avisar nuevamente
    Y el backend responde con código 422 indicando reserva activa
    Entonces la hoja debe informar que no hace falta avisar de nuevo

  Escenario: Error 422 diferente a reserva duplicada
    Dado que el pasajero intenta avisar
    Cuando el backend responde con código 422 por otra regla de negocio
    Entonces la hoja debe mostrar el mensaje de esa regla
    Y no debe tratarlo como una reserva activa
