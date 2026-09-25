# language: es
@SCRUM-172 @HU-77 @frontend
Característica: Cancelar mi registro
  Como pasajero que ya no va a viajar
  quiero quitar mi aviso de la parada
  para que el conteo represente a quienes realmente están esperando

  Escenario: Cancelar mi aviso activo con un toque
    Dado que tengo una reserva activa guardada en este dispositivo
    Cuando toco el botón "Ya no voy a esperar"
    Entonces se solicita cancelar esa reserva con la identidad de mi dispositivo
    Y regreso a la selección de parada
    Y se solicita actualizar el conteo

  Escenario: No presentar como cancelada una reserva ya abordada
    Dado que tengo una reserva activa en la aplicación
    Y el servidor informa que ya fue marcada como abordada
    Cuando intento cancelar mi registro
    Entonces la aplicación no elimina mi reserva como si la cancelación hubiera funcionado
    Y muestra un mensaje entendible

  Escenario: Conservar mi reserva si no hay conexión
    Dado que tengo una reserva activa guardada
    Y el servidor no puede ser alcanzado
    Cuando intento cancelar mi registro
    Entonces mi reserva continúa guardada
    Y puedo intentar nuevamente

  Escenario: Actualizar el conteo después de cancelar
    Dado que el conteo incluye mi reserva activa
    Cuando cancelo correctamente mi registro
    Entonces la aplicación solicita inmediatamente un resumen actualizado
