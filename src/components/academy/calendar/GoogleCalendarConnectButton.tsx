import { useState } from 'react';
import { Calendar as CalendarIcon, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useGoogleCalendarConnection,
  useConnectGoogleCalendar,
} from '@/hooks/academy/useAcademyCalendar';

interface GoogleCalendarConnectButtonProps {
  spaceId: string;
  isOwner: boolean;
  accentColor?: string;
}

export function GoogleCalendarConnectButton({
  spaceId,
  isOwner,
  accentColor = '#8B5CF6',
}: GoogleCalendarConnectButtonProps) {
  const { data: connection, isLoading } = useGoogleCalendarConnection(spaceId);
  const connect = useConnectGoogleCalendar();
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  async function handleConnect() {
    setError(null);
    try {
      await connect.mutateAsync(spaceId);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo iniciar la conexión con Google Calendar');
    }
  }

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}25` }}
        >
          <CalendarIcon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Google Calendar</h3>
          {isLoading ? (
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando estado...
            </p>
          ) : connection?.is_active ? (
            <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
              <Check className="h-3 w-3" /> Conectado · sincroniza eventos automáticamente
            </p>
          ) : (
            <p className="text-xs text-zinc-500 mt-1">
              Conecta tu Google Calendar para que los eventos se creen allí y se inviten miembros.
            </p>
          )}
          {error && (
            <p className="text-xs text-rose-400 mt-1">{error}</p>
          )}
        </div>
        {!connection?.is_active && (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={connect.isPending}
            className="text-white"
            style={{ backgroundColor: accentColor }}
          >
            {connect.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Conectar
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
