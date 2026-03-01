// Editor de política de cancelación/reprogramación para tipos de evento

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
  Shield,
} from 'lucide-react';
import type { CancellationPolicy } from '../../types';

interface CancellationPolicyEditorProps {
  policy: CancellationPolicy | undefined;
  onSave: (policy: CancellationPolicy) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_POLICY: CancellationPolicy = {
  allow_cancellation: true,
  min_hours_before: 24,
  allow_reschedule: true,
  reschedule_limit: 2,
  policy_text: null,
};

export function CancellationPolicyEditor({
  policy,
  onSave,
  isLoading,
}: CancellationPolicyEditorProps) {
  const [localPolicy, setLocalPolicy] = useState<CancellationPolicy>(
    policy || DEFAULT_POLICY
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (policy) {
      setLocalPolicy(policy);
    }
  }, [policy]);

  useEffect(() => {
    const isDifferent = JSON.stringify(localPolicy) !== JSON.stringify(policy || DEFAULT_POLICY);
    setHasChanges(isDifferent);
  }, [localPolicy, policy]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localPolicy);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (updates: Partial<CancellationPolicy>) => {
    setLocalPolicy((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-50">
          <Shield className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Política de cancelación</h4>
          <p className="text-sm text-slate-500 mt-0.5">
            Define las reglas para cancelaciones y reprogramaciones
          </p>
        </div>
      </div>

      {/* Cancelación */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h5 className="font-medium text-slate-900">Cancelaciones</h5>
              <p className="text-sm text-slate-500">
                Permitir que invitados cancelen citas
              </p>
            </div>
          </div>
          <Switch
            checked={localPolicy.allow_cancellation}
            onCheckedChange={(checked) =>
              updatePolicy({ allow_cancellation: checked })
            }
            className="data-[state=checked]:bg-violet-500"
          />
        </div>

        {localPolicy.allow_cancellation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-4 border-t border-slate-100"
          >
            <Label className="text-sm text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Tiempo mínimo de anticipación
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={0}
                max={168}
                value={localPolicy.min_hours_before}
                onChange={(e) =>
                  updatePolicy({ min_hours_before: Number(e.target.value) || 0 })
                }
                className="w-24 text-center"
              />
              <span className="text-sm text-slate-500">horas antes de la cita</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Los invitados no podrán cancelar si quedan menos de {localPolicy.min_hours_before} horas
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Reprogramación */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <RefreshCw className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h5 className="font-medium text-slate-900">Reprogramaciones</h5>
              <p className="text-sm text-slate-500">
                Permitir que invitados cambien la fecha/hora
              </p>
            </div>
          </div>
          <Switch
            checked={localPolicy.allow_reschedule}
            onCheckedChange={(checked) =>
              updatePolicy({ allow_reschedule: checked })
            }
            className="data-[state=checked]:bg-violet-500"
          />
        </div>

        {localPolicy.allow_reschedule && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-4 border-t border-slate-100"
          >
            <Label className="text-sm text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              Límite de reprogramaciones
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={1}
                max={10}
                value={localPolicy.reschedule_limit}
                onChange={(e) =>
                  updatePolicy({ reschedule_limit: Number(e.target.value) || 1 })
                }
                className="w-24 text-center"
              />
              <span className="text-sm text-slate-500">veces máximo por reserva</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Después de {localPolicy.reschedule_limit} reprogramaciones, el invitado deberá contactarte directamente
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Texto de política */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-slate-200 rounded-xl p-4"
      >
        <Label className="text-sm text-slate-700 font-medium block mb-2">
          Texto personalizado de política (opcional)
        </Label>
        <Textarea
          value={localPolicy.policy_text || ''}
          onChange={(e) =>
            updatePolicy({ policy_text: e.target.value || null })
          }
          placeholder="Ej: Las cancelaciones deben realizarse con al menos 24 horas de anticipación. Las citas no canceladas a tiempo serán cobradas."
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-slate-400 mt-2">
          Este texto se mostrará a los invitados en la página de reserva
        </p>
      </motion.div>

      {/* Vista previa */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-50 border border-slate-200 rounded-xl p-4"
      >
        <h5 className="text-sm font-medium text-slate-700 mb-3">
          Vista previa para el invitado
        </h5>
        <div className="bg-white rounded-lg p-3 text-sm text-slate-600 space-y-2">
          {localPolicy.allow_cancellation ? (
            <p>
              ✓ Puedes cancelar hasta {localPolicy.min_hours_before} horas antes de la cita
            </p>
          ) : (
            <p className="text-slate-400">
              ✗ Las cancelaciones no están permitidas
            </p>
          )}
          {localPolicy.allow_reschedule ? (
            <p>
              ✓ Puedes reprogramar hasta {localPolicy.reschedule_limit} veces
            </p>
          ) : (
            <p className="text-slate-400">
              ✗ Las reprogramaciones no están permitidas
            </p>
          )}
          {localPolicy.policy_text && (
            <p className="pt-2 border-t border-slate-100 text-slate-500 italic">
              "{localPolicy.policy_text}"
            </p>
          )}
        </div>
      </motion.div>

      {/* Guardar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="bg-violet-600 hover:bg-violet-700 rounded-lg px-6"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Guardar política
          </Button>
        </motion.div>
      )}
    </div>
  );
}
