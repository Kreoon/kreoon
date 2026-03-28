// Editor de configuración de recordatorios por tipo de evento

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import type { ReminderSetting, ReminderSettingInput, ReminderType } from '../../types';

interface ReminderSettingsEditorProps {
  settings: ReminderSetting[];
  onAdd: (setting: ReminderSettingInput) => Promise<void>;
  onUpdate: (id: string, setting: Partial<ReminderSettingInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const HOURS_PRESETS = [
  { value: 1, label: '1 hora antes' },
  { value: 2, label: '2 horas antes' },
  { value: 4, label: '4 horas antes' },
  { value: 24, label: '24 horas antes' },
  { value: 48, label: '48 horas antes' },
  { value: 72, label: '3 días antes' },
  { value: 168, label: '1 semana antes' },
];

const REMINDER_TYPES: { value: ReminderType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
];

export function ReminderSettingsEditor({
  settings,
  onAdd,
  onUpdate,
  onDelete,
  isLoading,
}: ReminderSettingsEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<ReminderType>('email');
  const [newHours, setNewHours] = useState<number>(24);
  const [addingLoading, setAddingLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    setAddingLoading(true);
    try {
      await onAdd({
        reminder_type: newType,
        hours_before: newHours,
        enabled: true,
      });
      setIsAdding(false);
      setNewType('email');
      setNewHours(24);
    } finally {
      setAddingLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await onUpdate(id, { enabled });
  };

  const handleStartEdit = (setting: ReminderSetting) => {
    setEditingId(setting.id);
    setEditSubject(setting.template_subject || '');
    setEditBody(setting.template_body || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSavingId(editingId);
    try {
      await onUpdate(editingId, {
        template_subject: editSubject || undefined,
        template_body: editBody || undefined,
      });
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h antes`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 día antes' : `${days} días antes`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-500" />
            Recordatorios automáticos
          </h4>
          <p className="text-sm text-slate-500 mt-0.5">
            Configura cuándo enviar recordatorios a tus invitados
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="rounded-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {/* Lista de recordatorios */}
      <div className="space-y-2">
        <AnimatePresence>
          {settings.map((setting) => {
            const TypeIcon = REMINDER_TYPES.find((t) => t.value === setting.reminder_type)?.icon || Mail;
            const isEditing = editingId === setting.id;

            return (
              <motion.div
                key={setting.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`bg-white border rounded-sm transition-all ${
                  isEditing ? 'border-violet-300 shadow-md' : 'border-slate-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-sm ${
                        setting.enabled ? 'bg-violet-50' : 'bg-slate-100'
                      }`}
                    >
                      <TypeIcon
                        className={`w-4 h-4 ${
                          setting.enabled ? 'text-violet-600' : 'text-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {setting.reminder_type === 'email' ? 'Email' : 'SMS'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatHours(setting.hours_before)}
                        </span>
                      </div>
                      {setting.template_subject && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {setting.template_subject}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(setting)}
                        className="text-slate-400 hover:text-violet-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={(checked) => handleToggle(setting.id, checked)}
                        className="data-[state=checked]:bg-violet-500"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(setting.id)}
                        disabled={deletingId === setting.id}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        {deletingId === setting.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Edición de plantilla */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200"
                    >
                      <div className="p-4 space-y-3 bg-slate-50">
                        <div>
                          <Label className="text-sm text-slate-700">
                            Asunto del email (opcional)
                          </Label>
                          <Input
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            placeholder="Recordatorio: Tu cita es pronto"
                            className="mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-slate-700">
                            Mensaje personalizado (opcional)
                          </Label>
                          <Textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            placeholder="Usa {{guest_name}}, {{event_title}}, {{date}}, {{time}} como variables"
                            rows={3}
                            className="mt-1 bg-white resize-none"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                            Variables: {'{{guest_name}}'}, {'{{event_title}}'}, {'{{date}}'}, {'{{time}}'}, {'{{host_name}}'}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            className="rounded-sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={savingId === setting.id}
                            className="rounded-sm bg-violet-600 hover:bg-violet-700"
                          >
                            {savingId === setting.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Guardar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {settings.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-slate-50 rounded-sm border-2 border-dashed border-slate-200">
          <Bell className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-3">
            No hay recordatorios configurados
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="rounded-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar recordatorio
          </Button>
        </div>
      )}

      {/* Formulario para agregar */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-violet-50 border border-violet-200 rounded-sm p-4"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm text-slate-700">Tipo</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ReminderType)}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-slate-700">Cuándo enviar</Label>
                <Select
                  value={String(newHours)}
                  onValueChange={(v) => setNewHours(Number(v))}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={String(preset.value)}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="rounded-sm"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={addingLoading}
                className="rounded-sm bg-violet-600 hover:bg-violet-700"
              >
                {addingLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Agregar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
