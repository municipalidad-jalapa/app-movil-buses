# language: es

Característica: Identificar anónimamente el dispositivo

  Como sistema
  Quiero asignar un identificador al dispositivo del pasajero
  Para reconocer solicitudes posteriores del mismo dispositivo

  Escenario: Generar un identificador nuevo
    Dado que el dispositivo no tiene un identificador guardado
    Cuando se solicita el identificador
    Entonces debe generarse un UUID
    Y debe almacenarse en localStorage

  Escenario: Reutilizar un identificador existente
    Dado que el dispositivo ya tiene un identificador guardado
    Cuando se solicita nuevamente el identificador
    Entonces debe devolverse el mismo identificador
    Y no debe generarse uno nuevo