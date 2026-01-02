import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Save, RotateCcw, Sparkles, FileText, Users, Target, Palette, BarChart3, Settings2, ChevronDown, Info, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScriptPromptsConfigProps {
  organizationId: string;
}

interface PromptConfig {
  master_prompt: string;
  role_prompts: {
    creator: string;
    editor: string;
    strategist: string;
    trafficker: string;
    designer: string;
    admin: string;
  };
  format_rules: string;
  critical_rules: string;
}

// All available template variables
const TEMPLATE_VARIABLES = {
  producto: [
    { code: '{producto_nombre}', description: 'Nombre del producto' },
    { code: '{producto_descripcion}', description: 'Descripción detallada del producto' },
    { code: '{producto_estrategia}', description: 'Estrategia de marketing del producto' },
    { code: '{producto_investigacion}', description: 'Investigación de mercado' },
    { code: '{producto_avatar}', description: 'Avatar / Cliente ideal del producto' },
    { code: '{producto_angulos}', description: 'Lista de ángulos de venta' },
  ],
  formulario: [
    { code: '{cta}', description: 'Llamado a la acción (CTA)' },
    { code: '{angulo_venta}', description: 'Ángulo de venta seleccionado' },
    { code: '{cantidad_hooks}', description: 'Cantidad de hooks solicitados' },
    { code: '{pais_objetivo}', description: 'País objetivo del contenido' },
    { code: '{estructura_narrativa}', description: 'Estructura narrativa seleccionada' },
    { code: '{avatar_ideal}', description: 'Avatar ideal del formulario' },
    { code: '{estrategias_video}', description: 'Estrategias/estructuras de video' },
    { code: '{transcripcion_referencia}', description: 'Transcripción de video de referencia' },
    { code: '{hooks_sugeridos}', description: 'Lista de hooks sugeridos por el usuario' },
    { code: '{instrucciones_adicionales}', description: 'Instrucciones adicionales del usuario' },
  ],
  documentos: [
    { code: '{documento_brief}', description: 'Contenido del brief del producto' },
    { code: '{documento_onboarding}', description: 'Contenido del onboarding' },
    { code: '{documento_research}', description: 'Contenido del research/investigación' },
  ],
};

const DEFAULT_MASTER_PROMPT = `🎯 ROL DEL SISTEMA

Actúa como un Prompt Engineer senior y estratega digital experto en UGC, performance ads y storytelling, encargado de construir prompts de alta precisión antes de generar cualquier guion.

Tu función principal es convertir la información del formulario en prompts claros, completos y alineados al objetivo del negocio.

📦 PRODUCTO: {producto_nombre}
📝 DESCRIPCIÓN: {producto_descripcion}
🎯 ESTRATEGIA: {producto_estrategia}
👤 AVATAR: {producto_avatar}`;

const DEFAULT_ROLE_PROMPTS = {
  creator: '📦 GENERANDO: BLOQUE CREADOR 🎥 - Guion estructurado por escenas, listo para grabar.',
  editor: '📦 GENERANDO: BLOQUE EDITOR ✂️ - Pensado para edición fluida y rápida.',
  strategist: '📦 GENERANDO: BLOQUE ESTRATEGA ♟️ - Pensamiento de fondo y estrategia.',
  trafficker: '📦 GENERANDO: BLOQUE TRAFFICKER 📊 - Pensado para escalar en pauta.',
  designer: '📦 GENERANDO: BLOQUE DISEÑADOR 🎨 - Guía visual clara.',
  admin: '📦 GENERANDO: BLOQUE ADMIN / PROJECT MANAGER 📅 - Control y ejecución.',
};

