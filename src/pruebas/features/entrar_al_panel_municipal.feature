# language: es
@SCRUM-173 @HU-78 @frontend
Característica: Entrar al panel web municipal

  Como administrador municipal
  quiero entrar a un panel desde la computadora de la oficina
  para supervisar el servicio sin instalar nada

  @criterio-1 @criterio-2
  Escenario: Un administrador entra con su cuenta de la municipalidad
    Dado que estoy en el login del panel municipal
    Cuando entro con una cuenta de administrador
    Entonces veo el estado del servicio

  @criterio-1
  Escenario: Credenciales incorrectas
    Dado que estoy en el login del panel municipal
    Cuando entro con una contraseña incorrecta
    Entonces veo el aviso "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo."

  @criterio-4
  Escenario: Un conductor que intenta entrar ve acceso denegado
    Dado que estoy en el login del panel municipal
    Cuando entro con una cuenta de conductor
    Entonces veo "Esta cuenta no tiene permiso para el panel"
    Y puedo volver a intentar con otra cuenta

  @criterio-3
  Escenario: La sesión se cierra por inactividad tras avisar
    Dado que tengo una sesión de administrador que vence en 2 minutos
    Cuando no uso el panel durante 1 minuto y 5 segundos
    Entonces veo el aviso de que mi sesión se cerrará por inactividad
    Cuando sigo sin usar el panel hasta que vence
    Entonces vuelvo al login con el mensaje "Cerramos tu sesión por inactividad. Entra de nuevo para seguir."

  @criterio-6
  Escenario: El administrador ve todas las rutas, no una sola
    Dado que tengo una sesión de administrador que vence en 30 minutos
    Cuando abro el panel municipal
    Entonces la tabla muestra las 2 rutas del servicio con su estado
