import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCrmCustomFieldDefs,
  useCreateCrmCustomField,
  useDeleteCrmCustomField,
} from '@/hooks/useCrmCustomFields';
import type { CrmEntityType, CrmCustomFieldType } from '@/types/crm.types';

interface CrmFieldsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CrmEntityType;
  organizationId: string;
}

const FIELD_TYPE_LABELS: Record<CrmCustomFieldType, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  number: 'Numero',
  date: 'Fecha',
  datetime: 'Fecha y hora',
  select: 'Lista',
  multiselect: 'Multi-seleccion',
  checkbox: 'Si/No',
  currency: 'Moneda',
  url: 'URL',
  email: 'Email',
  phone: 'Telefono',
  rating: 'Rating',
  color: 'Color',
  tags: 'Etiquetas',
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as CrmCustomFieldType[];

export function CrmFieldsConfigDialog({
  open,
  onOpenChange,
  entityType,
  organizationId,
}: CrmFieldsConfigDialogProps) {
  const { data: defs = [] } = useCrmCustomFieldDefs(organizationId, entityType);
  const createField = useCreateCrmCustomField(organizationId, entityType);
  const deleteField = useDeleteCrmCustomField(organizationId, entityType);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CrmCustomFieldType>('text');
  const [newOptions, setNewOptions] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const input: { name: string; field_type: CrmCustomFieldType; options?: string[] } = {
      name: newName.trim(),
      field_type: newType,
    };
    if ((newType === 'select' || newType === 'multiselect' || newType === 'tags') && newOptions.trim()) {
      input.options = newOptions.split(',').map(s => s.trim()).filter(Boolean);
    }
    createField.mutate(input, {
      onSuccess: () => {
        setNewName('');
        setNewOptions('');
        setNewType('text');
      },
    });
  };

  const activeDefs = defs.filter(d => d.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base">Configurar campos personalizados</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Existing fields */}
          {activeDefs.length > 0 && (
            <div className="space-y-1.5">
              {activeDefs.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <GripVertical className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
                  <span className="text-xs text-white/70 flex-1 truncate">{def.name}</span>
                  <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/5">
                    {FIELD_TYPE_LABELS[def.field_type] || def.field_type}
                  </span>
                  <button
                    onClick={() => deleteField.mutate(def.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Agregar campo</p>
            <Input
              placeholder="Nombre del campo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/30"
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as CrmCustomFieldType)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a0a2e] border-white/10">
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-white text-xs">
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(newType === 'select' || newType === 'multiselect' || newType === 'tags') && (
              <Input
                placeholder="Opciones separadas por coma"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/30"
              />
            )}
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || createField.isPending}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar campo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
