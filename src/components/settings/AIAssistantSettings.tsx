import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, Plus, Trash2, FileText, BookOpen, History, Settings2, Workflow, ThumbsUp, ThumbsDown, Ban, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIConfig {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  provider: string;
  model: string;
  assistant_name: string;
  system_prompt: string | null;
  tone: string | null;
}

interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  knowledge_type: string;
  is_active: boolean;
  created_at: string;
}

interface AILog {
  id: string;
  user_message: string;
  assistant_response: string;
  created_at: string;
  user_id: string;
}

interface ConversationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_keywords: string[] | null;
  trigger_intent: string | null;
  flow_steps: any;
  priority: number;
  is_active: boolean;
}

interface PositiveExample {
  id: string;
  user_question: string;
  ideal_response: string;
  category: string;
  context_notes: string | null;
  is_active: boolean;
}

interface NegativeRule {
  id: string;
  rule_type: string;
  pattern: string;
  reason: string | null;
  severity: string;
  is_active: boolean;
}

interface PromptConfig {
  id: string;
  assistant_role: string;
  personality: string | null;
  tone: string | null;
  greeting: string | null;
  fallback_message: string | null;
  can_discuss_pricing: boolean;
  can_discuss_competitors: boolean;
  can_share_user_data: boolean;
  max_response_length: number | null;
  language: string | null;
  custom_instructions: string | null;
}

interface AIFeedback {
  id: string;
  rating: string;
  user_question: string | null;
  ai_response: string | null;
  comment: string | null;
  created_at: string;
  reviewed: boolean;
}

const PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (Sin API Key requerida)', description: 'Usa modelos de Gemini y GPT-5' },
  { value: 'openai', label: 'OpenAI', description: 'Requiere API Key configurada' },
  { value: 'gemini', label: 'Google Gemini', description: 'Requiere API Key configurada' },
  { value: 'anthropic', label: 'Anthropic Claude', description: 'Requiere API Key configurada' },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Más potente)' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Más rápido)' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Beta)' },
    { value: 'openai/gpt-5', label: 'GPT-5' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Rápido)' },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (Económico)' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Recomendado)' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku (Rápido)' },
  ],
};

const TONES = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
];

const KNOWLEDGE_TYPES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'process', label: 'Proceso' },
  { value: 'policy', label: 'Política' },
  { value: 'guide', label: 'Guía' },
];

const RULE_TYPES = [
  { value: 'forbidden_topic', label: 'Tema prohibido' },
  { value: 'forbidden_phrase', label: 'Frase prohibida' },
  { value: 'forbidden_action', label: 'Acción prohibida' },
  { value: 'data_protection', label: 'Protección de datos' },
];

const SEVERITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const EXAMPLE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'support', label: 'Soporte' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'sales', label: 'Ventas' },
  { value: 'technical', label: 'Técnico' },
];

