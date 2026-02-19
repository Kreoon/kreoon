import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Términos de Servicio</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Última actualización: 19 de febrero de 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
          <h2 className="text-xl font-semibold mt-8">1. Aceptación de los términos</h2>
          <p>
            Al acceder y utilizar Kreoon ("la Plataforma"), usted acepta estos Términos de Servicio. Si no está de acuerdo con estos términos, no utilice la plataforma. Kreoon se reserva el derecho de modificar estos términos en cualquier momento, notificándole los cambios significativos.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Descripción del servicio</h2>
          <p>
            Kreoon es una plataforma de gestión de operaciones creativas que ofrece:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestión de contenido y flujos de trabajo de creación</li>
            <li>Conexión y publicación en redes sociales (Instagram, Facebook, TikTok, YouTube, Twitter/X, LinkedIn, Pinterest)</li>
            <li>Gestión de equipos, clientes y talento</li>
            <li>Herramientas de inteligencia artificial para creación de contenido</li>
            <li>Analítica y métricas de rendimiento</li>
            <li>Marketplace de creadores de contenido</li>
            <li>Sistema de billetera y transacciones financieras</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">3. Registro y cuentas</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Debe tener al menos 18 años para usar la plataforma</li>
            <li>Debe proporcionar información veraz y mantenerla actualizada</li>
            <li>Es responsable de la seguridad de su cuenta y contraseña</li>
            <li>Debe notificarnos inmediatamente sobre cualquier uso no autorizado</li>
            <li>Una cuenta corresponde a una persona; no se permiten cuentas compartidas</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">4. Uso aceptable</h2>
          <p>Al usar Kreoon, usted se compromete a no:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Violar leyes aplicables o derechos de terceros</li>
            <li>Publicar contenido ilegal, difamatorio, obsceno o que promueva la violencia</li>
            <li>Intentar acceder a cuentas o datos de otros usuarios sin autorización</li>
            <li>Usar la plataforma para enviar spam o comunicaciones no solicitadas</li>
            <li>Interferir con el funcionamiento normal de la plataforma</li>
            <li>Realizar ingeniería inversa o intentar extraer el código fuente</li>
            <li>Usar herramientas automatizadas (bots, scrapers) sin autorización previa</li>
            <li>Violar los términos de servicio de las redes sociales conectadas</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">5. Contenido del usuario</h2>
          <p>
            Usted mantiene todos los derechos de propiedad intelectual sobre el contenido que crea y sube a Kreoon. Al utilizar la plataforma, nos otorga una licencia limitada y no exclusiva para:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Almacenar y procesar su contenido para proporcionar el servicio</li>
            <li>Publicar contenido en las redes sociales que usted haya autorizado</li>
            <li>Generar vistas previas y miniaturas de su contenido</li>
          </ul>
          <p>
            Esta licencia termina cuando elimina su contenido o cierra su cuenta.
          </p>

          <h2 className="text-xl font-semibold mt-8">6. Conexión de redes sociales</h2>
          <p>
            Al conectar sus cuentas de redes sociales a Kreoon:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nos autoriza a acceder a su cuenta según los permisos solicitados</li>
            <li>Es responsable de cumplir con los términos de cada red social</li>
            <li>Puede desconectar cualquier red social en cualquier momento</li>
            <li>Kreoon no es responsable por acciones realizadas por las plataformas de redes sociales</li>
            <li>Los tokens de acceso se almacenan de forma segura y se revocan al desconectar</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">7. Planes y pagos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Kreoon ofrece planes gratuitos y de pago con diferentes funcionalidades</li>
            <li>Los pagos se procesan a través de Stripe de forma segura</li>
            <li>Las suscripciones se renuevan automáticamente a menos que se cancelen</li>
            <li>Puede cancelar su suscripción en cualquier momento desde Configuración</li>
            <li>No se realizan reembolsos por periodos parciales de uso</li>
            <li>Los precios pueden cambiar con previo aviso de 30 días</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">8. Marketplace y transacciones</h2>
          <p>
            El Marketplace de Kreoon conecta marcas con creadores de contenido:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Kreoon actúa como intermediario y cobra una comisión por transacciones</li>
            <li>Los pagos se mantienen en escrow hasta la entrega satisfactoria del trabajo</li>
            <li>Las disputas se resuelven según nuestro proceso de arbitraje</li>
            <li>Los creadores son contratistas independientes, no empleados de Kreoon</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">9. Inteligencia artificial</h2>
          <p>
            Kreoon utiliza servicios de IA de terceros para funciones como generación de guiones, análisis de contenido y recomendaciones:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>El contenido generado por IA es una sugerencia; usted es responsable de revisarlo antes de publicar</li>
            <li>No garantizamos la precisión o originalidad del contenido generado por IA</li>
            <li>El uso de tokens de IA está sujeto a los límites de su plan</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">10. Limitación de responsabilidad</h2>
          <p>
            Kreoon se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio sea ininterrumpido o libre de errores. En la medida permitida por la ley:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No somos responsables por pérdidas indirectas, incidentales o consecuentes</li>
            <li>No somos responsables por acciones de las plataformas de redes sociales</li>
            <li>Nuestra responsabilidad máxima se limita al monto pagado por usted en los últimos 12 meses</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">11. Terminación</h2>
          <p>
            Podemos suspender o terminar su cuenta si viola estos términos. Usted puede cerrar su cuenta en cualquier momento. Al cerrar su cuenta:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Se desconectarán todas las redes sociales vinculadas</li>
            <li>Se cancelará cualquier suscripción activa</li>
            <li>Sus datos se eliminarán según nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link></li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">12. Ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se resolverá ante los tribunales competentes de Medellín, Colombia.
          </p>

          <h2 className="text-xl font-semibold mt-8">13. Contacto</h2>
          <p>
            Para preguntas sobre estos términos, contáctenos en:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email: <strong>legal@kreoon.com</strong></li>
            <li>A través de la plataforma en Configuración &gt; Soporte</li>
          </ul>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
          <Link to="/data-deletion" className="hover:text-foreground transition-colors">Eliminación de Datos</Link>
        </div>
      </div>
    </div>
  );
}
