import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface TikTokFormData {
  pixel_id: string;
  access_token: string;
  test_mode: boolean;
  test_event_code: string;
}

interface TikTokConfigFormProps {
  data: TikTokFormData;
  onChange: (data: TikTokFormData) => void;
  hasExistingToken: boolean;
}

export function TikTokConfigForm({ data, onChange, hasExistingToken }: TikTokConfigFormProps) {
  const update = (field: keyof TikTokFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tt-pixel" className="text-foreground/80">
          Pixel Code <span className="text-red-400">*</span>
        </Label>
        <Input
          id="tt-pixel"
          value={data.pixel_id}
          onChange={(e) => update('pixel_id', e.target.value)}
          placeholder="Ej: CXXXXXXXXXXXXXXXXX"
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          El Pixel Code de TikTok. Lo encuentras en TikTok Ads Manager → Events → Web Events.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tt-token" className="text-foreground/80">
          Access Token <span className="text-red-400">*</span>
        </Label>
        <Input
          id="tt-token"
          type="password"
          value={data.access_token}
          onChange={(e) => update('access_token', e.target.value)}
          placeholder={hasExistingToken ? 'Dejar vacío para mantener el actual' : 'Token de Events API'}
          className="bg-gray-900/50 border-gray-700"
        />
        <p className="text-xs text-gray-500">
          Genera el token en TikTok Ads Manager → Events → Settings → Generate Access Token.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-sm bg-gray-800/30 border border-gray-700/30">
        <div>
          <Label className="text-foreground/80">Modo Test</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Los eventos se envían con test_event_code para debugging
          </p>
        </div>
        <Switch
          checked={data.test_mode}
          onCheckedChange={(v) => update('test_mode', v)}
        />
      </div>

      {data.test_mode && (
        <div className="space-y-1.5">
          <Label htmlFor="tt-test-code" className="text-foreground/80">Test Event Code</Label>
          <Input
            id="tt-test-code"
            value={data.test_event_code}
            onChange={(e) => update('test_event_code', e.target.value)}
            placeholder="Ej: TEST_KAE"
            className="bg-gray-900/50 border-gray-700"
          />
        </div>
      )}
    </div>
  );
}
