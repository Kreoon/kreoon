import { memo, useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface SkillItem {
  id: string;
  name: string;
  level: number;
}

interface SkillsConfig {
  showPercentage: boolean;
}

interface SkillsContent {
  title?: string;
  skills?: SkillItem[];
}

const DEFAULT_SKILLS: SkillItem[] = [
  { id: '1', name: 'Produccion de video', level: 90 },
  { id: '2', name: 'Fotografia', level: 80 },
  { id: '3', name: 'Edicion', level: 85 },
  { id: '4', name: 'Guion y storytelling', level: 75 },
  { id: '5', name: 'Social Media Strategy', level: 70 },
];

interface AnimatedBarProps {
  level: number;
}

function AnimatedBar({ level }: AnimatedBarProps) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWidth(level);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [level]);

  return (
    <div ref={ref} className="h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%` }}
        role="progressbar"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function SkillsBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as SkillsConfig;
  const content = block.content as SkillsContent;
  const styles = block.styles;
  const skills = content.skills || DEFAULT_SKILLS;
  const [newSkillName, setNewSkillName] = useState('');

  const handleContentUpdate = (updates: Partial<SkillsContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateSkill = (id: string, updates: Partial<SkillItem>) => {
    const newSkills = skills.map((s) => (s.id === id ? { ...s, ...updates } : s));
    handleContentUpdate({ skills: newSkills });
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: SkillItem = {
      id: crypto.randomUUID(),
      name: newSkillName.trim(),
      level: 75,
    };
    handleContentUpdate({ skills: [...skills, newSkill] });
    setNewSkillName('');
  };

  const handleRemoveSkill = (id: string) => {
    handleContentUpdate({ skills: skills.filter((s) => s.id !== id) });
  };

  return (
    <div style={getBlockStyleObject(styles)}>
      {/* Titulo */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Mis Habilidades"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-6 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        />
      ) : (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
          {content.title || 'Mis Habilidades'}
        </h2>
      )}

      {/* Lista de habilidades */}
      <div className="flex flex-col gap-5">
        {skills.map((skill) => (
          <div key={skill.id} className="group">
            <div className="flex items-center justify-between mb-2">
              {isEditing && isSelected ? (
                <Input
                  value={skill.name}
                  onChange={(e) => handleUpdateSkill(skill.id, { name: e.target.value })}
                  placeholder="Nombre de la habilidad"
                  className="text-sm font-medium bg-transparent border-border/50 h-7 flex-1 mr-2"
                />
              ) : (
                <span className="text-sm font-medium text-foreground">{skill.name}</span>
              )}

              <div className="flex items-center gap-2">
                {config.showPercentage && (
                  <span className="text-sm font-semibold text-primary tabular-nums w-10 text-right">
                    {skill.level}%
                  </span>
                )}
                {isEditing && isSelected && (
                  <button
                    onClick={() => handleRemoveSkill(skill.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Eliminar habilidad ${skill.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isEditing && isSelected ? (
              <Slider
                value={[skill.level]}
                onValueChange={([val]) => handleUpdateSkill(skill.id, { level: val })}
                min={0}
                max={100}
                step={1}
                className="w-full"
                aria-label={`Nivel de ${skill.name}`}
              />
            ) : (
              <AnimatedBar level={skill.level} />
            )}
          </div>
        ))}
      </div>

      {/* Agregar habilidad */}
      {isEditing && isSelected && (
        <div className="flex gap-2 mt-6">
          <Input
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Nueva habilidad"
            className="bg-transparent border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSkill}
            className="flex-shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

export const SkillsBlock = memo(SkillsBlockComponent);
