import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { WizardQuestion, QuestionOption, shouldShowQuestion } from '@/config/wizard-questions';

interface QuestionStepProps {
  questions: WizardQuestion[];
  responses: Record<string, any>;
  onResponse: (questionId: string, value: any) => void;
}

export function QuestionStep({ questions, responses, onResponse }: QuestionStepProps) {
  // Filtrar preguntas basado en lógica condicional avanzada
  const visibleQuestions = questions.filter(q =>
    shouldShowQuestion(q, responses, [], null)
  );

  return (
    <div className="space-y-8">
      {visibleQuestions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-4"
        >
          {/* Question Header */}
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              {question.title}
              {question.required && <span className="text-pink-400">*</span>}
            </h3>
            {question.subtitle && (
              <p className="text-sm text-gray-400 mt-1">{question.subtitle}</p>
            )}
          </div>

          {/* Question Content */}
          {question.type === 'single_select' && (
            <SingleSelect
              options={question.options || []}
              value={responses[question.id]}
              onChange={(value) => onResponse(question.id, value)}
            />
          )}

          {question.type === 'multi_select' && (
            <MultiSelect
              options={question.options || []}
              value={responses[question.id] || []}
              onChange={(value) => onResponse(question.id, value)}
              max={question.validation?.max}
            />
          )}

          {question.type === 'chips' && (
            <ChipsSelect
              options={question.options || []}
              value={responses[question.id] || []}
              onChange={(value) => onResponse(question.id, value)}
              max={question.validation?.max}
            />
          )}

          {question.type === 'textarea' && (
            <TextArea
              value={responses[question.id] || ''}
              onChange={(value) => onResponse(question.id, value)}
              placeholder={question.placeholder}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Single Select Component
function SingleSelect({
  options,
  value,
  onChange
}: {
  options: QuestionOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = value === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`relative p-4 rounded-sm border text-left transition-all ${
              isSelected
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            {/* Recommended Badge */}
            {option.recommended && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5
                              rounded-full bg-purple-500/20 border border-purple-500/30">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-400">Recomendado</span>
              </div>
            )}

            <div className="flex items-start gap-3">
              {/* Icon/Emoji */}
              {option.icon && (
                <span className="text-2xl">{option.icon}</span>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                {option.description && (
                  <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Multi Select Component
function MultiSelect({
  options,
  value,
  onChange,
  max
}: {
  options: QuestionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
}) {
  const toggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(v => v !== optionId));
    } else {
      if (max && value.length >= max) {
        // Remover el primero y agregar el nuevo
        onChange([...value.slice(1), optionId]);
      } else {
        onChange([...value, optionId]);
      }
    }
  };

  return (
    <div className="space-y-3">
      {max && (
        <p className="text-xs text-gray-500">
          Selecciona hasta {max} opciones • {value.length}/{max}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option.id);

          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={`p-3 rounded-sm border text-left transition-all ${
                isSelected
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{option.label}</span>
                {isSelected && <Check className="w-4 h-4 text-purple-400" />}
              </div>
              {option.description && (
                <p className="text-xs text-gray-500 mt-1">{option.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Chips Select Component
function ChipsSelect({
  options,
  value,
  onChange,
  max
}: {
  options: QuestionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
}) {
  const toggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(v => v !== optionId));
    } else {
      if (max && value.length >= max) {
        onChange([...value.slice(1), optionId]);
      } else {
        onChange([...value, optionId]);
      }
    }
  };

  return (
    <div className="space-y-3">
      {max && (
        <p className="text-xs text-gray-500">
          Selecciona hasta {max} • {value.length}/{max}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option.id);

          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={`px-4 py-2 rounded-full border text-sm transition-all ${
                isSelected
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// TextArea Component
function TextArea({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full px-4 py-3 rounded-sm bg-white/5 border border-white/10
                 text-white placeholder-gray-500
                 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                 transition-all resize-none"
    />
  );
}
