# language: es

Característica: Criterio 2 - El panel se acota a la ruta del conductor

  Como conductor
  Quiero ver solamente mi propia ruta
  Para no confundirme con paradas o reservas de otra ruta

  Escenario: No hay selector de ruta en el panel
    Dado que el conductor abre su panel
    Entonces no existe ningún control para elegir otra ruta

  Escenario: La ruta consultada es siempre la de la sesión
    Dado que el conductor autenticado tiene asignada la ruta "Ruta Centro"
    Cuando el panel pide el ETA y las reservas activas
    Entonces la petición usa el identificador de "Ruta Centro"
    Y nunca un identificador escrito a mano ni elegido por el conductor

  Escenario: Las paradas de otra ruta no aparecen
    Dado que existe una "Ruta Norte" con paradas propias
    Cuando el conductor de "Ruta Centro" abre su panel
    Entonces no ve ninguna parada de "Ruta Norte"
    Y no ve ninguna reserva de "Ruta Norte"

  Escenario: El backend rechaza una ruta ajena
    Dado que el conductor autenticado no está asignado a la ruta consultada
    Cuando se pide GET /api/v1/rutas/{rutaId}/eta con su JWT
    Entonces el backend responde 403
