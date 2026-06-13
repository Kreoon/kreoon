import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TemplateRow {
  id: string;
  event_type: string;
  template_name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  is_active: boolean;
  template_id: string;
}

// Lista de event_types académicos (los demás son del módulo content/marketing y
// no aplican a CRION Academy — se filtran para no contaminar el panel).
const ACADEMY_EVENT_TYPES = new Set([
  'welcome_to_space',
  'lesson_unlocked',
  'academy_event_reminder_24h',
  'badge_earned',
  'level_up',
  'cohort_starting',
  'checkpoint_due',
  'certificate_ready',
  'cart_abandoned',
  'upsell_offer',
]);

interface Props {
  accentColor?: string;
}

export function WhatsAppTemplatesPanel({ accentColor = '#8B5CF6' }: Props) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-academy-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_notification_templates')
        .select('id, event_type, template_name, category, language, is_active, template_id')
        .order('event_type');
      if (error) throw error;
      return (data ?? []).filter((t) => ACADEMY_EVENT_TYPES.has(t.event_type)) as TemplateRow[];
    },
  });

  if (isLoading) {
    return <div className="text-zinc-500 text-sm p-4">Cargando templates…</div>;
  }

  const activeCount = templates?.filter((t) => t.is_active).length ?? 0;
  const totalCount = templates?.length ?? 0;

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" style={{ color: accentColor }} />
              Templates de WhatsApp
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Cada evento del bus (welcome, badge, level up, etc.) envía un template aprobado por Meta.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-white/10 text-zinc-300"
            style={{ borderColor: activeCount === totalCount ? '#22c55e44' : '#f59e0b44' }}
          >
            {activeCount} / {totalCount} activos
          </Badge>
        </div>

        {activeCount < totalCount && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Algunos templates no están activos. Para activarlos:
              <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                <li>Registra la plantilla en Meta Business Manager (esperar ≈24h de aprobación).</li>
                <li>Conéctala a Botcake (sync).</li>
                <li>
                  En la base de datos:{' '}
                  <code className="text-amber-100">
                    UPDATE whatsapp_notification_templates SET template_id='&lt;botcake_id&gt;', is_active=true WHERE event_type='&lt;event&gt;';
                  </code>
                </li>
              </ol>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {templates?.map((t) => (
          <Card key={t.id} className="bg-white/5 border-white/10 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-300 truncate">{t.event_type}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-white/10 text-zinc-400"
                >
                  {t.category}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] border-white/10 text-zinc-400 uppercase"
                >
                  {t.language}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-1 truncate">{t.template_name}</p>
            </div>
            {t.is_active ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs shrink-0">
                <CheckCircle2 className="h-4 w-4" /> Activo
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs shrink-0">
                <AlertCircle className="h-4 w-4" /> Pendiente
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
