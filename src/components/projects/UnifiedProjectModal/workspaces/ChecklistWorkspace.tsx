import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * ChecklistWorkspace - Task-based workspace for post-production projects.
 * Stores checklist items in formData.workspace_checklist.
 */
export default function ChecklistWorkspace({ formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const [newItem, setNewItem] = useState('');
  const isEditing = editMode && !readOnly;

  const items: ChecklistItem[] = formData.workspace_checklist || [];
  const completedCount = items.filter(i => i.completed).length;

  const updateItems = (updated: ChecklistItem[]) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      workspace_checklist: updated,
    }));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    updateItems([...items, { id: `item-${Date.now()}`, text: newItem.trim(), completed: false }]);
    setNewItem('');
  };

  const toggleItem = (id: string) => {
    updateItems(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const removeItem = (id: string) => {
    updateItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lista de Tareas</h3>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length} completadas
          </span>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 group border rounded-sm p-3">
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => toggleItem(item.id)}
              disabled={!isEditing}
            />
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
              {item.text}
            </span>
            {isEditing && (
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new item */}
      {isEditing && (
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Nueva tarea..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            className="flex-1"
          />
          <Button onClick={addItem} size="sm" variant="outline" disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {items.length === 0 && !isEditing && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay tareas definidas
        </p>
      )}
    </div>
  );
}
