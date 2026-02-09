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
import { Loader2, Brain, Plus, Trash2, BookOpen, ThumbsUp, Ban, Workflow, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  knowledge_type: string;
  source: string;
  is_active: boolean;
  created_at: string;
}

interface PositiveExample {
  id: string;
  user_question: string;
  ideal_response: string;
  category: string;
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

interface ConversationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_keywords: string[] | null;
  trigger_intent: string | null;
  priority: number;
  is_active: boolean;
}

interface PlatformPrompt {
  id: string;
  assistant_role: string;
  personality: string | null;
  tone: string | null;
  greeting: string | null;
  fallback_message: string | null;
  language: string | null;
  custom_instructions: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const KNOWLEDGE_TYPES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'process', label: 'Proceso' },
  { value: 'policy', label: 'Política' },
  { value: 'guide', label: 'Guía' },
  { value: 'feature', label: 'Funcionalidad' },
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
  { value: 'navigation', label: 'Navegación' },
  { value: 'content', label: 'Contenido' },
];

// Platform org ID placeholder — platform knowledge uses is_platform = true
const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000000';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function KiroBrainPlatform() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [examples, setExamples] = useState<PositiveExample[]>([]);
  const [rules, setRules] = useState<NegativeRule[]>([]);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [prompt, setPrompt] = useState<PlatformPrompt | null>(null);

  // Dialog states
  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);

  // New item forms
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', knowledge_type: 'faq' });
  const [newExample, setNewExample] = useState({ user_question: '', ideal_response: '', category: 'general' });
  const [newRule, setNewRule] = useState({ rule_type: 'forbidden_topic', pattern: '', reason: '', severity: 'medium' });
  const [newFlow, setNewFlow] = useState({ name: '', description: '', trigger_keywords: '', trigger_intent: '', priority: 1 });

  // ─── Fetch all platform data ───
  const fetchData = async () => {
    setLoading(true);
    try {
      const [knowledgeRes, examplesRes, rulesRes, flowsRes, promptRes] = await Promise.all([
        supabase.from('ai_assistant_knowledge').select('*').eq('is_platform', true).order('created_at', { ascending: false }),
        supabase.from('ai_positive_examples').select('*').eq('is_platform', true).order('created_at', { ascending: false }),
        supabase.from('ai_negative_rules').select('*').eq('is_platform', true).order('severity'),
        supabase.from('ai_conversation_flows').select('*').eq('is_platform', true).order('priority'),
        supabase.from('ai_prompt_config').select('*').eq('organization_id', PLATFORM_ORG_ID).maybeSingle(),
      ]);

      setKnowledge((knowledgeRes.data || []) as any);
      setExamples((examplesRes.data || []) as any);
      setRules((rulesRes.data || []) as any);
      setFlows((flowsRes.data || []) as any);

      if (promptRes.data) {
        setPrompt(promptRes.data as any);
      }
    } catch (error) {
      console.error('Error fetching platform brain data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── CRUD Helpers ───
  const addKnowledgeItem = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    try {
      const { error } = await supabase.from('ai_assistant_knowledge').insert({
        organization_id: PLATFORM_ORG_ID,
        title: newKnowledge.title,
        content: newKnowledge.content,
        knowledge_type: newKnowledge.knowledge_type,
        is_platform: true,
        source: 'manual',
      });
      if (error) throw error;
      toast({ title: 'Conocimiento de plataforma agregado' });
      setNewKnowledge({ title: '', content: '', knowledge_type: 'faq' });
      setKnowledgeDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
    }
  };

  const addExampleItem = async () => {
    if (!newExample.user_question || !newExample.ideal_response) return;
    try {
      const { error } = await supabase.from('ai_positive_examples').insert({
        organization_id: PLATFORM_ORG_ID,
        user_question: newExample.user_question,
        ideal_response: newExample.ideal_response,
        category: newExample.category,
        is_platform: true,
      });
      if (error) throw error;
      toast({ title: 'Ejemplo agregado' });
      setNewExample({ user_question: '', ideal_response: '', category: 'general' });
      setExampleDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const addRuleItem = async () => {
    if (!newRule.pattern) return;
    try {
      const { error } = await supabase.from('ai_negative_rules').insert({
        organization_id: PLATFORM_ORG_ID,
        rule_type: newRule.rule_type,
        pattern: newRule.pattern,
        reason: newRule.reason || null,
        severity: newRule.severity,
        is_platform: true,
      });
      if (error) throw error;
      toast({ title: 'Regla agregada' });
      setNewRule({ rule_type: 'forbidden_topic', pattern: '', reason: '', severity: 'medium' });
      setRuleDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const addFlowItem = async () => {
    if (!newFlow.name) return;
    try {
      const { error } = await supabase.from('ai_conversation_flows').insert({
        organization_id: PLATFORM_ORG_ID,
        name: newFlow.name,
        description: newFlow.description || null,
        trigger_keywords: newFlow.trigger_keywords ? newFlow.trigger_keywords.split(',').map(k => k.trim()) : null,
        trigger_intent: newFlow.trigger_intent || null,
        priority: newFlow.priority,
        flow_steps: [],
        is_platform: true,
      });
      if (error) throw error;
      toast({ title: 'Flujo agregado' });
      setNewFlow({ name: '', description: '', trigger_keywords: '', trigger_intent: '', priority: 1 });
      setFlowDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const savePrompt = async () => {
    if (!prompt) return;
    setSaving(true);
    try {
      if (prompt.id) {
        const { error } = await supabase.from('ai_prompt_config').update({
          assistant_role: prompt.assistant_role,
          personality: prompt.personality,
          tone: prompt.tone,
          greeting: prompt.greeting,
          fallback_message: prompt.fallback_message,
          language: prompt.language,
          custom_instructions: prompt.custom_instructions,
          updated_at: new Date().toISOString(),
        }).eq('id', prompt.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('ai_prompt_config').insert({
          organization_id: PLATFORM_ORG_ID,
          assistant_role: prompt.assistant_role,
          personality: prompt.personality,
          tone: prompt.tone,
          greeting: prompt.greeting,
          fallback_message: prompt.fallback_message,
          language: prompt.language,
          custom_instructions: prompt.custom_instructions,
        }).select().single();
        if (error) throw error;
        setPrompt(data as any);
      }
      toast({ title: 'Personalidad guardada' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
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
            <Brain className="h-5 w-5 text-violet-500" />
            KIRO Brain — Entrenamiento de Plataforma
          </CardTitle>
          <CardDescription>
            Conocimiento global que KIRO usa para TODOS los usuarios de la plataforma.
            Las organizaciones pueden agregar su propio conocimiento privado desde sus ajustes.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="knowledge" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Conocimiento
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-1.5 text-xs">
            <ThumbsUp className="h-3.5 w-3.5" />
            Ejemplos
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Ban className="h-3.5 w-3.5" />
            Reglas
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5 text-xs">
            <Workflow className="h-3.5 w-3.5" />
            Flujos
          </TabsTrigger>
          <TabsTrigger value="personality" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Personalidad
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* KNOWLEDGE TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Base de Conocimiento Global</CardTitle>
                  <CardDescription>FAQs, procesos, guías que KIRO debe saber</CardDescription>
                </div>
                <Dialog open={knowledgeDialogOpen} onOpenChange={setKnowledgeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Agregar Conocimiento de Plataforma</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input value={newKnowledge.title} onChange={(e) => setNewKnowledge(k => ({ ...k, title: e.target.value }))} placeholder="¿Cómo funciona X?" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={newKnowledge.knowledge_type} onValueChange={(v) => setNewKnowledge(k => ({ ...k, knowledge_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {KNOWLEDGE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contenido</Label>
                        <Textarea value={newKnowledge.content} onChange={(e) => setNewKnowledge(k => ({ ...k, content: e.target.value }))} placeholder="Explica detalladamente..." rows={6} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setKnowledgeDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={addKnowledgeItem}>Agregar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {knowledge.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay conocimiento de plataforma. Agrega FAQs, guías y procesos para que KIRO los aprenda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledge.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.title}</TableCell>
                        <TableCell><Badge variant="outline">{KNOWLEDGE_TYPES.find(t => t.value === k.knowledge_type)?.label || k.knowledge_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={k.source === 'manual' ? 'secondary' : 'default'} className="text-[10px]">
                            {k.source === 'manual' ? 'Manual' : k.source}
                          </Badge>
                        </TableCell>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* EXAMPLES TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Ejemplos Positivos</CardTitle>
                  <CardDescription>Enseña a KIRO cómo debe responder</CardDescription>
                </div>
                <Dialog open={exampleDialogOpen} onOpenChange={setExampleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Nuevo Ejemplo Positivo</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pregunta del usuario</Label>
                        <Textarea value={newExample.user_question} onChange={(e) => setNewExample(ex => ({ ...ex, user_question: e.target.value }))} placeholder="¿Cómo creo un brief?" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Respuesta ideal de KIRO</Label>
                        <Textarea value={newExample.ideal_response} onChange={(e) => setNewExample(ex => ({ ...ex, ideal_response: e.target.value }))} placeholder="Para crear un brief, ve a..." rows={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select value={newExample.category} onValueChange={(v) => setNewExample(ex => ({ ...ex, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EXAMPLE_CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setExampleDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={addExampleItem}>Agregar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {examples.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ThumbsUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay ejemplos. Agrega pares pregunta/respuesta para entrenar a KIRO.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {examples.map((ex) => (
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
                          <Button variant="ghost" size="icon" onClick={() => deleteItem('ai_positive_examples', ex.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RULES TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Reglas Prohibidas</CardTitle>
                  <CardDescription>Define lo que KIRO NUNCA debe hacer o decir</CardDescription>
                </div>
                <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive"><Plus className="h-4 w-4 mr-2" />Nueva Regla</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nueva Regla Prohibida</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={newRule.rule_type} onValueChange={(v) => setNewRule(r => ({ ...r, rule_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Patrón / Descripción</Label>
                        <Textarea value={newRule.pattern} onChange={(e) => setNewRule(r => ({ ...r, pattern: e.target.value }))} placeholder="Nunca mencionar..." rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Razón</Label>
                        <Input value={newRule.reason} onChange={(e) => setNewRule(r => ({ ...r, reason: e.target.value }))} placeholder="Política de plataforma" />
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
                      <Button variant="destructive" onClick={addRuleItem}>Agregar Regla</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay reglas. Agrega restricciones para proteger la plataforma.</p>
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
                    {rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{RULE_TYPES.find(t => t.value === r.rule_type)?.label}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pattern}</TableCell>
                        <TableCell>
                          <Badge variant={r.severity === 'critical' || r.severity === 'high' ? 'destructive' : 'secondary'}>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FLOWS TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="flows">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Flujos Conversacionales</CardTitle>
                  <CardDescription>Define flujos guiados por palabras clave o intención</CardDescription>
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
                        <Textarea value={newFlow.description} onChange={(e) => setNewFlow(f => ({ ...f, description: e.target.value }))} placeholder="Guía paso a paso..." rows={2} />
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
                      <Button onClick={addFlowItem}>Crear Flujo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {flows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay flujos. Crea flujos guiados para onboarding, soporte, etc.</p>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PERSONALITY TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="personality">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Personalidad Global de KIRO
              </CardTitle>
              <CardDescription>
                Define el tono, saludo y comportamiento base de KIRO.
                Las organizaciones pueden personalizar sobre esta base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Rol del Asistente</Label>
                <Textarea
                  value={prompt?.assistant_role ?? 'Eres KIRO, el asistente IA de la plataforma Kreoon.'}
                  onChange={(e) => setPrompt(p => p ? { ...p, assistant_role: e.target.value } : { id: '', assistant_role: e.target.value, personality: null, tone: null, greeting: null, fallback_message: null, language: null, custom_instructions: null })}
                  placeholder="Eres KIRO, el asistente IA..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Personalidad</Label>
                  <Input
                    value={prompt?.personality ?? ''}
                    onChange={(e) => setPrompt(p => p ? { ...p, personality: e.target.value } : null)}
                    placeholder="Amigable, enérgico, profesional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tono</Label>
                  <Input
                    value={prompt?.tone ?? ''}
                    onChange={(e) => setPrompt(p => p ? { ...p, tone: e.target.value } : null)}
                    placeholder="Cercano, motivador"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Saludo Inicial</Label>
                  <Input
                    value={prompt?.greeting ?? ''}
                    onChange={(e) => setPrompt(p => p ? { ...p, greeting: e.target.value } : null)}
                    placeholder="Hola! Soy KIRO, tu asistente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Input
                    value={prompt?.language ?? ''}
                    onChange={(e) => setPrompt(p => p ? { ...p, language: e.target.value } : null)}
                    placeholder="Español latino"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensaje cuando no sabe responder</Label>
                <Textarea
                  value={prompt?.fallback_message ?? ''}
                  onChange={(e) => setPrompt(p => p ? { ...p, fallback_message: e.target.value } : null)}
                  placeholder="No tengo esa información, pero puedes revisar en..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Instrucciones Adicionales</Label>
                <Textarea
                  value={prompt?.custom_instructions ?? ''}
                  onChange={(e) => setPrompt(p => p ? { ...p, custom_instructions: e.target.value } : null)}
                  placeholder="Instrucciones globales adicionales..."
                  rows={4}
                />
              </div>

              <Button onClick={savePrompt} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Personalidad
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
