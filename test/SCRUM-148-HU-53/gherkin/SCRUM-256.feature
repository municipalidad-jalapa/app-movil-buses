# language: es

Característica: Evitar registros duplicados en una parada

  Como pasajero
  Quiero conocer si ya tengo un registro activo
  Para evitar registrar dos veces la misma solicitud

  Escenario: Ya existe un registro activo
    Dado que el pasajero ya posee un registro activo en la parada
    Cuando intenta registrarse nuevamente
    Y el backend responde con código 422 indicando registro activo
    Entonces la pantalla debe mostrar "Ya estás anotado"
    Y debe informar que no es necesario registrarse nuevamente

  Escenario: Error 422 diferente a registro duplicado
    Dado que el pasajero intenta registrarse
    Cuando el backend responde con código 422 por otra regla de negocio
    Entonces el sistema debe mostrar el mensaje de error correspondiente
    Y no debe tratarlo como un registro activo