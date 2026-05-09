import { useState, useEffect, useCallback } from 'react';
import { Copy, Plus, Trash2, Zap, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff, RefreshCw, Building2, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type TargetType = 'organization' | 'client' | 'talent';

interface TargetOption {
  value: TargetType;
  label: string;
  description: string;
}

const TARGET_ICONS: Record<TargetType, React.ElementType> = {
  organization: Building2,
  client: Users,
  talent: User,
};

const MCP_SERVER_URL = 'https://mcp.kreoon.com';

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
  'scripts:read': 'Leer guiones',
  'scripts:write': 'Crear guiones',
  'adn:read': 'Ver ADN',
  'adn:write': 'Iniciar ADN',
  'profiles:read': 'Ver perfil',
  'profiles:write': 'Editar perfil',
  'creators:read': 'Buscar creadores',
  'creators:write': 'Contratar creadores',
  'campaigns:read': 'Ver campañas',
  'campaigns:write': 'Gestionar campañas',
  'wallet:read': 'Ver billetera',
  'wallet:write': 'Retirar fondos',
  'social:read': 'Ver social',
  'social:write': 'Publicar en redes',
  'analytics:read': 'Ver analytics',
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
  const [targetOptions, setTargetOptions] = useState<TargetOption[] | null>(null);

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
      toast({ title: 'Error cargando keys', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async (target_type?: TargetType) => {
    setCreating(true);
    setNewKey(null);
    setTargetOptions(null);
    try {
      const body: Record<string, string> = { action: 'create' };
      if (target_type) body.target_type = target_type;

      const { data, error } = await supabase.functions.invoke('mcp-key-manager', { body });

      if (error) throw error;

      // Admin sin selección → mostrar dialog de opciones
      if (data.needs_target_selection) {
        setTargetOptions(data.options as TargetOption[]);
        return;
      }

      setNewKey(data.key);
      setShowKey(true);
      await loadKeys();
      toast({ title: '✅ API Key creada', description: 'Cópiala ahora — no volverá a mostrarse.' });
    } catch (err) {
      const msg = await extractErrMsg(err);
      toast({ title: 'Error creando key', description: msg, variant: 'destructive' });
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
      toast({ title: 'Key revocada', description: 'La key ya no tiene acceso.' });
    } catch (err) {
      toast({ title: 'Error revocando key', description: String(err), variant: 'destructive' });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-medieval">Integraciones MCP</h2>
        <p className="text-muted-foreground mt-1">
          Conecta tus herramientas favoritas (n8n, Make, Claude, Zapier) a Kreoon usando el protocolo MCP.
          Genera guiones, lanza ADN Research y gestiona tu perfil desde cualquier plataforma.
        </p>
      </div>

      {/* Dialog: selección de target para admins */}
      <Dialog open={!!targetOptions} onOpenChange={(open) => { if (!open) setTargetOptions(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Para quién es esta API Key?</DialogTitle>
            <DialogDescription>
              Como admin puedes crear keys con distintos permisos según el tipo de cuenta que la usará.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {targetOptions?.map((opt) => {
              const Icon = TARGET_ICONS[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => createKey(opt.value)}
                  disabled={creating}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 text-left transition-colors disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nueva key generada — aviso único */}
      {newKey && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <p className="font-semibold text-amber-600 mb-2">⚠️ Copia tu API Key AHORA — no volverá a mostrarse</p>
            <div className="flex items-center gap-2 bg-background rounded-md p-2 font-mono text-sm">
              <span className="flex-1 truncate">
                {showKey ? newKey : newKey.replace(/(?<=^sk-kreoon-.{8}).+/, '•'.repeat(32))}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(v => !v)}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(newKey, 'API Key')}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setNewKey(null)}>
              Ya la copié, cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Keys activas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Mis API Keys</CardTitle>
            <CardDescription>Máximo 3 keys activas simultáneas</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadKeys} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => createKey()}
              disabled={creating || activeKeys.length >= 3}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? 'Creando...' : 'Nueva Key'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Cargando...</div>
          ) : activeKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No tienes keys activas.</p>
              <p>Crea una para empezar a conectar tus herramientas.</p>
            </div>
          ) : (
            activeKeys.map(key => (
              <div key={key.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="font-mono text-sm font-medium truncate">{key.key_prefix}...</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => copyText(key.key_prefix + '...', 'Prefijo')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs py-0">
                        {SCOPE_LABELS[s] ?? s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {key.rate_limit_per_hour.toLocaleString()} req/hora
                    {key.last_used_at
                      ? ` · Último uso ${new Date(key.last_used_at).toLocaleDateString('es-CO')}`
                      : ' · Sin uso'}
                    {' · Expira '}{new Date(key.expires_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                  onClick={() => revokeKey(key.id)}
                  disabled={revoking === key.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Instrucciones de conexión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conectar tus herramientas</CardTitle>
          <CardDescription>URL del servidor: <code className="text-xs bg-muted px-1 rounded">{MCP_SERVER_URL}</code></CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="n8n">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="n8n">n8n</TabsTrigger>
              <TabsTrigger value="make">Make</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="api">REST API</TabsTrigger>
            </TabsList>

            {/* n8n */}
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

            {/* Make.com */}
            <TabsContent value="make" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">En Make.com, usa el módulo <strong>HTTP → Make an API Call</strong>:</p>
              <CodeBlock onCopy={copyText} label="Make.com Config" content={`URL: ${MCP_SERVER_URL}/v1/tools/start_adn_research
Method: POST
Headers:
  Authorization: Bearer sk-kreoon-TU_KEY_AQUI
  Content-Type: application/json

Body (Raw):
{
  "product_id": "{{productId}}"
}`} />
            </TabsContent>

            {/* Claude Desktop */}
            <TabsContent value="claude" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Agrega esto a tu <code className="text-xs bg-muted px-1 rounded">claude_desktop_config.json</code>:
              </p>
              <CodeBlock onCopy={copyText} label="Claude Desktop Config" content={`{
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
              <p className="text-xs text-muted-foreground">
                📍 Ubicación del config — Mac: <code>~/.config/Claude/claude_desktop_config.json</code> · Windows: <code>%APPDATA%\Claude\</code>
              </p>
            </TabsContent>

            {/* REST API */}
            <TabsContent value="api" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">Cualquier lenguaje o herramienta que soporte HTTP:</p>
              <CodeBlock onCopy={copyText} label="cURL example" content={`curl -X POST ${MCP_SERVER_URL}/v1/tools/search_creators \\
  -H "Authorization: Bearer sk-kreoon-TU_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "UGC Colombia", "min_score": 75, "limit": 10}'`} />
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`${MCP_SERVER_URL}/v1/tools`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver todas las tools disponibles
                </a>
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Keys históricas */}
      {expiredKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Keys revocadas o expiradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredKeys.map(key => (
              <div key={key.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="font-mono">{key.key_prefix}...</span>
                <span>·</span>
                <span>{key.is_revoked ? 'Revocada' : 'Expirada'}</span>
                <span>·</span>
                <span>{new Date(key.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── CodeBlock helper ────────────────────────────────────────────────────────

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
