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
        <Label htmlFor="meta-pixel" className="text-foreground/80">
          Pixel ID <span className="text-red-400">*</span>
        </Label>
        <Input
          id="meta-pixel"
          value={data.pixel_id}
          onChange={(e) => update('pixel_id', e.target.value)}
          placeholder="Ej: 123456789012345"
          className="bg-card/50 border-border"
        />
        <p className="text-xs text-muted-foreground">
          El ID numérico de tu Pixel de Facebook. Lo encuentras en Events Manager.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-token" className="text-foreground/80">
          Access Token <span className="text-red-400">*</span>
        </Label>
        <Input
          id="meta-token"
          type="password"
          value={data.access_token}
          onChange={(e) => update('access_token', e.target.value)}
          placeholder={hasExistingToken ? 'Dejar vacío para mantener el actual' : 'Token de acceso del sistema'}
          className="bg-card/50 border-border"
        />
        <p className="text-xs text-muted-foreground">
          System User Token con permisos de Conversions API. Genéralo en Business Settings → System Users.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-dataset" className="text-foreground/80">Dataset ID</Label>
        <Input
          id="meta-dataset"
          value={data.dataset_id}
          onChange={(e) => update('dataset_id', e.target.value)}
          placeholder="Opcional para CAPI Gateway"
          className="bg-card/50 border-border"
        />
        <p className="text-xs text-muted-foreground">
          Solo necesario si usas Conversions API Gateway. Déjalo vacío para CAPI estándar.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-sm bg-card/30 border border-border">
        <div>
          <Label className="text-foreground/80">Modo Test</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
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
          <Label htmlFor="meta-test-code" className="text-foreground/80">Test Event Code</Label>
          <Input
            id="meta-test-code"
            value={data.test_event_code}
            onChange={(e) => update('test_event_code', e.target.value)}
            placeholder="Ej: TEST12345"
            className="bg-card/50 border-border"
          />
          <p className="text-xs text-muted-foreground">
            Código de Events Manager → Test Events. Los eventos con este código no afectan campañas.
          </p>
        </div>
      )}
    </div>
  );
}
