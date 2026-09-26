import { Link } from 'react-router-dom';
import './Legal.css';

export function Privacidad() {
  return (
    <article className="legal">
      <div className="legal__navegacion">
        <Link className="legal__volver" to="/">
          ← Volver al mapa
        </Link>
      </div>

      <header className="legal__cabecera">
        <p className="legal__eyebrow">EcoRuta</p>

        <h1>Política de privacidad</h1>

        <p className="legal__actualizacion">
          Última actualización: 21 de septiembre de 2026
        </p>
      </header>

      <nav
        className="legal__indice"
        aria-label="Contenido de la política de privacidad"
      >
        <h2>Contenido</h2>

        <div className="legal__indice-enlaces">
          <a href="#responsable">Responsable y alcance</a>
          <a href="#datos">Datos recopilados</a>
          <a href="#google">Inicio de sesión</a>
          <a href="#ubicacion">Ubicación</a>
          <a href="#notificaciones">Notificaciones</a>
          <a href="#finalidad">Uso de los datos</a>
          <a href="#navegador">Datos en el navegador</a>
          <a href="#compartidos">Datos compartidos</a>
          <a href="#conservacion">Conservación</a>
          <a href="#proteccion">Protección</a>
          <a href="#derechos">Sus derechos</a>
          <a href="#contacto">Contacto</a>
        </div>
      </nav>

      <div className="legal__secciones">
        <section id="responsable">
          <h2>Quién es responsable y a qué aplica esta política</h2>

          <p>
            Usted puede usar EcoRuta sin crear una cuenta y sin darnos su nombre.
            Esta política explica qué datos trata el servicio, para qué los usa y
            cómo puede ejercer sus derechos sobre ellos.
          </p>

          <p>
            La Municipalidad de Jalapa es la responsable de los datos personales
            que se tratan en EcoRuta, el servicio que muestra en tiempo real dónde
            va el bus municipal, permite reservar un lugar en la parada y avisa
            cuando el bus se acerca.
          </p>

          <p>
            El sistema fue desarrollado para la Municipalidad por estudiantes de
            la Universidad Mariano Gálvez, Centro Universitario de Jalapa.
          </p>

          <p>Esta política aplica a:</p>

          <ul>
            <li>La aplicación web del pasajero.</li>
            <li>El panel utilizado por el conductor.</li>
            <li>El panel municipal de supervisión.</li>
          </ul>
        </section>

        <section id="datos">
          <h2>Qué datos recopilamos</h2>

          <p>
            EcoRuta recopila lo mínimo necesario para que el servicio funcione.
            No solicita nombre, número de teléfono ni DPI para utilizar el
            servicio como invitado.
          </p>

          <h3>Identificador del navegador</h3>

          <p>
            La primera vez que abre la aplicación se genera un identificador
            aleatorio. Se utiliza para distinguir su reserva de las de otras
            personas y evitar reservas duplicadas desde el mismo navegador.
          </p>

          <h3>Ubicación del navegador</h3>

          <p>
            Se obtiene solamente cuando usted la autoriza al reservar o al buscar
            la parada más cercana.
          </p>

          <h3>Datos de la reserva</h3>

          <p>
            Se registra la parada, la hora de la reserva, su vencimiento,
            renovaciones, cancelaciones y si logró abordar el bus.
          </p>

          <h3>Notificaciones</h3>

          <p>
            Si acepta recibir avisos, el navegador genera un código de
            notificaciones que permite enviar los mensajes relacionados con su
            reserva.
          </p>

          <h3>Opiniones y calificaciones</h3>

          <p>
            Solo se obtienen cuando usted decide enviarlas y pueden incluir el
            tipo de opinión, texto, estrellas, ruta y bus.
          </p>
        </section>

        <section id="google">
          <h2>Inicio de sesión con Google</h2>

          <p>
            Iniciar sesión es opcional. Si lo hace, EcoRuta recibe de Google el
            identificador de su cuenta, su nombre y su correo electrónico. La
            contraseña de Google nunca pasa por EcoRuta.
          </p>
        </section>

        <section id="ubicacion">
          <h2>Uso de su ubicación</h2>

          <p>
            EcoRuta utiliza su ubicación únicamente cuando usted reserva un lugar
            en una parada o solicita buscar la parada más cercana. No realiza
            seguimiento continuo ni en segundo plano.
          </p>

          <p>
            Al reservar, la ubicación se utiliza una vez para comprobar que se
            encuentra cerca de la parada, aproximadamente a 150 metros o menos.
            Después de realizar la comprobación, la ubicación se descarta y no se
            guarda junto con la reserva.
          </p>

          <p>
            Para ver el mapa, seguir el bus en tiempo real o consultar información
            del recorrido no es necesario compartir su ubicación.
          </p>

          <p>
            Puede retirar este permiso en cualquier momento desde la configuración
            de su navegador.
          </p>
        </section>

        <section id="notificaciones">
          <h2>Notificaciones en su teléfono</h2>

          <p>
            Las notificaciones son opcionales. Si no las acepta, su reserva
            continuará funcionando normalmente.
          </p>

          <p>Si las acepta, EcoRuta puede enviar dos avisos por reserva:</p>

          <ul>
            <li>Cuando el bus se está acercando a su parada.</li>
            <li>
              Cuando el bus llega, para preguntarle si logró abordar.
            </li>
          </ul>

          <p>
            El código generado para las notificaciones se utiliza únicamente para
            los avisos de EcoRuta y no para publicidad.
          </p>

          <p>
            Puede desactivar las notificaciones desde la configuración del
            navegador o del teléfono.
          </p>
        </section>

        <section id="finalidad">
          <h2>Para qué usamos sus datos</h2>

          <ul>
            <li>Prestar el servicio de transporte municipal.</li>
            <li>Registrar lo ocurrido con cada reserva.</li>
            <li>
              Elaborar estadísticas de demanda por parada, día y horario.
            </li>
            <li>Mejorar el servicio.</li>
            <li>Evitar abusos y diagnosticar fallas.</li>
          </ul>

          <p>
            EcoRuta no utiliza sus datos para publicidad ni para crear perfiles
            comerciales.
          </p>
        </section>

        <section id="navegador">
          <h2>Datos guardados en el navegador</h2>

          <p>EcoRuta puede guardar:</p>

          <ul>
            <li>El identificador aleatorio del navegador.</li>
            <li>El estado de la reserva activa.</li>
            <li>La preferencia sobre notificaciones.</li>
            <li>La sesión, cuando corresponda.</li>
          </ul>

          <p>
            Si acepta notificaciones, el navegador también registra un service
            worker para poder recibir avisos aunque la pestaña esté cerrada.
          </p>
        </section>

        <section id="compartidos">
          <h2>Con quién se comparten los datos</h2>

          <p>
            La Municipalidad no vende, alquila ni cede los datos personales.
            EcoRuta utiliza servicios tecnológicos necesarios para funcionar.
          </p>

          <ul>
            <li>
              <strong>Microsoft Azure:</strong> alojamiento de servidores, base de
              datos y respaldos.
            </li>

            <li>
              <strong>Google Firebase:</strong> inicio de sesión y envío de
              notificaciones.
            </li>
          </ul>

          <p>
            El mapa utiliza datos de OpenStreetMap servidos desde la
            infraestructura del proyecto.
          </p>
        </section>

        <section id="conservacion">
          <h2>Conservación de los datos</h2>

          <p>
            Cuando una reserva vence, se cancela o el bus pasa por la parada, deja
            de estar activa. Su registro puede conservarse temporalmente para
            elaborar estadísticas del servicio.
          </p>
        </section>

        <section id="proteccion">
          <h2>Cómo se protegen sus datos</h2>

          <ul>
            <li>Las comunicaciones utilizan HTTPS.</li>
            <li>Los accesos están limitados según el rol de cada usuario.</li>
            <li>Las credenciales se almacenan fuera del código fuente.</li>
            <li>La base de datos cuenta con respaldos.</li>
          </ul>
        </section>

        <section id="derechos">
          <h2>Sus derechos</h2>

          <p>Puede solicitar:</p>

          <ul>
            <li>Conocer qué datos suyos tiene EcoRuta.</li>
            <li>Corregir o actualizar sus datos.</li>
            <li>Solicitar su eliminación.</li>
            <li>
              Retirar los permisos de ubicación o notificaciones cuando quiera.
            </li>
          </ul>
        </section>

        <section id="contacto">
          <h2>Contacto</h2>

          <address>
            <strong>
              Municipalidad de Jalapa — Unidad de Información Pública
            </strong>

            <br />
            6a. avenida 0-91, zona 1, Jalapa
            <br />
            Correo: udip@gobmunijalapa.gob.gt
            <br />
            Horario: lunes a viernes, de 8:00 a 16:00 horas
          </address>
        </section>
      </div>
    </article>
  );
}
