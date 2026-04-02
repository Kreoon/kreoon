// Editor de preguntas personalizadas para tipos de evento

import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Loader2,
} from 'lucide-react';
import type { CustomQuestion, CustomQuestionInput, QuestionType } from '../../types';

interface CustomQuestionsEditorProps {
  questions: CustomQuestion[];
  onAdd: (question: CustomQuestionInput) => Promise<void>;
  onUpdate: (id: string, question: Partial<CustomQuestionInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (questionIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'text', label: 'Texto corto', icon: Type },
  { value: 'textarea', label: 'Texto largo', icon: AlignLeft },
  { value: 'select', label: 'Lista desplegable', icon: List },
  { value: 'checkbox', label: 'Casillas múltiples', icon: CheckSquare },
  { value: 'radio', label: 'Opción única', icon: Circle },
];

export function CustomQuestionsEditor({
  questions,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  isLoading,
}: CustomQuestionsEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newType, setNewType] = useState<QuestionType>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newQuestion.trim()) return;

    setAddingLoading(true);
    try {
      await onAdd({
        question: newQuestion,
        question_type: newType,
        options: ['select', 'checkbox', 'radio'].includes(newType)
          ? newOptions.split('\n').filter((o) => o.trim())
          : undefined,
        required: newRequired,
        sort_order: questions.length,
      });
      setNewQuestion('');
      setNewType('text');
      setNewOptions('');
      setNewRequired(false);
      setIsAdding(false);
    } finally {
      setAddingLoading(false);
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

  const handleReorder = async (newOrder: CustomQuestion[]) => {
    await onReorder(newOrder.map((q) => q.id));
  };

  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">Preguntas personalizadas</h4>
          <p className="text-sm text-slate-500 mt-0.5">
            Agrega preguntas que los invitados deben responder al reservar
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

      {/* Lista de preguntas */}
      <Reorder.Group
        axis="y"
        values={sortedQuestions}
        onReorder={handleReorder}
        className="space-y-2"
      >
        <AnimatePresence>
          {sortedQuestions.map((question) => (
            <Reorder.Item
              key={question.id}
              value={question}
              className="bg-white border border-slate-200 rounded-sm p-4 cursor-move"
            >
              <div className="flex items-start gap-3">
                <GripVertical className="w-5 h-5 text-slate-300 mt-0.5 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 truncate">
                      {question.question}
                    </span>
                    {question.required && (
                      <span className="text-xs text-red-500 font-medium">*</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {(() => {
                      const typeInfo = QUESTION_TYPES.find((t) => t.value === question.question_type);
                      const Icon = typeInfo?.icon || Type;
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{typeInfo?.label || question.question_type}</span>
                        </>
                      );
                    })()}
                    {question.options && question.options.length > 0 && (
                      <span className="text-slate-400">
                        · {question.options.length} opciones
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={question.required}
                    onCheckedChange={(checked) =>
                      onUpdate(question.id, { required: checked })
                    }
                    className="data-[state=checked]:bg-violet-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(question.id)}
                    disabled={deletingId === question.id}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    {deletingId === question.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Empty state */}
      {questions.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-slate-50 rounded-sm border-2 border-dashed border-slate-200">
          <Type className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-3">
            No hay preguntas personalizadas
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="rounded-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar primera pregunta
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
            className="bg-violet-50 border border-violet-200 rounded-sm p-4 space-y-4"
          >
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-slate-700">Pregunta</Label>
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Ej: ¿Cuál es el motivo de tu consulta?"
                  className="mt-1 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-slate-700">Tipo de respuesta</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as QuestionType)}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
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

                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="required"
                      checked={newRequired}
                      onCheckedChange={setNewRequired}
                      className="data-[state=checked]:bg-violet-500"
                    />
                    <Label htmlFor="required" className="text-sm text-slate-700">
                      Obligatoria
                    </Label>
                  </div>
                </div>
              </div>

              {['select', 'checkbox', 'radio'].includes(newType) && (
                <div>
                  <Label className="text-sm text-slate-700">
                    Opciones (una por línea)
                  </Label>
                  <textarea
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                    rows={3}
                    className="mt-1 w-full px-3 py-2 rounded-sm border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              )}
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
                disabled={!newQuestion.trim() || addingLoading}
                className="rounded-sm bg-violet-600 hover:bg-violet-700"
              >
                {addingLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Agregar pregunta
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
