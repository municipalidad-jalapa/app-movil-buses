# language: es
@SCRUM-153 @HU-58 @frontend
Característica: Recibir el aviso del bus y confirmar si subí

  Como pasajero con una reserva activa
  quiero recibir el aviso en mi teléfono y poder responder si subí o no
  para no tener que estar pendiente de la pantalla y para que quede claro
  qué pasó con mi reserva

  # Los escenarios marcados @manual no se automatizan aquí: dependen de que
  # Firebase entregue un push de verdad, o de un navegador real. Su guion está
  # en docs/pruebas-manuales-HU-58.md. Se dejan escritos para que el criterio
  # no desaparezca solo porque ninguna herramienta lo alcanza.

  @criterio-1
  Escenario: Se explica para qué sirven los avisos antes de pedir el permiso
    Dado que el navegador todavía no sabe si el pasajero quiere avisos
    Cuando el pasajero llega a la invitación de avisos
    Entonces se le explica que le avisaremos cuando el bus venga para su parada
    Y el navegador no ha pedido el permiso todavía

  @criterio-2
  Escenario: Rechazar los avisos no rompe la reserva
    Dado que el navegador todavía no sabe si el pasajero quiere avisos
    Cuando el pasajero elige seguir sin dar permisos
    Entonces no se muestra ningún error
    Y la negativa queda recordada

  @criterio-2
  Escenario: No se vuelve a insistir en cada visita
    Dado que el pasajero ya rechazó los avisos antes
    Cuando el pasajero vuelve a la aplicación
    Entonces no se le ofrece activar los avisos

  @criterio-2
  Escenario: Que falle el registro del token no se le informa al pasajero
    Dado que el pasajero concede el permiso de avisos
    Pero el registro del token falla
    Entonces no se muestra ningún error
    # Su reserva ya está hecha: los avisos son un extra, no un requisito.

  @criterio-2
  Escenario: Sin Firebase configurado la aplicación sigue funcionando
    Dado que el entorno no tiene Firebase configurado
    Cuando el pasajero concede el permiso de avisos
    Entonces no se registra ningún token
    Y no se muestra ningún error

  @criterio-3 @manual
  Escenario: El aviso dice a qué parada se acerca el bus
    Dado que el pasajero tiene una reserva activa
    Cuando el bus se acerca a su parada
    Entonces le llega un aviso que nombra la parada

  @criterio-4
  Escenario: Al llegar el bus se pregunta si logró subir
    Dado que el pasajero tiene una reserva activa
    Cuando llega el aviso de que el bus llegó
    Entonces se le pregunta si logró subir
    Y puede responder "Sí subí" o "No subí"

  @criterio-4
  Escenario: Sin aviso no se pregunta nada
    Dado que el pasajero tiene una reserva activa
    Cuando todavía no llegó ningún aviso
    Entonces no se le pregunta si logró subir

  @criterio-5
  Escenario: Responder que sí cierra la reserva sin recargar
    Dado que el pasajero tiene una reserva activa
    Y llegó el aviso de que el bus llegó
    Cuando responde que sí subió
    Entonces la reserva queda en estado "ABORDO"
    Y la pantalla lo refleja sin recargar

  @criterio-5
  Escenario: Responder que no cancela la reserva sin recargar
    Dado que el pasajero tiene una reserva activa
    Y llegó el aviso de que el bus llegó
    Cuando responde que no subió
    Entonces la reserva queda en estado "CANCELADA"
    Y la pantalla lo refleja sin recargar

  @criterio-5
  Escenario: Si falla el envío la reserva no se pierde
    Dado que el pasajero tiene una reserva activa
    Y llegó el aviso de que el bus llegó
    Cuando responde que sí subió pero el envío falla
    Entonces se le avisa del problema
    Y todavía puede volver a responder

  @criterio-5
  Escenario: Responder desde la propia notificación no vuelve a preguntar
    Dado que el pasajero tiene una reserva activa
    Cuando responde que sí subió desde el botón del aviso
    Entonces la reserva queda en estado "ABORDO"
    Y no se le vuelve a preguntar

  @criterio-6 @manual
  Escenario: Tocar el aviso abre la aplicación en el mapa
    Dado que al pasajero le llegó un aviso del bus
    Cuando toca el aviso
    Entonces la aplicación se abre en la pantalla del mapa

  @criterio-7 @manual
  Escenario: Los avisos llegan con la pestaña cerrada
    Dado que el pasajero cerró la pestaña de la aplicación
    Cuando el servidor envía un aviso
    Entonces el aviso aparece igual en su teléfono

  @criterio-8
  Escenario: Ya no existe ningún aviso por juntar diez pasajeros
    Cuando se revisan los tipos de aviso que la aplicación entiende
    Entonces solo existen el de bus acercándose y el de confirmar abordaje
