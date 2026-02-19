import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';

interface LinkedInFormData {
  pixel_id: string;
  access_token: string;
  test_mode: boolean;
  test_event_code: string;
}

interface LinkedInConfigFormProps {
  data: LinkedInFormData;
  onChange: (data: LinkedInFormData) => void;
  hasExistingToken: boolean;
}

export function LinkedInConfigForm({ data, onChange, hasExistingToken }: LinkedInConfigFormProps) {
  const update = (field: keyof LinkedInFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="li-partner" className="text-foreground/80">
          Partner ID <span className="text-red-400">*</span>
        </Label>
        <Input
          id="li-partner"
          value={data.pixel_id}
          onChange={(e) => update('pixel_id', e.target.value)}
          placeholder="Ej: 1234567"
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          Partner ID de LinkedIn. Lo encuentras en Campaign Manager → Account Assets → Insight Tag.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="li-token" className="text-foreground/80">
          Access Token <span className="text-red-400">*</span>
        </Label>
        <Input
          id="li-token"
          type="password"
          value={data.access_token}
          onChange={(e) => update('access_token', e.target.value)}
          placeholder={hasExistingToken ? 'Dejar vacío para mantener el actual' : 'OAuth2 Access Token'}
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          Token OAuth2 con scope r_conversions y rw_conversions. Requiere app en LinkedIn Developer Portal.
        </p>
      </div>

      <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-300">
            <p className="font-medium">LinkedIn CAPI (Beta)</p>
            <p className="text-sky-400/80 mt-0.5">
              La API de conversiones de LinkedIn está en beta. KAE almacena las credenciales y validará
              la conexión. El envío de eventos se habilitará cuando la API esté en GA.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
        <div>
          <Label className="text-foreground/80">Modo Test</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Los eventos no se envían a producción de LinkedIn
          </p>
        </div>
        <Switch
          checked={data.test_mode}
          onCheckedChange={(v) => update('test_mode', v)}
        />
      </div>

      {data.test_mode && (
        <div className="space-y-1.5">
          <Label htmlFor="li-test-code" className="text-foreground/80">Test Event Code</Label>
          <Input
            id="li-test-code"
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
