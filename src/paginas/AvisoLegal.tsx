import { Link } from 'react-router-dom';
import './Legal.css';

export function AvisoLegal() {
  return (
    <article className="legal">
      <div className="legal__navegacion">
        <Link className="legal__volver" to="/">
          ← Volver al mapa
        </Link>
      </div>

      <header className="legal__cabecera">
        <p className="legal__eyebrow">EcoRuta</p>
        <h1>Aviso legal</h1>
      </header>

      <div className="legal__secciones">
        <section>
          <h2>Responsable del servicio</h2>

          <p>
            EcoRuta es un servicio de seguimiento del transporte público de la
            Municipalidad de Jalapa.
          </p>

          <p>
            El sistema fue desarrollado para la Municipalidad por estudiantes de
            la Universidad Mariano Gálvez, Centro Universitario de Jalapa.
          </p>
        </section>

        <section>
          <h2>Finalidad del sitio</h2>

          <p>
            EcoRuta permite consultar la ubicación del bus municipal en tiempo
            real, conocer información de sus rutas, reservar un lugar en una
            parada y recibir avisos relacionados con el servicio.
          </p>
        </section>

        <section>
          <h2>Uso del servicio</h2>

          <p>
            La aplicación del pasajero puede utilizarse desde el navegador sin
            necesidad de crear una cuenta.
          </p>

          <p>
            Algunas funciones pueden solicitar autorización para acceder a la
            ubicación del navegador o para enviar notificaciones. Estos permisos
            son gestionados por el usuario desde su navegador o dispositivo.
          </p>
        </section>

        <section>
          <h2>Información sobre los datos personales</h2>

          <p>
            La información sobre qué datos utiliza EcoRuta, para qué se utilizan,
            cómo se protegen y cómo ejercer sus derechos se encuentra en la
            Política de privacidad del servicio.
          </p>
        </section>

        <section>
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
