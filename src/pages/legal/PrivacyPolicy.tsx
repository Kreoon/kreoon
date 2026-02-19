import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Política de Privacidad</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Última actualización: 19 de febrero de 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
          <h2 className="text-xl font-semibold mt-8">1. Introducción</h2>
          <p>
            Kreoon ("nosotros", "nuestro" o "la Plataforma") se compromete a proteger la privacidad de sus usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y compartimos su información personal cuando utiliza nuestra plataforma en <strong>kreoon.com</strong> y servicios relacionados.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Información que recopilamos</h2>

          <h3 className="text-lg font-medium mt-6">2.1 Información proporcionada por usted</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre, correo electrónico y datos de perfil al registrarse</li>
            <li>Información de su organización (nombre, logotipo, configuración)</li>
            <li>Contenido que crea, sube o gestiona en la plataforma (textos, imágenes, videos)</li>
            <li>Información de pago procesada a través de Stripe (no almacenamos datos de tarjeta)</li>
          </ul>

          <h3 className="text-lg font-medium mt-6">2.2 Información de redes sociales</h3>
          <p>
            Cuando conecta sus cuentas de redes sociales (Instagram, Facebook, TikTok, YouTube, Twitter/X, LinkedIn, Pinterest), recopilamos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Identificador de usuario y nombre de la plataforma</li>
            <li>Foto de perfil y nombre de usuario público</li>
            <li>Tokens de acceso (encriptados) para publicar en su nombre</li>
            <li>Información de páginas de negocio y cuentas de Instagram Business vinculadas</li>
            <li>Métricas públicas de engagement (likes, comentarios, vistas)</li>
          </ul>
          <p>
            <strong>No accedemos</strong> a mensajes directos, listas de amigos privadas ni información de otros usuarios que no hayan autorizado el acceso.
          </p>

          <h3 className="text-lg font-medium mt-6">2.3 Información recopilada automáticamente</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dirección IP, tipo de navegador y sistema operativo</li>
            <li>Páginas visitadas y acciones realizadas en la plataforma</li>
            <li>Parámetros UTM y click IDs de campañas publicitarias (fbclid, gclid, ttclid)</li>
            <li>Identificadores anónimos para analítica (cookies de sesión)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">3. Cómo utilizamos su información</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Proporcionar y mejorar nuestros servicios de gestión de contenido y redes sociales</li>
            <li>Publicar contenido en sus redes sociales según sus instrucciones</li>
            <li>Mostrar métricas y analíticas de sus cuentas conectadas</li>
            <li>Gestionar su suscripción, facturación y pagos</li>
            <li>Enviar notificaciones sobre el estado de sus contenidos y cuenta</li>
            <li>Mejorar la plataforma mediante analítica agregada y anónima</li>
            <li>Prevenir fraude y garantizar la seguridad de la plataforma</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">4. Compartición de datos</h2>
          <p>No vendemos ni alquilamos su información personal. Compartimos datos únicamente con:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Proveedores de servicios</strong>: Supabase (base de datos y autenticación), Bunny CDN (almacenamiento de archivos), Stripe (pagos), y proveedores de IA (procesamiento de contenido)</li>
            <li><strong>Plataformas de redes sociales</strong>: Para publicar contenido y obtener métricas según lo autorizado por usted</li>
            <li><strong>Miembros de su organización</strong>: Otros miembros de su equipo pueden ver contenido compartido dentro de la organización</li>
            <li><strong>Autoridades legales</strong>: Cuando sea requerido por ley o para proteger nuestros derechos</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">5. Almacenamiento y seguridad</h2>
          <p>
            Sus datos se almacenan en servidores seguros proporcionados por Supabase (infraestructura AWS). Los tokens de acceso a redes sociales se almacenan encriptados. Implementamos medidas de seguridad estándar de la industria, incluyendo:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encriptación en tránsito (HTTPS/TLS)</li>
            <li>Row Level Security (RLS) para aislamiento de datos entre organizaciones</li>
            <li>Autenticación JWT con verificación por función</li>
            <li>Tokens de redes sociales encriptados en reposo</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">6. Retención de datos</h2>
          <p>
            Conservamos su información mientras mantenga una cuenta activa. Cuando elimina su cuenta o solicita la eliminación de datos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Los tokens de redes sociales se revocan y eliminan inmediatamente</li>
            <li>Los datos personales se eliminan dentro de 30 días</li>
            <li>Los datos anonimizados de analítica pueden conservarse con fines estadísticos</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">7. Sus derechos</h2>
          <p>Usted tiene derecho a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Acceder</strong> a sus datos personales</li>
            <li><strong>Rectificar</strong> información incorrecta</li>
            <li><strong>Eliminar</strong> sus datos (ver nuestra <Link to="/data-deletion" className="text-primary hover:underline">página de eliminación de datos</Link>)</li>
            <li><strong>Desconectar</strong> redes sociales en cualquier momento desde Configuración</li>
            <li><strong>Exportar</strong> sus datos en formato legible</li>
            <li><strong>Retirar</strong> su consentimiento para el procesamiento de datos</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">8. Cookies</h2>
          <p>
            Utilizamos cookies esenciales para el funcionamiento de la plataforma (autenticación, preferencias de sesión). No utilizamos cookies de seguimiento de terceros con fines publicitarios.
          </p>

          <h2 className="text-xl font-semibold mt-8">9. Menores de edad</h2>
          <p>
            Kreoon no está dirigido a personas menores de 18 años. No recopilamos intencionalmente información de menores. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos inmediatamente.
          </p>

          <h2 className="text-xl font-semibold mt-8">10. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Le notificaremos sobre cambios significativos a través de la plataforma o por correo electrónico. El uso continuado de Kreoon después de los cambios constituye su aceptación de la política actualizada.
          </p>

          <h2 className="text-xl font-semibold mt-8">11. Contacto</h2>
          <p>
            Para preguntas sobre esta política o para ejercer sus derechos de privacidad, contáctenos en:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email: <strong>privacy@kreoon.com</strong></li>
            <li>A través de la plataforma en Configuración &gt; Soporte</li>
          </ul>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Términos de Servicio</Link>
          <Link to="/data-deletion" className="hover:text-foreground transition-colors">Eliminación de Datos</Link>
        </div>
      </div>
    </div>
  );
}
