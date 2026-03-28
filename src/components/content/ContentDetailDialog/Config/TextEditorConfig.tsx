import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TextEditorFeatures } from './types';
import { 
  Heading1, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  Quote, 
  Code, 
  Highlighter,
  Smile,
  MessageSquare,
  History,
  Link2,
  Table,
  CheckSquare,
  Image
} from 'lucide-react';

interface TextEditorConfigProps {
  features: TextEditorFeatures;
  onUpdate: (features: TextEditorFeatures) => void;
}

const FEATURE_CONFIG: { 
  key: keyof TextEditorFeatures; 
  label: string; 
  icon: React.ReactNode; 
  description: string;
  category: 'format' | 'structure' | 'advanced';
}[] = [
  { key: 'headings', label: 'Encabezados', icon: <Heading1 className="h-5 w-5" />, description: 'H1, H2, H3, H4', category: 'structure' },
  { key: 'bold', label: 'Negrilla', icon: <Bold className="h-5 w-5" />, description: 'Texto en negrita', category: 'format' },
  { key: 'italic', label: 'Cursiva', icon: <Italic className="h-5 w-5" />, description: 'Texto en cursiva', category: 'format' },
  { key: 'underline', label: 'Subrayado', icon: <Underline className="h-5 w-5" />, description: 'Texto subrayado', category: 'format' },
  { key: 'lists', label: 'Listas', icon: <List className="h-5 w-5" />, description: 'Listas ordenadas y no ordenadas', category: 'structure' },
  { key: 'quotes', label: 'Citas', icon: <Quote className="h-5 w-5" />, description: 'Bloques de cita', category: 'structure' },
  { key: 'code', label: 'Código', icon: <Code className="h-5 w-5" />, description: 'Bloques de código', category: 'structure' },
  { key: 'highlight', label: 'Resaltado', icon: <Highlighter className="h-5 w-5" />, description: 'Texto resaltado', category: 'format' },
  { key: 'emojis', label: 'Emojis', icon: <Smile className="h-5 w-5" />, description: 'Selector de emojis', category: 'advanced' },
  { key: 'comments', label: 'Comentarios', icon: <MessageSquare className="h-5 w-5" />, description: 'Comentarios inline', category: 'advanced' },
  { key: 'history', label: 'Historial', icon: <History className="h-5 w-5" />, description: 'Versionado y deshacer', category: 'advanced' },
  { key: 'links', label: 'Enlaces', icon: <Link2 className="h-5 w-5" />, description: 'Enlaces clicables', category: 'advanced' },
  { key: 'tables', label: 'Tablas', icon: <Table className="h-5 w-5" />, description: 'Tablas con filas y columnas', category: 'advanced' },
  { key: 'checklist', label: 'Checklist', icon: <CheckSquare className="h-5 w-5" />, description: 'Lista de tareas con checkbox', category: 'advanced' },
  { key: 'images', label: 'Imágenes', icon: <Image className="h-5 w-5" />, description: 'Insertar imágenes desde URL', category: 'advanced' },
];

const CATEGORY_LABELS = {
  format: 'Formato de Texto',
  structure: 'Estructura',
  advanced: 'Funciones Avanzadas',
};

export function TextEditorConfig({ features, onUpdate }: TextEditorConfigProps) {
  const handleToggle = (key: keyof TextEditorFeatures) => {
    onUpdate({
      ...features,
      [key]: !features[key],
    });
  };

  const enabledCount = Object.values(features).filter(Boolean).length;

  const groupedFeatures = FEATURE_CONFIG.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, typeof FEATURE_CONFIG>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editor de Texto Avanzado</h3>
          <p className="text-sm text-muted-foreground">
            Configura las funciones disponibles en el editor de texto tipo Word/Notion
          </p>
        </div>
        <Badge variant="outline">
          {enabledCount} / {FEATURE_CONFIG.length} activas
        </Badge>
      </div>

      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category}>
          <h4 className="font-medium text-sm text-muted-foreground mb-3">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryFeatures.map(feature => {
              const isEnabled = features[feature.key];
              return (
                <Card 
                  key={feature.key}
                  className={`p-3 transition-all ${!isEnabled ? 'opacity-50 bg-muted/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-sm ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`feature-${feature.key}`} 
                        className="font-medium cursor-pointer"
                      >
                        {feature.label}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        {feature.description}
                      </p>
                    </div>
                    <Switch
                      id={`feature-${feature.key}`}
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(feature.key)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-sm text-sm border border-primary/20">
        <span>✨</span>
        <p className="text-muted-foreground">
          El editor de texto avanzado se utiliza en todos los bloques de contenido: 
          Guión, Editor, Estratega, Diseñador, Trafficker y Admin.
        </p>
      </div>
    </div>
  );
}
