// Formulario de preguntas personalizadas para la página pública de booking

import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CustomQuestion, QuestionAnswerInput } from '../../types';

interface CustomQuestionsFormProps {
  questions: CustomQuestion[];
  answers: Record<string, string | string[]>;
  onChange: (questionId: string, value: string | string[]) => void;
  errors?: Record<string, string>;
}

export function CustomQuestionsForm({
  questions,
  answers,
  onChange,
  errors = {},
}: CustomQuestionsFormProps) {
  if (questions.length === 0) return null;

  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-5">
      <div className="border-t border-slate-200 pt-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-4">
          Información adicional
        </h4>
      </div>

      {sortedQuestions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="space-y-2"
        >
          <Label className="text-sm font-medium text-slate-900">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          {question.question_type === 'text' && (
            <Input
              value={(answers[question.id] as string) || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder="Tu respuesta..."
              className={`bg-white border-slate-200 rounded-sm h-11 ${
                errors[question.id] ? 'border-red-500' : ''
              }`}
            />
          )}

          {question.question_type === 'textarea' && (
            <Textarea
              value={(answers[question.id] as string) || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder="Tu respuesta..."
              rows={3}
              className={`bg-white border-slate-200 rounded-sm resize-none ${
                errors[question.id] ? 'border-red-500' : ''
              }`}
            />
          )}

          {question.question_type === 'select' && question.options && (
            <Select
              value={(answers[question.id] as string) || ''}
              onValueChange={(value) => onChange(question.id, value)}
            >
              <SelectTrigger
                className={`bg-white border-slate-200 rounded-sm h-11 ${
                  errors[question.id] ? 'border-red-500' : ''
                }`}
              >
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option, i) => (
                  <SelectItem key={i} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.question_type === 'radio' && question.options && (
            <RadioGroup
              value={(answers[question.id] as string) || ''}
              onValueChange={(value) => onChange(question.id, value)}
              className="space-y-2"
            >
              {question.options.map((option, i) => (
                <div key={i} className="flex items-center gap-3">
                  <RadioGroupItem
                    value={option}
                    id={`${question.id}-${i}`}
                    className="border-slate-300 text-violet-600"
                  />
                  <Label
                    htmlFor={`${question.id}-${i}`}
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === 'checkbox' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, i) => {
                const currentValues = (answers[question.id] as string[]) || [];
                const isChecked = currentValues.includes(option);

                return (
                  <div key={i} className="flex items-center gap-3">
                    <Checkbox
                      id={`${question.id}-${i}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onChange(question.id, [...currentValues, option]);
                        } else {
                          onChange(
                            question.id,
                            currentValues.filter((v) => v !== option)
                          );
                        }
                      }}
                      className="border-slate-300 data-[state=checked]:bg-violet-600"
                    />
                    <Label
                      htmlFor={`${question.id}-${i}`}
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {errors[question.id] && (
            <p className="text-sm text-red-500">{errors[question.id]}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Helper para validar respuestas
export function validateQuestionAnswers(
  questions: CustomQuestion[],
  answers: Record<string, string | string[]>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const question of questions) {
    if (question.required) {
      const answer = answers[question.id];
      const isEmpty =
        !answer ||
        (typeof answer === 'string' && !answer.trim()) ||
        (Array.isArray(answer) && answer.length === 0);

      if (isEmpty) {
        errors[question.id] = 'Este campo es obligatorio';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper para convertir respuestas al formato de input
export function prepareAnswersForSubmit(
  questions: CustomQuestion[],
  answers: Record<string, string | string[]>
): QuestionAnswerInput[] {
  return questions.map((question) => {
    const answer = answers[question.id];
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer || '';

    return {
      question_id: question.id,
      question_text: question.question,
      answer: answerText,
    };
  });
}
