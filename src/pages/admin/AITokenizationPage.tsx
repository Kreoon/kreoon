import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Coins, Brain, Settings, Users, RefreshCw, 
  Loader2, Save, Sparkles, TrendingUp, History,
  ChevronRight, AlertCircle, Cpu
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TokenizationConfig {
  id: string;
  is_enabled: boolean;
  min_token_cost: number;
  max_token_cost: number;
  evaluation_prompt: string | null;
  weight_profile_completeness: number;
  weight_achievements: number;
  weight_experience: number;
  weight_engagement: number;
  ai_model: string;
}

const AI_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Rápido y económico (recomendado)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Más rápido, menos preciso' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mayor precisión, más costoso' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', description: 'Rápido y económico' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Balance costo/calidad' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Máxima precisión, más costoso' },
];

interface ProfileWithTokens {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  ai_token_cost: number | null;
  ai_token_cost_updated_at: string | null;
  ai_token_cost_reason: string | null;
}

interface TokenEvaluation {
  id: string;
  profile_id: string;
  token_cost: number;
  evaluation_reason: string;
  evaluation_factors: Record<string, number>;
  evaluated_at: string;
  evaluated_by: string;
  profiles?: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function AITokenizationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TokenizationConfig | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithTokens[]>([]);
  const [evaluations, setEvaluations] = useState<TokenEvaluation[]>([]);
  const [evaluatingProfile, setEvaluatingProfile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, profilesRes, evaluationsRes] = await Promise.all([
        supabase.from('ai_tokenization_config').select('*').limit(1).single(),
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, ai_token_cost, ai_token_cost_updated_at, ai_token_cost_reason')
          .eq('is_public', true)
          .order('ai_token_cost', { ascending: false, nullsFirst: false })
          .limit(100),
        supabase
          .from('profile_token_evaluations')
          .select(`
            *,
            profiles:profile_id (full_name, username, avatar_url)
          `)
          .order('evaluated_at', { ascending: false })
          .limit(50),
      ]);

