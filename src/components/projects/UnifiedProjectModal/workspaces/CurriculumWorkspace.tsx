import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GraduationCap, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedTabProps } from '../types';

interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  lessons: CurriculumLesson[];
  collapsed?: boolean;
}

interface CurriculumLesson {
  id: string;
  title: string;
  duration_minutes: number;
  type: 'video' | 'reading' | 'exercise' | 'quiz';
}

const LESSON_TYPES: Record<string, { label: string; color: string }> = {
  video: { label: 'Video', color: 'bg-purple-500/10 text-purple-600' },
  reading: { label: 'Lectura', color: 'bg-blue-500/10 text-blue-600' },
  exercise: { label: 'Ejercicio', color: 'bg-green-500/10 text-green-600' },
  quiz: { label: 'Quiz', color: 'bg-amber-500/10 text-amber-600' },
};

/**
 * CurriculumWorkspace - Lesson plan editor for education projects.
 * Stores modules in formData.workspace_curriculum.
 */
export default function CurriculumWorkspace({ formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;
  const modules: CurriculumModule[] = formData.workspace_curriculum || [];

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalMinutes = modules.reduce((sum, m) =>
    sum + m.lessons.reduce((ls, l) => ls + (l.duration_minutes || 0), 0), 0);

  const updateModules = (updated: CurriculumModule[]) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      workspace_curriculum: updated,
    }));
  };

  const addModule = () => {
    updateModules([
      ...modules,
      { id: `mod-${Date.now()}`, title: 'Nuevo Modulo', description: '', lessons: [], collapsed: false },
    ]);
  };

  const updateModule = (id: string, field: keyof CurriculumModule, value: any) => {
    updateModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeModule = (id: string) => {
    updateModules(modules.filter(m => m.id !== id));
  };

  const addLesson = (moduleId: string) => {
    updateModules(modules.map(m =>
      m.id === moduleId
        ? { ...m, lessons: [...m.lessons, { id: `lesson-${Date.now()}`, title: 'Nueva Leccion', duration_minutes: 15, type: 'video' as const }] }
        : m
    ));
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    updateModules(modules.map(m =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        : m
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Plan Curricular
        </h3>
        {isEditing && (
          <Button onClick={addModule} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Modulo
          </Button>
        )}
      </div>

      {/* Summary */}
      {modules.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{modules.length} modulos</span>
          <span>{totalLessons} lecciones</span>
          <span>~{Math.round(totalMinutes / 60)}h {totalMinutes % 60}min</span>
        </div>
      )}

      {/* Modules */}
      {modules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay modulos. {isEditing ? 'Agrega un modulo para empezar.' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, modIndex) => (
            <div key={mod.id} className="border rounded-lg overflow-hidden">
              {/* Module header */}
              <div
                className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer"
                onClick={() => updateModule(mod.id, 'collapsed', !mod.collapsed)}
              >
                {mod.collapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant="outline" className="text-xs font-mono">M{modIndex + 1}</Badge>

                {isEditing ? (
                  <Input
                    value={mod.title}
                    onChange={(e) => updateModule(mod.id, 'title', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm font-medium bg-transparent border-none focus-visible:ring-0 p-0 flex-1"
                  />
                ) : (
                  <span className="font-medium text-sm flex-1">{mod.title}</span>
                )}

                <span className="text-xs text-muted-foreground">{mod.lessons.length} lecciones</span>

                {isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeModule(mod.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Module content */}
              {!mod.collapsed && (
                <div className="p-4 space-y-3">
                  {isEditing && (
                    <Textarea
                      value={mod.description}
                      onChange={(e) => updateModule(mod.id, 'description', e.target.value)}
                      placeholder="Descripcion del modulo..."
                      rows={2}
                      className="text-sm"
                    />
                  )}
                  {!isEditing && mod.description && (
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                  )}

                  {/* Lessons */}
                  <div className="space-y-2">
                    {mod.lessons.map((lesson, lessonIndex) => {
                      const typeConfig = LESSON_TYPES[lesson.type] || LESSON_TYPES.video;
                      return (
                        <div key={lesson.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/20 group">
                          <span className="text-xs text-muted-foreground font-mono w-8">
                            {modIndex + 1}.{lessonIndex + 1}
                          </span>
                          <Badge className={cn('text-xs', typeConfig.color)}>
                            {typeConfig.label}
                          </Badge>
                          {isEditing ? (
                            <Input
                              value={lesson.title}
                              onChange={(e) => {
                                const updated = [...mod.lessons];
                                updated[lessonIndex] = { ...lesson, title: e.target.value };
                                updateModule(mod.id, 'lessons', updated);
                              }}
                              className="h-7 text-sm bg-transparent border-none focus-visible:ring-0 p-0 flex-1"
                            />
                          ) : (
                            <span className="text-sm flex-1">{lesson.title}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{lesson.duration_minutes}min</span>
                          {isEditing && (
                            <button
                              onClick={() => removeLesson(mod.id, lesson.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isEditing && (
                    <Button onClick={() => addLesson(mod.id)} size="sm" variant="ghost" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Leccion
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
