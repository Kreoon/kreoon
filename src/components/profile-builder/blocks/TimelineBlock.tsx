import { memo, useState } from 'react';
import { Plus, Trash2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  icon?: string;
}

interface TimelineConfig {
  layout: 'vertical' | 'horizontal';
}

interface TimelineContent {
  title?: string;
  events?: TimelineEvent[];
}

const DEFAULT_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    title: 'Inicio como creador de contenido',
    description: 'Empece a crear contenido para marcas locales con foco en video.',
    date: '2020',
  },
  {
    id: '2',
    title: 'Primera colaboracion internacional',
    description: 'Trabaje con una marca de USA en una campana de UGC ads.',
    date: '2021',
  },
  {
    id: '3',
    title: 'Crecimiento a 50K seguidores',
    description: 'Alcance 50,000 seguidores organicos en Instagram con mi estrategia de contenido.',
    date: '2022',
  },
  {
    id: '4',
    title: 'Agencia de contenido',
    description: 'Funde mi propia agencia para escalar la produccion de contenido UGC.',
    date: '2023',
  },
];

function TimelineBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as TimelineConfig;
  const content = block.content as TimelineContent;
  const styles = block.styles;
  const events = content.events || DEFAULT_EVENTS;
  const [, setForce] = useState(0);

  const handleContentUpdate = (updates: Partial<TimelineContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateEvent = (id: string, updates: Partial<TimelineEvent>) => {
    const newEvents = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    handleContentUpdate({ events: newEvents });
    setForce((n) => n + 1);
  };

  const handleAddEvent = () => {
    const newEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      title: 'Nuevo hito',
      description: 'Descripcion del evento o logro.',
      date: new Date().getFullYear().toString(),
    };
    handleContentUpdate({ events: [...events, newEvent] });
  };

  const handleRemoveEvent = (id: string) => {
    handleContentUpdate({ events: events.filter((e) => e.id !== id) });
  };

  return (
    <div style={getBlockStyleObject(styles)}>
      {/* Titulo */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Mi Trayectoria"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-8 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        />
      ) : (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-8">
          {content.title || 'Mi Trayectoria'}
        </h2>
      )}

      {/* Layout vertical */}
      {(config.layout === 'vertical' || isEditing) && (
        <div className="relative">
          {/* Linea central */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/60" aria-hidden="true" />

          <div className="flex flex-col gap-8">
            {events.map((event, index) => (
              <div key={event.id} className="relative group flex gap-6 pl-12">
                {/* Punto en la linea */}
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                  <Circle className="h-3 w-3 fill-primary text-primary" />
                </div>

                {/* Contenido */}
                <div
                  className={cn(
                    'flex-1 rounded-lg border border-border/50 bg-card/30 p-4',
                    index % 2 === 0 ? '' : 'bg-card/50',
                  )}
                >
                  {isEditing && isSelected ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          value={event.title}
                          onChange={(e) => handleUpdateEvent(event.id, { title: e.target.value })}
                          placeholder="Titulo del hito"
                          className="font-semibold bg-transparent border-border/50 flex-1"
                        />
                        <Input
                          value={event.date}
                          onChange={(e) => handleUpdateEvent(event.id, { date: e.target.value })}
                          placeholder="Fecha"
                          className="w-24 bg-transparent border-border/50"
                        />
                      </div>
                      <Textarea
                        value={event.description}
                        onChange={(e) =>
                          handleUpdateEvent(event.id, { description: e.target.value })
                        }
                        placeholder="Descripcion del evento"
                        className="text-sm text-muted-foreground bg-transparent border-border/50 resize-none"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <span className="text-xs font-medium text-primary flex-shrink-0 mt-0.5 bg-primary/10 px-2 py-0.5 rounded-full">
                          {event.date}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </>
                  )}
                </div>

                {isEditing && isSelected && (
                  <button
                    onClick={() => handleRemoveEvent(event.id)}
                    className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Eliminar evento ${event.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout horizontal (solo preview) */}
      {config.layout === 'horizontal' && !isEditing && (
        <div className="relative overflow-x-auto pb-4">
          {/* Linea horizontal */}
          <div
            className="absolute left-0 right-0 top-6 h-0.5 bg-border/60"
            aria-hidden="true"
          />

          <div className="flex gap-6 min-w-max px-4">
            {events.map((event) => (
              <div key={event.id} className="relative flex flex-col items-center w-48 pt-14">
                {/* Punto */}
                <div className="absolute top-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                  <Circle className="h-3 w-3 fill-primary text-primary" />
                </div>

                <div className="text-center">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {event.date}
                  </span>
                  <h3 className="font-semibold text-foreground text-sm mt-2 mb-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditing && isSelected && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddEvent}
          className="mt-6 gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar evento
        </Button>
      )}
    </div>
  );
}

export const TimelineBlock = memo(TimelineBlockComponent);