const DEFAULT_FORMAT_RULES = `🎨 FORMATO VISUAL DEL RESULTADO (OBLIGATORIO):
- Devuelve SOLO HTML (sin Markdown, sin backticks, sin texto fuera de etiquetas)
- Usa HTML semántico: <h2>, <h3>, <h4>, <p>, <ul>, <li>, <strong>, <em>
- Usar <strong> para ideas clave y frases importantes
- Usar <em> para intención emocional o tono
- Usar <u> SOLO para CTAs o frases accionables
- Emojis: máximo 1–2 por bloque, solo como guía visual (🎯🔥🚀🎥)
- Espaciado amplio entre secciones (cada bloque debe ser claro)
- Párrafos cortos (máx. 2–3 líneas por bloque)

🚫 EVITAR:
- Markdown visible (##, **, \`\`\`)
- Bloques largos sin aire
- Texto genérico o repetitivo
- Lenguaje publicitario forzado`;

const DEFAULT_CRITICAL_RULES = `📥 INPUT DEL FORMULARIO

🎯 CTA: {cta}
💡 Ángulo de venta: {angulo_venta}
🔢 Cantidad de hooks: {cantidad_hooks}
🌍 País objetivo: {pais_objetivo}
📖 Estructura narrativa: {estructura_narrativa}
👤 Avatar ideal: {avatar_ideal}
🎬 Estrategias de video: {estrategias_video}

📝 Hooks sugeridos:
{hooks_sugeridos}

💬 Instrucciones adicionales:
{instrucciones_adicionales}

⚠️ REGLAS CRÍTICAS:
- NINGÚN CAMPO debe ser ignorado si tiene información
- Si un campo está vacío, NO lo inventes
- Todo el contenido generado debe ser COHERENTE entre sí
- Cada proyecto genera 1 SOLO GUION completo
- La cantidad de hooks debe respetar EXACTAMENTE el valor configurado`;

const ROLE_ICONS = {
  creator: FileText,
  editor: Settings2,
  strategist: Target,
  trafficker: BarChart3,
  designer: Palette,
  admin: Users,
};

const ROLE_LABELS = {
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  trafficker: 'Trafficker',
  designer: 'Diseñador',
  admin: 'Admin/PM',
};