      if (configRes.data) setConfig(configRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (evaluationsRes.data) setEvaluations(evaluationsRes.data as TokenEvaluation[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_tokenization_config')
        .update({
          is_enabled: config.is_enabled,
          min_token_cost: config.min_token_cost,
          max_token_cost: config.max_token_cost,
          evaluation_prompt: config.evaluation_prompt,
          weight_profile_completeness: config.weight_profile_completeness,
          weight_achievements: config.weight_achievements,
          weight_experience: config.weight_experience,
          weight_engagement: config.weight_engagement,
          ai_model: config.ai_model,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const evaluateProfile = async (profileId: string) => {
    setEvaluatingProfile(profileId);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-profile-tokens', {
        body: { profile_id: profileId, force_recalculate: true }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Perfil evaluado: ${data.token_cost} tokens`);
        // Refresh data
        fetchData();
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error evaluating profile:', error);
      toast.error(error.message || 'Error al evaluar perfil');
    } finally {
      setEvaluatingProfile(null);
    }
  };

  const evaluateAllProfiles = async () => {
    const publicProfiles = profiles.filter(p => !p.ai_token_cost_updated_at);
    if (publicProfiles.length === 0) {
      toast.info('Todos los perfiles ya han sido evaluados');
      return;
    }

    toast.info(`Evaluando ${publicProfiles.length} perfiles...`);
    
    for (const profile of publicProfiles.slice(0, 10)) { // Limit to 10 at a time
      await evaluateProfile(profile.id);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    toast.success('Evaluación completada');
  };

  const getTokenBadgeColor = (cost: number | null) => {
    if (!cost) return 'bg-gray-500';
    if (cost <= 1) return 'bg-green-500';
    if (cost <= 2) return 'bg-blue-500';
    if (cost <= 3) return 'bg-yellow-500';
    if (cost <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalWeights = (config?.weight_profile_completeness || 0) + 
    (config?.weight_achievements || 0) + 
    (config?.weight_experience || 0) + 
    (config?.weight_engagement || 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              Tokens IA • Valoración IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistema de evaluación automática de perfiles con IA
            </p>
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <Badge variant={config.is_enabled ? "default" : "secondary"}>
                {config.is_enabled ? 'Activo' : 'Inactivo'}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                  <p className="text-sm text-muted-foreground">Perfiles públicos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-green-500/10">
                  <Sparkles className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profiles.filter(p => p.ai_token_cost_updated_at).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Evaluados por IA</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-yellow-500/10">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profiles.length > 0 
                      ? (profiles.reduce((sum, p) => sum + (p.ai_token_cost || 3), 0) / profiles.length).toFixed(1)
                      : '0'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Costo promedio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-purple-500/10">
                  <History className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{evaluations.length}</p>
                  <p className="text-sm text-muted-foreground">Evaluaciones totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Perfiles
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>
                    Ajusta los parámetros del sistema de tokenización
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sistema activo</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilitar evaluación automática con IA
                      </p>
                    </div>
                    <Switch
                      checked={config?.is_enabled || false}
                      onCheckedChange={(checked) => 
                        setConfig(prev => prev ? { ...prev, is_enabled: checked } : null)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Modelo de IA
                    </Label>
                    <Select
                      value={config?.ai_model || 'google/gemini-2.5-flash'}
                      onValueChange={(value) => 
                        setConfig(prev => prev ? { ...prev, ai_model: value } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El modelo seleccionado se usará para evaluar los perfiles
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Rango de tokens: {config?.min_token_cost} - {config?.max_token_cost}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={config?.min_token_cost || 1}
                        onChange={(e) => 
                          setConfig(prev => prev ? { ...prev, min_token_cost: parseInt(e.target.value) || 1 } : null)
                        }
                        className="w-20"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={config?.max_token_cost || 5}
                        onChange={(e) => 
                          setConfig(prev => prev ? { ...prev, max_token_cost: parseInt(e.target.value) || 5 } : null)
                        }
                        className="w-20"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Prompt de evaluación</Label>
                    <Textarea
                      value={config?.evaluation_prompt || ''}
                      onChange={(e) => 
                        setConfig(prev => prev ? { ...prev, evaluation_prompt: e.target.value } : null)
                      }
                      placeholder="Instrucciones adicionales para la IA..."
                      rows={4}
                    />
                  </div>

                  <Button onClick={saveConfig} disabled={saving} className="w-full">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar configuración
                  </Button>
                </CardContent>
              </Card>

              {/* Weights */}
              <Card>
                <CardHeader>
                  <CardTitle>Pesos de evaluación</CardTitle>
                  <CardDescription>
                    Ajusta la importancia de cada factor (total: {totalWeights}%)
                    {totalWeights !== 100 && (
                      <span className="text-yellow-500 ml-2">
                        <AlertCircle className="h-4 w-4 inline" /> Debería sumar 100%
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Completitud del perfil</Label>
                      <span className="text-sm font-medium">{config?.weight_profile_completeness}%</span>
                    </div>
                    <Slider
                      value={[config?.weight_profile_completeness || 25]}
                      onValueChange={([value]) => 
                        setConfig(prev => prev ? { ...prev, weight_profile_completeness: value } : null)
                      }
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Logros obtenidos</Label>
                      <span className="text-sm font-medium">{config?.weight_achievements}%</span>
                    </div>
                    <Slider
                      value={[config?.weight_achievements || 25]}
                      onValueChange={([value]) => 
                        setConfig(prev => prev ? { ...prev, weight_achievements: value } : null)
                      }
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Nivel de experiencia</Label>
                      <span className="text-sm font-medium">{config?.weight_experience}%</span>
                    </div>
                    <Slider
                      value={[config?.weight_experience || 25]}
                      onValueChange={([value]) => 
                        setConfig(prev => prev ? { ...prev, weight_experience: value } : null)
                      }
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Engagement (seguidores, likes)</Label>
                      <span className="text-sm font-medium">{config?.weight_engagement}%</span>
                    </div>
                    <Slider
                      value={[config?.weight_engagement || 25]}
                      onValueChange={([value]) => 
                        setConfig(prev => prev ? { ...prev, weight_engagement: value } : null)
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Perfiles públicos</CardTitle>
                  <CardDescription>
                    Gestiona el costo de tokens de cada perfil
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                  <Button onClick={evaluateAllProfiles}>
                    <Brain className="h-4 w-4 mr-2" />
                    Evaluar todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Última evaluación</TableHead>
                        <TableHead>Razón</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback>
                                  {profile.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{profile.full_name}</p>
                                {profile.username && (
                                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getTokenBadgeColor(profile.ai_token_cost)} text-white`}>
                              <Coins className="h-3 w-3 mr-1" />
                              {profile.ai_token_cost || 3}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {profile.ai_token_cost_updated_at ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(profile.ai_token_cost_updated_at), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            ) : (
                              <span className="text-sm text-yellow-500">Sin evaluar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {profile.ai_token_cost_reason || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => evaluateProfile(profile.id)}
                              disabled={evaluatingProfile === profile.id}
                            >
                              {evaluatingProfile === profile.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  Evaluar
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de evaluaciones</CardTitle>
                <CardDescription>
                  Registro de todas las evaluaciones realizadas por la IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Razón</TableHead>
                        <TableHead>Factores</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((evaluation) => (
                        <TableRow key={evaluation.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={evaluation.profiles?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {evaluation.profiles?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {evaluation.profiles?.full_name || 'Desconocido'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getTokenBadgeColor(evaluation.token_cost)} text-white`}>
                              {evaluation.token_cost}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {evaluation.evaluation_reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {Object.entries(evaluation.evaluation_factors || {}).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key.substring(0, 3)}: {value}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(evaluation.evaluated_at), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={evaluation.evaluated_by === 'ai' ? 'default' : 'secondary'}>
                              {evaluation.evaluated_by === 'ai' ? (
                                <Brain className="h-3 w-3 mr-1" />
                              ) : (
                                <Users className="h-3 w-3 mr-1" />
                              )}
                              {evaluation.evaluated_by}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
