import { useState } from 'react';
import { Plus, X, Link as LinkIcon, Eye, Lightbulb } from 'lucide-react';

interface ReferenceLink {
  url: string;
  type: string;
  notes?: string;
}

interface ReferencesStepProps {
  referenceLinks: ReferenceLink[];
  competitorLinks: ReferenceLink[];
  inspirationLinks: ReferenceLink[];
  onUpdate: (type: 'reference' | 'competitor' | 'inspiration', links: ReferenceLink[]) => void;
}

export function ReferencesStep({
  referenceLinks,
  competitorLinks,
  inspirationLinks,
  onUpdate,
}: ReferencesStepProps) {
  return (
    <div className="space-y-6">
      <LinkSection
        title="Tu producto o servicio"
        subtitle="Links de tu página web, tienda online o redes sociales"
        icon={<LinkIcon className="w-4 h-4" />}
        color="cyan"
        links={referenceLinks}
        onChange={(links) => onUpdate('reference', links)}
        placeholder="https://tutienda.com/producto"
      />

      <LinkSection
        title="Competencia"
        subtitle="Links de competidores o marcas similares que quieras analizar"
        icon={<Eye className="w-4 h-4" />}
        color="amber"
        links={competitorLinks}
        onChange={(links) => onUpdate('competitor', links)}
        placeholder="https://competidor.com"
      />

      <LinkSection
        title="Inspiración"
        subtitle="Contenido, campañas o estilos que te inspiren"
        icon={<Lightbulb className="w-4 h-4" />}
        color="purple"
        links={inspirationLinks}
        onChange={(links) => onUpdate('inspiration', links)}
        placeholder="https://instagram.com/p/ejemplo"
      />

      <p className="text-center text-xs text-gray-500">
        Todos los campos son opcionales. Puedes continuar sin agregar links.
      </p>
    </div>
  );
}

// ── Link Section ───────────────────────────────────────────────

function LinkSection({
  title,
  subtitle,
  icon,
  color,
  links,
  onChange,
  placeholder,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  links: ReferenceLink[];
  onChange: (links: ReferenceLink[]) => void;
  placeholder: string;
}) {
  const [inputUrl, setInputUrl] = useState('');

  const colorClasses: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'text-cyan-400' },
    amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'text-amber-400' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-400' },
  };

  const colors = colorClasses[color] || colorClasses.cyan;

  const addLink = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    // Basic URL validation
    let url = trimmed;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    onChange([...links, { url, type: color }]);
    setInputUrl('');
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  return (
    <div className={`rounded-sm border ${colors.border} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={colors.icon}>{icon}</span>
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-sm bg-muted/50 border border-border
                     text-sm text-white placeholder:text-gray-500
                     focus:outline-none focus:border-purple-500/50"
        />
        <button
          onClick={addLink}
          disabled={!inputUrl.trim()}
          className={`px-3 py-2 rounded-sm ${colors.bg} ${colors.text}
                     text-sm font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:opacity-80 transition-all`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Links list */}
      {links.length > 0 && (
        <div className="mt-3 space-y-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-muted/50 border border-border"
            >
              <LinkIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-foreground/80 truncate flex-1">
                {link.url}
              </span>
              <button
                onClick={() => removeLink(index)}
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
