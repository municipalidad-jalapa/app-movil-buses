# language: es
@SCRUM-26 @HU-146 @bloque-A @frontend
Característica: Opiniones del servicio

  Como pasajero
  quiero opinar sobre el servicio desde la aplicación
  para que la municipalidad sepa cómo funciona cada ruta

  @A2-criterio-1 @A2-criterio-5 @A2-criterio-6
  Escenario: Opinar desde la pantalla del pasajero sin cuenta y sin elegir la ruta
    Dado que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"
    Cuando abro "Opinar"
    Entonces veo la ruta "Ruta de ejemplo - Centro de Jalapa" como contexto, sin selector

  @A2-criterio-2 @A2-criterio-3 @A2-criterio-7
  Escenario: Enviar una calificación con estrellas y ver la confirmación
    Dado que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"
    Cuando abro "Opinar"
    Y elijo el tipo "Calificación" y 4 estrellas
    Y envío la opinión
    Entonces se envía una sola vez con 4 estrellas para la ruta 1
    Y veo "Gracias, recibimos tu opinión"

  @A2-criterio-4
  Escenario: El comentario muestra cuántos caracteres quedan
    Dado que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"
    Cuando abro "Opinar"
    Y escribo "Hola"
    Entonces veo "quedan 496 caracteres"

  @A2-criterio-8 @A2-criterio-9
  Escenario: Si el envío falla, el texto no se pierde y puedo reintentar
    Dado que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"
    Y que el envío va a fallar por la conexión
    Cuando abro "Opinar"
    Y elijo el tipo "Queja" y escribo "El bus no paró"
    Y envío la opinión
    Entonces veo el aviso "No pudimos enviar tu opinión."
    Y el texto "El bus no paró" sigue escrito
    Y puedo "Reintentar"

  @A3-criterio-1 @A3-criterio-5
  Escenario: El panel municipal lista las opiniones con su texto como texto plano
    Dado que tengo sesión de administrador
    Cuando abro las opiniones del panel municipal
    Entonces veo la opinión "<b>hola</b>" escrita tal cual, sin interpretarla
    Y veo "Opiniones del servicio"

  @A3-criterio-3
  Escenario: Marcar una opinión como atendida desde el panel
    Dado que tengo sesión de administrador
    Cuando abro las opiniones del panel municipal
    Y marco la opinión como atendida
    Entonces veo "Atendida por jefa"
