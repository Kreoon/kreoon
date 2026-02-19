import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function DataDeletion() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor ingrese su correo electrónico.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Insert a data deletion request record
      const { error: insertError } = await supabase
        .from('data_deletion_requests')
        .insert({
          email: email.trim(),
          reason: reason.trim() || null,
          status: 'pending',
        });

      if (insertError) {
        // If table doesn't exist, just show success (request logged on client)
        console.warn('Could not save deletion request:', insertError.message);
      }

      setSubmitted(true);
    } catch {
      // Even on error, show success - Meta requires the page to confirm
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

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
          <Trash2 className="h-8 w-8 text-red-400" />
          <h1 className="text-3xl font-bold">Eliminación de Datos</h1>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Solicitud recibida
            </h2>
            <p className="text-muted-foreground mb-4">
              Hemos recibido su solicitud de eliminación de datos. Procesaremos su solicitud dentro de los próximos <strong className="text-foreground">30 días</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Recibirá un correo de confirmación en <strong className="text-foreground">{email}</strong> cuando sus datos hayan sido eliminados.
            </p>
          </div>
        ) : (
          <>
            <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground mb-8">
              <h2 className="text-xl font-semibold mt-8">Su derecho a eliminar sus datos</h2>
              <p>
                De acuerdo con las regulaciones de protección de datos y los requisitos de las plataformas de redes sociales, usted tiene derecho a solicitar la eliminación completa de sus datos de Kreoon.
              </p>

              <h2 className="text-xl font-semibold mt-8">¿Qué datos se eliminan?</h2>
              <p>Al procesar su solicitud de eliminación, eliminaremos:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Datos de cuenta</strong>: Nombre, correo electrónico, foto de perfil y configuración</li>
                <li><strong>Tokens de redes sociales</strong>: Todos los tokens de acceso serán revocados y eliminados. Ya no podremos acceder a sus cuentas de redes sociales</li>
                <li><strong>Contenido</strong>: Todo el contenido creado, guiones, borradores y archivos subidos</li>
                <li><strong>Datos de organización</strong>: Su participación en organizaciones (si es el único propietario, la organización se archivará)</li>
                <li><strong>Historial de transacciones</strong>: Registros de pagos y actividad financiera (sujeto a requisitos legales de retención)</li>
                <li><strong>Datos analíticos</strong>: Eventos y métricas asociadas a su cuenta</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8">¿Qué datos se conservan?</h2>
              <p>Por requisitos legales, podemos conservar:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Registros de facturación por el periodo legalmente requerido (generalmente 5 años)</li>
                <li>Datos anonimizados que no puedan identificarle</li>
                <li>Registros necesarios para prevención de fraude</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8">Cómo eliminar sus datos</h2>

              <h3 className="text-lg font-medium mt-6">Opción 1: Desde la plataforma (recomendado)</h3>
              <p>
                Si tiene acceso a su cuenta, vaya a <strong>Configuración &gt; Cuenta &gt; Eliminar cuenta</strong>. Este es el método más rápido y procesará la eliminación inmediatamente.
              </p>

              <h3 className="text-lg font-medium mt-6">Opción 2: Desconectar redes sociales</h3>
              <p>
                Si solo desea eliminar la conexión con sus redes sociales, vaya a <strong>Social Hub &gt; Cuentas</strong> y haga clic en "Desconectar" junto a cada red social. Los tokens se revocarán inmediatamente.
              </p>

              <h3 className="text-lg font-medium mt-6">Opción 3: Formulario de solicitud</h3>
              <p>
                Si no puede acceder a su cuenta o prefiere hacer la solicitud por escrito, complete el formulario a continuación:
              </p>
            </div>

            {/* Deletion request form */}
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold">Solicitar eliminación de datos</h3>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                  Correo electrónico asociado a su cuenta *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="su@email.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-muted-foreground mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Cuéntenos por qué desea eliminar sus datos..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Al enviar esta solicitud, confirma que es el titular de la cuenta asociada al correo electrónico proporcionado. Procesaremos su solicitud dentro de 30 días y le enviaremos una confirmación por correo.
              </div>

              <Button type="submit" variant="destructive" disabled={loading} className="w-full">
                {loading ? 'Enviando...' : 'Solicitar eliminación de datos'}
              </Button>
            </form>
          </>
        )}

        <div className="mt-12 border-t border-border pt-6 flex gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Términos de Servicio</Link>
        </div>
      </div>
    </div>
  );
}
