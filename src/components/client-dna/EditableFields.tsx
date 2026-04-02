import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

// ── EditableText ────────────────────────────────────────────────────────
// Shows plain text in view mode, input/textarea in edit mode

interface EditableTextProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function EditableText({
  value,
  onChange,
  multiline = false,
  placeholder = 'Escribe aquí...',
  className = '',
}: EditableTextProps) {
  const baseClasses =
    'w-full rounded-lg bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50 ' +
    'text-zinc-900 dark:text-zinc-100 text-sm px-3 py-2 ' +
    'placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ' +
    'transition-colors duration-150';

  if (multiline) {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`${baseClasses} min-h-[80px] resize-y ${className}`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseClasses} h-10 ${className}`}
    />
  );
}

// ── EditableTags ────────────────────────────────────────────────────────
// Tag list with remove (X) buttons + input to add new tags

interface EditableTagsProps {
  items: string[];
  onChange: (items: string[]) => void;
  color?: string;
  placeholder?: string;
}

const TAG_COLORS: Record<string, string> = {
  purple: 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-300',
  pink: 'bg-pink-100 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-300',
  blue: 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-300',
  cyan: 'bg-cyan-100 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300',
  green: 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-300',
  amber: 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300',
  red: 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300',
  orange: 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-300',
};

export function EditableTags({
  items,
  onChange,
  color = 'purple',
  placeholder = 'Agregar...',
}: EditableTagsProps) {
  const [newTag, setNewTag] = useState('');
  const tagClass = TAG_COLORS[color] || TAG_COLORS.purple;

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${tagClass}`}
          >
            {item}
            <button
              onClick={() => removeTag(i)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-9 rounded-lg bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50
                     text-zinc-900 dark:text-white text-xs px-3
                     placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                     focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                     transition-colors duration-150"
        />
        <button
          onClick={addTag}
          className="h-9 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                     text-zinc-600 dark:text-zinc-400
                     hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700
                     transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── EditableList ────────────────────────────────────────────────────────
// Bulleted list with remove (X) buttons + input to add new items

interface EditableListProps {
  items: string[];
  onChange: (items: string[]) => void;
  color?: string;
  placeholder?: string;
}

export function EditableList({
  items,
  onChange,
  color = 'purple',
  placeholder = 'Agregar item...',
}: EditableListProps) {
  const [newItem, setNewItem] = useState('');

  const dotColors: Record<string, string> = {
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
  };

  const dotClass = dotColors[color] || dotColors.purple;

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed) {
      onChange([...items, trimmed]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <div className={`w-1.5 h-1.5 rounded-full ${dotClass} mt-2 flex-shrink-0`} />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{item}</span>
          <button
            onClick={() => removeItem(i)}
            className="p-0.5 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100
                       transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-9 rounded-lg bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50
                     text-zinc-900 dark:text-white text-xs px-3
                     placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                     focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                     transition-colors duration-150"
        />
        <button
          onClick={addItem}
          className="h-9 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                     text-zinc-600 dark:text-zinc-400
                     hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700
                     transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