// Component to display a copyable variable
function VariableItem({ code, description }: { code: string; description: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`Copiado: ${code}`);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div 
      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border hover:bg-muted/80 cursor-pointer transition-colors group"
      onClick={handleCopy}
    >
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          {code}
        </code>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

export function ScriptPromptsConfig({ organizationId }: ScriptPromptsConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useCustomPrompts, setUseCustomPrompts] = useState(false);
  const [config, setConfig] = useState<PromptConfig>({
    master_prompt: DEFAULT_MASTER_PROMPT,
    role_prompts: DEFAULT_ROLE_PROMPTS,
    format_rules: DEFAULT_FORMAT_RULES,
    critical_rules: DEFAULT_CRITICAL_RULES,
  });

  useEffect(() => {
    fetchConfig();
  }, [organizationId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_ai_prompts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('module_key', 'scripts')
        .maybeSingle();

      if (error) throw error;

      if (data?.prompt_config) {
        const promptConfig = data.prompt_config as any;
        setUseCustomPrompts(data.is_active);
        setConfig({
          master_prompt: promptConfig.master_prompt || DEFAULT_MASTER_PROMPT,
          role_prompts: promptConfig.role_prompts || DEFAULT_ROLE_PROMPTS,
          format_rules: promptConfig.format_rules || DEFAULT_FORMAT_RULES,
          critical_rules: promptConfig.critical_rules || DEFAULT_CRITICAL_RULES,
        });
      }
    } catch (error) {
      console.error('Error fetching prompt config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('organization_ai_prompts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('module_key', 'scripts')
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from('organization_ai_prompts')
          .update({
            prompt_config: config as any,
            is_active: useCustomPrompts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('organization_ai_prompts')
          .insert([{
            organization_id: organizationId,
            module_key: 'scripts',
            prompt_config: config as any,
            is_active: useCustomPrompts,
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Configuración de prompts guardada');
    } catch (error) {
      console.error('Error saving prompt config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setConfig({
      master_prompt: DEFAULT_MASTER_PROMPT,
      role_prompts: DEFAULT_ROLE_PROMPTS,
      format_rules: DEFAULT_FORMAT_RULES,
      critical_rules: DEFAULT_CRITICAL_RULES,
    });
    toast.info('Prompts restaurados a los valores por defecto');
  };

  const updateRolePrompt = (role: keyof typeof DEFAULT_ROLE_PROMPTS, value: string) => {
    setConfig(prev => ({
      ...prev,
      role_prompts: {
        ...prev.role_prompts,
        [role]: value,
      },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Prompts del Generador de Guiones</CardTitle>
                <CardDescription>
                  Personaliza los prompts que usa la IA para generar guiones
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={useCustomPrompts}
                  onCheckedChange={setUseCustomPrompts}
                />
                <Label className="text-sm">Usar prompts personalizados</Label>
              </div>
              <Badge variant={useCustomPrompts ? "default" : "secondary"}>
                {useCustomPrompts ? "Personalizado" : "Por defecto"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Template Variables Reference */}
      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">Variables de plantilla disponibles</span>
                <Badge variant="secondary" className="ml-2">
                  {Object.values(TEMPLATE_VARIABLES).flat().length} variables
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Usa estas variables en tus prompts y serán reemplazadas automáticamente con la información real del producto y formulario:
              </p>
              
              {/* Product Variables */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  📦 Variables del Producto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TEMPLATE_VARIABLES.producto.map(v => (
                    <VariableItem key={v.code} code={v.code} description={v.description} />
                  ))}
                </div>
              </div>

              {/* Form Variables */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  📝 Variables del Formulario
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TEMPLATE_VARIABLES.formulario.map(v => (
                    <VariableItem key={v.code} code={v.code} description={v.description} />
                  ))}
                </div>
              </div>

              {/* Document Variables */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  📄 Variables de Documentos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TEMPLATE_VARIABLES.documentos.map(v => (
                    <VariableItem key={v.code} code={v.code} description={v.description} />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <strong>💡 Tip:</strong> Copia y pega las variables en cualquier parte del prompt. 
                  Si la variable no tiene valor, se dejará vacía automáticamente.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Prompt Editor */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="master" className="space-y-4">
            <TabsList className="grid grid-cols-4 gap-2">
              <TabsTrigger value="master" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prompt Maestro
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por Rol
              </TabsTrigger>
              <TabsTrigger value="format" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Formato
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Reglas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="master" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Prompt Maestro (Sistema)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Este es el prompt principal que define el comportamiento general de la IA al generar guiones.
                </p>
                <Textarea
                  value={config.master_prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, master_prompt: e.target.value }))}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Define el rol y comportamiento del sistema..."
                  disabled={!useCustomPrompts}
                />
              </div>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Prompts por Rol</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Personaliza el prompt adicional que se usa para cada tipo de rol al generar guiones.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => {
                    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
                    return (
                      <div key={role} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Label className="font-medium">{label}</Label>
                        </div>
                        <Textarea
                          value={config.role_prompts[role as keyof typeof DEFAULT_ROLE_PROMPTS]}
                          onChange={(e) => updateRolePrompt(role as keyof typeof DEFAULT_ROLE_PROMPTS, e.target.value)}
                          className="min-h-[100px] font-mono text-sm"
                          disabled={!useCustomPrompts}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="format" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Reglas de Formato</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Define el formato de salida esperado (HTML, estructura, emojis, etc.)
                </p>
                <Textarea
                  value={config.format_rules}
                  onChange={(e) => setConfig(prev => ({ ...prev, format_rules: e.target.value }))}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Define las reglas de formato..."
                  disabled={!useCustomPrompts}
                />
              </div>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Reglas Críticas</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Define qué campos son obligatorios y las reglas que la IA debe seguir estrictamente.
                </p>
                <Textarea
                  value={config.critical_rules}
                  onChange={(e) => setConfig(prev => ({ ...prev, critical_rules: e.target.value }))}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Define las reglas críticas..."
                  disabled={!useCustomPrompts}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={saving || !useCustomPrompts}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar por defecto
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