export function AIAssistantSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([]);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [positiveExamples, setPositiveExamples] = useState<PositiveExample[]>([]);
  const [negativeRules, setNegativeRules] = useState<NegativeRule[]>([]);
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
  const [feedback, setFeedback] = useState<AIFeedback[]>([]);
  
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', knowledge_type: 'faq' });
  const [newFlow, setNewFlow] = useState({ name: '', description: '', trigger_keywords: '', trigger_intent: '', priority: 1 });
  const [newExample, setNewExample] = useState({ user_question: '', ideal_response: '', category: 'general', context_notes: '' });
  const [newRule, setNewRule] = useState({ rule_type: 'forbidden_topic', pattern: '', reason: '', severity: 'medium' });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [configRes, knowledgeRes, logsRes, flowsRes, examplesRes, rulesRes, promptRes, feedbackRes] = await Promise.all([
        supabase.from('ai_assistant_config').select('*').eq('organization_id', orgId).maybeSingle(),
        supabase.from('ai_assistant_knowledge').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('ai_assistant_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50),
        supabase.from('ai_conversation_flows').select('*').eq('organization_id', orgId).order('priority'),
        supabase.from('ai_positive_examples').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('ai_negative_rules').select('*').eq('organization_id', orgId).order('severity'),
        supabase.from('ai_prompt_config').select('*').eq('organization_id', orgId).maybeSingle(),
        supabase.from('ai_chat_feedback').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
      } else {
        const { data: newConfig } = await supabase
          .from('ai_assistant_config')
          .insert({
            organization_id: orgId,
            is_enabled: false,
            provider: 'lovable',
            model: 'google/gemini-2.5-flash',
            assistant_name: 'Asistente',
          })
          .select()
          .single();
        setConfig(newConfig);
      }

      setKnowledge(knowledgeRes.data || []);
      setLogs(logsRes.data || []);
      setFlows(flowsRes.data || []);
      setPositiveExamples(examplesRes.data || []);
      setNegativeRules(rulesRes.data || []);
      setFeedback(feedbackRes.data || []);

      if (promptRes.data) {
        setPromptConfig(promptRes.data);
      } else {
        const { data: newPrompt } = await supabase
          .from('ai_prompt_config')
          .insert({
            organization_id: orgId,
            assistant_role: 'Eres un asistente útil de la organización.',
          })
          .select()
          .single();
        setPromptConfig(newPrompt);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_assistant_config')
        .update({
          is_enabled: config.is_enabled,
          provider: config.provider,
          model: config.model,
          assistant_name: config.assistant_name,
          system_prompt: config.system_prompt,
          tone: config.tone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      toast({ title: 'Configuración guardada' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const savePromptConfig = async () => {
    if (!promptConfig) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_prompt_config')
        .update({
          assistant_role: promptConfig.assistant_role,
          personality: promptConfig.personality,
          tone: promptConfig.tone,
          greeting: promptConfig.greeting,
          fallback_message: promptConfig.fallback_message,
          can_discuss_pricing: promptConfig.can_discuss_pricing,
          can_discuss_competitors: promptConfig.can_discuss_competitors,
          can_share_user_data: promptConfig.can_share_user_data,
          max_response_length: promptConfig.max_response_length,
          language: promptConfig.language,
          custom_instructions: promptConfig.custom_instructions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptConfig.id);

      if (error) throw error;
      toast({ title: 'Prompt guardado' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addKnowledge = async () => {
    if (!orgId || !newKnowledge.title || !newKnowledge.content) return;
    try {
      const { error } = await supabase.from('ai_assistant_knowledge').insert({
        organization_id: orgId,
        title: newKnowledge.title,
        content: newKnowledge.content,
        knowledge_type: newKnowledge.knowledge_type,
      });

      if (error) throw error;
      toast({ title: 'Conocimiento agregado' });
      setNewKnowledge({ title: '', content: '', knowledge_type: 'faq' });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
    }
  };

  const addFlow = async () => {
    if (!orgId || !newFlow.name) return;
    try {
      const { error } = await supabase.from('ai_conversation_flows').insert({
        organization_id: orgId,
        name: newFlow.name,
        description: newFlow.description || null,
        trigger_keywords: newFlow.trigger_keywords ? newFlow.trigger_keywords.split(',').map(k => k.trim()) : null,
        trigger_intent: newFlow.trigger_intent || null,
        priority: newFlow.priority,
        flow_steps: [],
      });

      if (error) throw error;
      toast({ title: 'Flujo agregado' });
      setNewFlow({ name: '', description: '', trigger_keywords: '', trigger_intent: '', priority: 1 });
      setFlowDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
    }
  };

  const addPositiveExample = async () => {
    if (!orgId || !newExample.user_question || !newExample.ideal_response) return;
    try {
      const { error } = await supabase.from('ai_positive_examples').insert({
        organization_id: orgId,
        user_question: newExample.user_question,
        ideal_response: newExample.ideal_response,
        category: newExample.category,
        context_notes: newExample.context_notes || null,
      });

      if (error) throw error;
      toast({ title: 'Ejemplo agregado' });
      setNewExample({ user_question: '', ideal_response: '', category: 'general', context_notes: '' });
      setExampleDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
    }
  };

  const addNegativeRule = async () => {
    if (!orgId || !newRule.pattern) return;
    try {
      const { error } = await supabase.from('ai_negative_rules').insert({
        organization_id: orgId,
        rule_type: newRule.rule_type,
        pattern: newRule.pattern,
        reason: newRule.reason || null,
        severity: newRule.severity,
      });

      if (error) throw error;
      toast({ title: 'Regla agregada' });
      setNewRule({ rule_type: 'forbidden_topic', pattern: '', reason: '', severity: 'medium' });
      setRuleDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
    }
  };

  const deleteItem = async (table: string, id: string) => {
    try {
      const { error } = await (supabase.from(table as any) as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Eliminado' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleActive = async (table: string, id: string, isActive: boolean) => {
    try {
      const { error } = await (supabase.from(table as any) as any).update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Asistente IA de la Organización
          </CardTitle>
          <CardDescription>
            Configura, entrena y controla el asistente IA de tu equipo
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="config" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            Config
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Conocimiento
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5 text-xs">
            <Workflow className="h-3.5 w-3.5" />
            Flujos
          </TabsTrigger>
          <TabsTrigger value="positive" className="gap-1.5 text-xs">
            <ThumbsUp className="h-3.5 w-3.5" />
            Positivo
          </TabsTrigger>
          <TabsTrigger value="negative" className="gap-1.5 text-xs">
            <Ban className="h-3.5 w-3.5" />
            Negativo
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar Asistente IA</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite a los usuarios usar el chat con IA
                  </p>
                </div>
                <Switch
                  checked={config?.is_enabled ?? false}
                  onCheckedChange={(v) => setConfig(c => c ? { ...c, is_enabled: v } : null)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre del Asistente</Label>
                  <Input
                    value={config?.assistant_name ?? ''}
                    onChange={(e) => setConfig(c => c ? { ...c, assistant_name: e.target.value } : null)}
                    placeholder="Asistente"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tono</Label>
                  <Select
                    value={config?.tone ?? 'profesional'}
                    onValueChange={(v) => setConfig(c => c ? { ...c, tone: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={config?.provider ?? 'lovable'}
                    onValueChange={(v) => setConfig(c => c ? { ...c, provider: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select
                    value={config?.model ?? 'google/gemini-2.5-flash'}
                    onValueChange={(v) => setConfig(c => c ? { ...c, model: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS[config?.provider as keyof typeof MODELS]?.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt Config Tab */}
        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt del Asistente</CardTitle>
              <CardDescription>Define la personalidad y comportamiento del asistente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Rol del Asistente</Label>
                <Textarea
                  value={promptConfig?.assistant_role ?? ''}
                  onChange={(e) => setPromptConfig(c => c ? { ...c, assistant_role: e.target.value } : null)}
                  placeholder="Eres un asistente de soporte de la empresa X..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Personalidad</Label>
                  <Input
                    value={promptConfig?.personality ?? ''}
                    onChange={(e) => setPromptConfig(c => c ? { ...c, personality: e.target.value } : null)}
                    placeholder="Amigable, servicial, profesional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idioma preferido</Label>
                  <Input
                    value={promptConfig?.language ?? ''}
                    onChange={(e) => setPromptConfig(c => c ? { ...c, language: e.target.value } : null)}
                    placeholder="Español"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Saludo Inicial</Label>
                <Input
                  value={promptConfig?.greeting ?? ''}
                  onChange={(e) => setPromptConfig(c => c ? { ...c, greeting: e.target.value } : null)}
                  placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensaje cuando no sabe responder</Label>
                <Textarea
                  value={promptConfig?.fallback_message ?? ''}
                  onChange={(e) => setPromptConfig(c => c ? { ...c, fallback_message: e.target.value } : null)}
                  placeholder="Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <Label>Restricciones</Label>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Puede hablar de precios</p>
                      <p className="text-xs text-muted-foreground">Permitir discutir precios y costos</p>
                    </div>
                    <Switch
                      checked={promptConfig?.can_discuss_pricing ?? false}
                      onCheckedChange={(v) => setPromptConfig(c => c ? { ...c, can_discuss_pricing: v } : null)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Puede hablar de competencia</p>
                      <p className="text-xs text-muted-foreground">Permitir mencionar competidores</p>
                    </div>
                    <Switch
                      checked={promptConfig?.can_discuss_competitors ?? false}
                      onCheckedChange={(v) => setPromptConfig(c => c ? { ...c, can_discuss_competitors: v } : null)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Puede compartir datos de usuario</p>
                      <p className="text-xs text-muted-foreground">Permitir revelar info del usuario</p>
                    </div>
                    <Switch
                      checked={promptConfig?.can_share_user_data ?? false}
                      onCheckedChange={(v) => setPromptConfig(c => c ? { ...c, can_share_user_data: v } : null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instrucciones Adicionales</Label>
                <Textarea
                  value={promptConfig?.custom_instructions ?? ''}
                  onChange={(e) => setPromptConfig(c => c ? { ...c, custom_instructions: e.target.value } : null)}
                  placeholder="Instrucciones específicas adicionales..."
                  rows={4}
                />
              </div>

              <Button onClick={savePromptConfig} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Prompt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Base de Conocimiento</CardTitle>
                  <CardDescription>
                    Entrena al asistente con información de tu organización
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Conocimiento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newKnowledge.title}
                          onChange={(e) => setNewKnowledge(k => ({ ...k, title: e.target.value }))}
                          placeholder="¿Cómo funciona X?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={newKnowledge.knowledge_type}
                          onValueChange={(v) => setNewKnowledge(k => ({ ...k, knowledge_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KNOWLEDGE_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contenido</Label>
                        <Textarea
                          value={newKnowledge.content}
                          onChange={(e) => setNewKnowledge(k => ({ ...k, content: e.target.value }))}
                          placeholder="Explica detalladamente..."
                          rows={6}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={addKnowledge}>Agregar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {knowledge.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay conocimiento agregado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledge.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.title}</TableCell>
                        <TableCell><Badge variant="outline">{KNOWLEDGE_TYPES.find(t => t.value === k.knowledge_type)?.label}</Badge></TableCell>
                        <TableCell><Switch checked={k.is_active} onCheckedChange={(v) => toggleActive('ai_assistant_knowledge', k.id, v)} /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteItem('ai_assistant_knowledge', k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flows Tab */}
        <TabsContent value="flows">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Flujos Conversacionales</CardTitle>
                  <CardDescription>Define flujos guiados para onboarding, soporte, etc.</CardDescription>
                </div>
                <Dialog open={flowDialogOpen} onOpenChange={setFlowDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo Flujo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo Flujo Conversacional</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={newFlow.name} onChange={(e) => setNewFlow(f => ({ ...f, name: e.target.value }))} placeholder="Onboarding nuevo usuario" />
                      </div>
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea value={newFlow.description} onChange={(e) => setNewFlow(f => ({ ...f, description: e.target.value }))} placeholder="Guía paso a paso para..." rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Palabras clave (separadas por coma)</Label>
                        <Input value={newFlow.trigger_keywords} onChange={(e) => setNewFlow(f => ({ ...f, trigger_keywords: e.target.value }))} placeholder="ayuda, empezar, cómo funciona" />
                      </div>
                      <div className="space-y-2">
                        <Label>Intención</Label>
                        <Input value={newFlow.trigger_intent} onChange={(e) => setNewFlow(f => ({ ...f, trigger_intent: e.target.value }))} placeholder="onboarding, soporte" />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Input type="number" value={newFlow.priority} onChange={(e) => setNewFlow(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))} min={1} max={100} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFlowDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={addFlow}>Crear Flujo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {flows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay flujos configurados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Intención</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flows.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell><Badge variant="outline">{f.trigger_intent || '-'}</Badge></TableCell>
                        <TableCell>{f.priority}</TableCell>
                        <TableCell><Switch checked={f.is_active} onCheckedChange={(v) => toggleActive('ai_conversation_flows', f.id, v)} /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteItem('ai_conversation_flows', f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positive Examples Tab */}
        <TabsContent value="positive">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Ejemplos Positivos</CardTitle>
                  <CardDescription>Enseña al asistente cómo DEBE responder</CardDescription>
                </div>
                <Dialog open={exampleDialogOpen} onOpenChange={setExampleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar Ejemplo</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Nuevo Ejemplo Positivo</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pregunta del usuario</Label>
                        <Textarea value={newExample.user_question} onChange={(e) => setNewExample(ex => ({ ...ex, user_question: e.target.value }))} placeholder="¿Cómo puedo cambiar mi contraseña?" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Respuesta ideal</Label>
                        <Textarea value={newExample.ideal_response} onChange={(e) => setNewExample(ex => ({ ...ex, ideal_response: e.target.value }))} placeholder="Para cambiar tu contraseña, ve a Configuración > Seguridad..." rows={4} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Categoría</Label>
                          <Select value={newExample.category} onValueChange={(v) => setNewExample(ex => ({ ...ex, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EXAMPLE_CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Notas de contexto</Label>
                          <Input value={newExample.context_notes} onChange={(e) => setNewExample(ex => ({ ...ex, context_notes: e.target.value }))} placeholder="Usuario nuevo, frustrado, etc." />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setExampleDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={addPositiveExample}>Agregar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {positiveExamples.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ThumbsUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay ejemplos positivos</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {positiveExamples.map((ex) => (
                      <Card key={ex.id} className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{EXAMPLE_CATEGORIES.find(c => c.value === ex.category)?.label}</Badge>
                              <Switch checked={ex.is_active} onCheckedChange={(v) => toggleActive('ai_positive_examples', ex.id, v)} />
                            </div>
                            <p className="text-sm font-medium">Q: {ex.user_question}</p>
                            <p className="text-sm text-muted-foreground">A: {ex.ideal_response}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem('ai_positive_examples', ex.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negative Rules Tab */}
        <TabsContent value="negative">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Reglas Negativas</CardTitle>
                  <CardDescription>Define lo que el asistente NO debe hacer o decir</CardDescription>
                </div>
                <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive"><Plus className="h-4 w-4 mr-2" />Nueva Regla</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nueva Regla Negativa</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de regla</Label>
                        <Select value={newRule.rule_type} onValueChange={(v) => setNewRule(r => ({ ...r, rule_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Patrón / Descripción</Label>
                        <Textarea value={newRule.pattern} onChange={(e) => setNewRule(r => ({ ...r, pattern: e.target.value }))} placeholder="Nunca mencionar precios de competidores..." rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Razón</Label>
                        <Input value={newRule.reason} onChange={(e) => setNewRule(r => ({ ...r, reason: e.target.value }))} placeholder="Política de la empresa" />
                      </div>
                      <div className="space-y-2">
                        <Label>Severidad</Label>
                        <Select value={newRule.severity} onValueChange={(v) => setNewRule(r => ({ ...r, severity: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SEVERITIES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancelar</Button>
                      <Button variant="destructive" onClick={addNegativeRule}>Agregar Regla</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {negativeRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay reglas negativas configuradas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Patrón</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {negativeRules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{RULE_TYPES.find(t => t.value === r.rule_type)?.label}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pattern}</TableCell>
                        <TableCell>
                          <Badge variant={r.severity === 'critical' ? 'destructive' : r.severity === 'high' ? 'destructive' : 'secondary'}>
                            {SEVERITIES.find(s => s.value === r.severity)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggleActive('ai_negative_rules', r.id, v)} /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteItem('ai_negative_rules', r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback de Usuarios</CardTitle>
              <CardDescription>Calificaciones y comentarios sobre las respuestas del asistente</CardDescription>
            </CardHeader>
            <CardContent>
              {feedback.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay feedback recibido aún</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {feedback.map((fb) => (
                      <Card key={fb.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {fb.rating === 'positive' ? (
                            <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <ThumbsDown className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={fb.rating === 'positive' ? 'default' : 'destructive'}>
                                {fb.rating === 'positive' ? 'Útil' : 'No útil'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(fb.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                              </span>
                            </div>
                            {fb.user_question && <p className="text-sm"><strong>Q:</strong> {fb.user_question}</p>}
                            {fb.ai_response && <p className="text-sm text-muted-foreground"><strong>A:</strong> {fb.ai_response.substring(0, 200)}...</p>}
                            {fb.comment && <p className="text-sm italic border-l-2 pl-2 mt-2">{fb.comment}</p>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de Conversaciones</CardTitle>
              <CardDescription>Últimas 50 interacciones con el asistente</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay conversaciones registradas</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="border-b pb-4 last:border-0">
                        <div className="text-xs text-muted-foreground mb-2">
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                        </div>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Badge variant="outline">Usuario</Badge>
                            <p className="text-sm flex-1">{log.user_message}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge>IA</Badge>
                            <p className="text-sm flex-1 text-muted-foreground">{log.assistant_response.substring(0, 300)}...</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
