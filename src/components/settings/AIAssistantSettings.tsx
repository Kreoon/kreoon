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
import { Loader2, Bot, Plus, Trash2, FileText, BookOpen, History, Settings2 } from 'lucide-react';
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

const PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (Recomendado)' },
];

const MODELS = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Potente)' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanceado)' },
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

export function AIAssistantSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([]);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', knowledge_type: 'faq' });
  const [dialogOpen, setDialogOpen] = useState(false);

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
      // Fetch config
      const { data: configData } = await supabase
        .from('ai_assistant_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (configData) {
        setConfig(configData);
      } else {
        // Create default config
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

      // Fetch knowledge
      const { data: knowledgeData } = await supabase
        .from('ai_assistant_knowledge')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      setKnowledge(knowledgeData || []);

      // Fetch logs
      const { data: logsData } = await supabase
        .from('ai_assistant_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs(logsData || []);
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

  const deleteKnowledge = async (id: string) => {
    try {
      const { error } = await supabase.from('ai_assistant_knowledge').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Conocimiento eliminado' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleKnowledge = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_assistant_knowledge')
        .update({ is_active: isActive })
        .eq('id', id);
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
            Configura y entrena el asistente IA para tu equipo
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Conocimiento
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Historial
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

              <div className="space-y-2">
                <Label>Instrucciones del Sistema</Label>
                <Textarea
                  value={config?.system_prompt ?? ''}
                  onChange={(e) => setConfig(c => c ? { ...c, system_prompt: e.target.value } : null)}
                  placeholder="Eres un asistente útil que ayuda con..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Define cómo debe comportarse el asistente y qué tipo de respuestas dar
                </p>
              </div>

              <Button onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Configuración
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
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={addKnowledge}>
                        Agregar
                      </Button>
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
                  <p className="text-sm">Agrega FAQs, procesos y guías para entrenar al asistente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledge.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {KNOWLEDGE_TYPES.find(t => t.value === k.knowledge_type)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={k.is_active}
                            onCheckedChange={(v) => toggleKnowledge(k.id, v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteKnowledge(k.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de Conversaciones</CardTitle>
              <CardDescription>
                Últimas 50 interacciones con el asistente
              </CardDescription>
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
                      <div key={log.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Usuario</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "d MMM yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm">{log.user_message}</p>
                        <div className="border-t pt-2 mt-2">
                          <Badge variant="secondary">Asistente</Badge>
                          <p className="text-sm mt-1 text-muted-foreground">{log.assistant_response}</p>
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
