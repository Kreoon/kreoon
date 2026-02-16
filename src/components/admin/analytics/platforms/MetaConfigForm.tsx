import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface MetaFormData {
  pixel_id: string;
  access_token: string;
  dataset_id: string;
  test_mode: boolean;
  test_event_code: string;
}

interface MetaConfigFormProps {
  data: MetaFormData;
  onChange: (data: MetaFormData) => void;
  hasExistingToken: boolean;
}

export function MetaConfigForm({ data, onChange, hasExistingToken }: MetaConfigFormProps) {
  const update = (field: keyof MetaFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="meta-pixel" className="text-gray-300">
          Pixel ID <span className="text-red-400">*</span>
        </Label>
        <Input
          id="meta-pixel"
          value={data.pixel_id}
          onChange={(e) => update('pixel_id', e.target.value)}
          placeholder="Ej: 123456789012345"
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          El ID numérico de tu Pixel de Facebook. Lo encuentras en Events Manager.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-token" className="text-gray-300">
          Access Token <span className="text-red-400">*</span>
        </Label>
        <Input
          id="meta-token"
          type="password"
          value={data.access_token}
          onChange={(e) => update('access_token', e.target.value)}
          placeholder={hasExistingToken ? 'Dejar vacío para mantener el actual' : 'Token de acceso del sistema'}
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          System User Token con permisos de Conversions API. Genéralo en Business Settings → System Users.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-dataset" className="text-gray-300">Dataset ID</Label>
        <Input
          id="meta-dataset"
          value={data.dataset_id}
          onChange={(e) => update('dataset_id', e.target.value)}
          placeholder="Opcional para CAPI Gateway"
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          Solo necesario si usas Conversions API Gateway. Déjalo vacío para CAPI estándar.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
        <div>
          <Label className="text-gray-300">Modo Test</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Los eventos se envían con test_event_code y aparecen en Test Events de Meta
          </p>
        </div>
        <Switch
          checked={data.test_mode}
          onCheckedChange={(v) => update('test_mode', v)}
        />
      </div>

      {data.test_mode && (
        <div className="space-y-1.5">
          <Label htmlFor="meta-test-code" className="text-gray-300">Test Event Code</Label>
          <Input
            id="meta-test-code"
            value={data.test_event_code}
            onChange={(e) => update('test_event_code', e.target.value)}
            placeholder="Ej: TEST12345"
            className="bg-gray-900/50 border-gray-700"
          />
          <p className="text-xs text-gray-500">
            Código de Events Manager → Test Events. Los eventos con este código no afectan campañas.
          </p>
        </div>
      )}
    </div>
  );
}
