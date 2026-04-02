import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';

interface GoogleFormData {
  pixel_id: string;
  access_token: string;
  test_mode: boolean;
  test_event_code: string;
}

interface GoogleConfigFormProps {
  data: GoogleFormData;
  onChange: (data: GoogleFormData) => void;
  hasExistingToken: boolean;
}

export function GoogleConfigForm({ data, onChange, hasExistingToken }: GoogleConfigFormProps) {
  const update = (field: keyof GoogleFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  const isValidFormat = !data.pixel_id || /^AW-\d+$/.test(data.pixel_id);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="g-conversion" className="text-foreground/80">
          Conversion ID <span className="text-red-400">*</span>
        </Label>
        <Input
          id="g-conversion"
          value={data.pixel_id}
          onChange={(e) => update('pixel_id', e.target.value)}
          placeholder="Ej: AW-123456789"
          className={`bg-gray-900/50 border-gray-700 ${!isValidFormat ? 'border-red-500/50' : ''}`}
        />
        {!isValidFormat && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            El formato esperado es AW-XXXXXXXXX
          </div>
        )}
        <p className="text-xs text-gray-500">
          Conversion ID de Google Ads. Lo encuentras en Tools → Conversions → Conversion action details.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="g-token" className="text-foreground/80">
          Conversion Label / API Secret <span className="text-red-400">*</span>
        </Label>
        <Input
          id="g-token"
          type="password"
          value={data.access_token}
          onChange={(e) => update('access_token', e.target.value)}
          placeholder={hasExistingToken ? 'Dejar vacío para mantener el actual' : 'Conversion label o API secret'}
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          El Conversion Label de la acción de conversión. Necesario para Enhanced Conversions.
        </p>
      </div>

      <div className="rounded-sm bg-amber-500/10 border border-amber-500/20 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300">
            <p className="font-medium">Google Enhanced Conversions</p>
            <p className="text-amber-400/80 mt-0.5">
              La integración completa con OAuth2 está en desarrollo. Por ahora, KAE valida el formato del Conversion ID
              y almacena las credenciales para uso futuro.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-sm bg-gray-800/30 border border-gray-700/30">
        <div>
          <Label className="text-foreground/80">Modo Test</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Los eventos no se envían a Google hasta que OAuth2 esté configurado
          </p>
        </div>
        <Switch
          checked={data.test_mode}
          onCheckedChange={(v) => update('test_mode', v)}
        />
      </div>

      {data.test_mode && (
        <div className="space-y-1.5">
          <Label htmlFor="g-test-code" className="text-foreground/80">Test Event Code</Label>
          <Input
            id="g-test-code"
            value={data.test_event_code}
            onChange={(e) => update('test_event_code', e.target.value)}
            placeholder="Opcional"
            className="bg-gray-900/50 border-gray-700"
          />
        </div>
      )}
    </div>
  );
}
