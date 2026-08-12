import { useState, useEffect, useCallback } from 'react';
import { Copy, Plus, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface MCPKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  is_revoked: boolean;
  expires_at: string;
  last_used_at: string | null;
  created_at: string;
}

const MCP_SERVER_URL = 'https://mcp.kreoon.com';
const TOTAL_SCOPES = 4; // scripts:write, creators:read, profiles:write, social:write

async function extractErrMsg(err: unknown): Promise<string> {
  if (err && typeof err === 'object' && 'context' in err) {
    try {
      const body = await (err as { context: Response }).context.json();
      if (body?.error) return body.error;
    } catch { /* ignore */ }
  }
  return err instanceof Error ? err.message : String(err);
}

const SCOPE_LABELS: Record<string, string> = {
  'scripts:write': 'Crear guiones',
  'profiles:write': 'Editar perfil',
  'creators:read': 'Buscar creadores',
  'social:write': 'Publicar en redes',
};

export default function MCPIntegrationsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<MCPKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('mcp-key-manager', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setKeys(data.keys ?? []);
    } catch (err) {
      toast({ title: 'Ups, no pudimos cargar tus claves', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async () => {
    setCreating(true);
    setNewKey(null);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-key-manager', {
        body: { action: 'create' },
      });

      if (error) throw error;

      setNewKey(data.key);
      setShowKey(true);
      await loadKeys();
      toast({ title: '✅ Tu clave está lista', description: 'Copiala ahora — después no la vas a poder volver a ver.' });
    } catch (err) {
      const msg = await extractErrMsg(err);
      toast({ title: 'No pudimos crear tu clave', description: msg, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    setRevoking(keyId);
    try {
      const { error } = await supabase.functions.invoke('mcp-key-manager', {
        body: { action: 'revoke', key_id: keyId },
      });

      if (error) throw error;
      await loadKeys();
      toast({ title: 'Clave desconectada', description: 'Ya no puede usarse para nada.' });
    } catch (err) {
      toast({ title: 'No pudimos desconectarla', description: String(err), variant: 'destructive' });
    } finally {
      setRevoking(null);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado`, duration: 2000 });
  };

  const activeKeys = keys.filter(k => !k.is_revoked && new Date(k.expires_at) > new Date());
  const expiredKeys = keys.filter(k => k.is_revoked || new Date(k.expires_at) <= new Date());
  const hasActiveKey = activeKeys.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-medieval">Conectar con Claude y otras apps</h2>
        <p className="text-muted-foreground mt-1">
          Con una clave podés dejar que Claude (o tu app favorita) escriba guiones, busque creadores
          y gestione tu cuenta de Kreoon por vos, sin que tengas que entrar a la plataforma.
        </p>
      </div>

      {/* Paso 1: la clave */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
            <CardTitle className="text-base">Creá tu clave</CardTitle>
          </div>
          <CardDescription>Es como una contraseña especial solo para conectar apps. Necesitás una sola.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActiveKey && !loading && (
            <div className="text-center py-6">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
              <p className="text-sm text-muted-foreground mb-4">Todavía no tenés ninguna clave creada.</p>
              <Button size="lg" onClick={createKey} disabled={creating} className="gap-2">
                <Plus className="h-4 w-4" />
                {creating ? 'Creando tu clave...' : 'Crear mi clave'}
              </Button>
            </div>
          )}

          {loading && <div className="text-sm text-muted-foreground py-6 text-center">Cargando...</div>}

          {/* Nueva key generada — aviso único */}
          {newKey && (
            <Alert className="border-amber-500 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                <p className="font-semibold text-amber-600 mb-2">⚠️ Copiá tu clave AHORA — no la vas a volver a ver</p>
                <div className="flex items-center gap-2 bg-background rounded-md p-2 font-mono text-sm">
                  <span className="flex-1 truncate">
                    {showKey ? newKey : newKey.replace(/(?<=^sk-kreoon-.{8}).+/, '•'.repeat(32))}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(v => !v)}>
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(newKey, 'Tu clave')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => copyText(newKey, 'Tu clave')}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar clave
                </Button>
                <Button variant="ghost" size="sm" className="mt-1 text-xs w-full" onClick={() => setNewKey(null)}>
                  Ya la copié, cerrar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {hasActiveKey && activeKeys.map(key => {
            const fullAccess = key.scopes.length >= TOTAL_SCOPES;
            return (
              <div key={key.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="font-mono text-sm font-medium truncate">{key.key_prefix}...</span>
                      <Badge className="text-xs py-0 bg-green-500/15 text-green-600 border-green-500/30">
                        {fullAccess ? '🟢 Acceso total' : '🟡 Acceso limitado a tu rol'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {key.last_used_at
                        ? `Usada por última vez el ${new Date(key.last_used_at).toLocaleDateString('es-CO')}`
                        : 'Todavía no se usó'}
                      {' · Vence el '}{new Date(key.expires_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                    onClick={() => revokeKey(key.id)}
                    disabled={revoking === key.id}
                    title="Desconectar esta clave"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2">
                    <ChevronDown className="h-3 w-3" /> Ver qué puede hacer esta clave
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex flex-wrap gap-1 mt-2">
                    {key.scopes.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs py-0">
                        {SCOPE_LABELS[s] ?? s}
                      </Badge>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {hasActiveKey && activeKeys.length < 3 && (
            <Button variant="outline" size="sm" onClick={createKey} disabled={creating} className="gap-1.5 w-full">
              <Plus className="h-3.5 w-3.5" />
              {creating ? 'Creando...' : 'Crear otra clave (máx. 3)'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Paso 2: conectar */}
      {hasActiveKey && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
              <CardTitle className="text-base">Conectala con Claude</CardTitle>
            </div>
            <CardDescription>Elegí dónde usás Claude y seguí los pasos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="web">
              <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full">
                <TabsTrigger value="web">Claude en la web (claude.ai)</TabsTrigger>
                <TabsTrigger value="desktop">Claude en tu computador</TabsTrigger>
              </TabsList>

              {/* Claude.ai web */}
              <TabsContent value="web" className="pt-4">
                <ol className="space-y-3 text-sm">
                  <Step n={1}>Entrá a <strong>claude.ai</strong> y andá a <strong>Settings → Connectors</strong>.</Step>
                  <Step n={2}>Tocá <strong>"Add custom connector"</strong> (Agregar conector).</Step>
                  <Step n={3}>
                    Pegá esta dirección:
                    <div className="flex items-center gap-2 bg-muted rounded-md p-2 mt-1 font-mono text-xs">
                      <span className="flex-1">{MCP_SERVER_URL}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(MCP_SERVER_URL, 'Dirección')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </Step>
                  <Step n={4}>Cuando te pida tu clave, pegá la que copiaste en el Paso 1. Listo — ya podés pedirle a Claude que use Kreoon.</Step>
                </ol>
              </TabsContent>

              {/* Claude Desktop */}
              <TabsContent value="desktop" className="pt-4">
                <ol className="space-y-3 text-sm">
                  <Step n={1}>Copiá este bloque de texto:</Step>
                </ol>
                <CodeBlock onCopy={copyText} label="Configuración de Claude" content={`{
  "mcpServers": {
    "kreoon": {
      "command": "npx",
      "args": ["-y", "kreoon-mcp-client"],
      "env": {
        "KREOON_API_KEY": "sk-kreoon-TU_KEY_AQUI",
        "KREOON_SERVER": "${MCP_SERVER_URL}"
      }
    }
  }
}`} />
                <ol className="space-y-3 text-sm mt-4" start={2}>
                  <Step n={2}>
                    Abrí el archivo de configuración de Claude en tu computador:
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>💻 <strong>Mac:</strong> <code className="bg-muted px-1 rounded">~/.config/Claude/claude_desktop_config.json</code></p>
                      <p>🪟 <strong>Windows:</strong> <code className="bg-muted px-1 rounded">%APPDATA%\Claude\</code></p>
                    </div>
                  </Step>
                  <Step n={3}>Pegá el bloque que copiaste, y reemplazá <code className="bg-muted px-1 rounded text-xs">TU_KEY_AQUI</code> por tu clave real del Paso 1.</Step>
                  <Step n={4}>Guardá el archivo y cerrá y volvé a abrir Claude. Listo.</Step>
                </ol>
              </TabsContent>
            </Tabs>

            {/* Opciones avanzadas — n8n, Make, API directa */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mt-5 pt-4 border-t">
              <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                ¿Sos developer? Ver más formas de conectar (n8n, Make, API directa)
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <Tabs defaultValue="n8n">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="n8n">n8n</TabsTrigger>
                    <TabsTrigger value="make">Make</TabsTrigger>
                    <TabsTrigger value="api">REST API</TabsTrigger>
                  </TabsList>

                  <TabsContent value="n8n" className="space-y-3 pt-3">
                    <p className="text-sm text-muted-foreground">En n8n, usa el nodo <strong>HTTP Request</strong>:</p>
                    <CodeBlock onCopy={copyText} label="n8n HTTP Request" content={`Method: POST
URL: ${MCP_SERVER_URL}/v1/tools/generate_script
Authentication: Header Auth
  Header: Authorization
  Value: Bearer sk-kreoon-TU_KEY_AQUI

Body (JSON):
{
  "product_id": "{{ $json.product_id }}",
  "platform": "tiktok",
  "hooks_count": 3
}`} />
                  </TabsContent>

                  <TabsContent value="make" className="space-y-3 pt-3">
                    <p className="text-sm text-muted-foreground">En Make.com, usa el módulo <strong>HTTP → Make an API Call</strong>:</p>
                    <CodeBlock onCopy={copyText} label="Make.com Config" content={`URL: ${MCP_SERVER_URL}/v1/tools/generate_script
Method: POST
Headers:
  Authorization: Bearer sk-kreoon-TU_KEY_AQUI
  Content-Type: application/json

Body (Raw):
{
  "product_id": "{{productId}}",
  "platform": "tiktok"
}`} />
                  </TabsContent>

                  <TabsContent value="api" className="space-y-3 pt-3">
                    <p className="text-sm text-muted-foreground">Cualquier lenguaje o herramienta que soporte HTTP:</p>
                    <CodeBlock onCopy={copyText} label="cURL example" content={`curl -X POST ${MCP_SERVER_URL}/v1/tools/search_creators \\
  -H "Authorization: Bearer sk-kreoon-TU_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "UGC Colombia", "min_score": 75, "limit": 10}'`} />
                  </TabsContent>
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Keys históricas */}
      {expiredKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Claves desconectadas o vencidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredKeys.map(key => (
              <div key={key.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="font-mono">{key.key_prefix}...</span>
                <span>·</span>
                <span>{key.is_revoked ? 'Desconectada' : 'Vencida'}</span>
                <span>·</span>
                <span>{new Date(key.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!hasActiveKey && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={loadKeys} disabled={loading} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de presentación ─────────────────────────────────────────────────

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">{n}</span>
      <div className="flex-1">{children}</div>
    </li>
  );
}

function CodeBlock({ content, label, onCopy }: { content: string; label: string; onCopy: (t: string, l: string) => void }) {
  return (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </pre>
      <Button
        variant="ghost" size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => onCopy(content, label)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
