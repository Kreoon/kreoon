import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ASPECT_RATIOS } from '../config';

interface OutputSizeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function OutputSizeSelector({ value, onChange }: OutputSizeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Relación de aspecto</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASPECT_RATIOS.map((ratio) => (
            <SelectItem key={ratio.value} value={ratio.value}>
              {ratio.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
