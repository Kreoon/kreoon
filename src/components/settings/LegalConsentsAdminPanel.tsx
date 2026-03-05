import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText, Search, CheckCircle2, XCircle, Clock,
  PenTool, Shield, Download, Eye, Loader2, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserConsent {
  id: string;
  user_id: string;
  document_id: string;
  document_type: string;
  document_version: string;
  accepted: boolean;
  accepted_at: string;
  ip_address: string;
  user_agent: string;
  consent_method: string;
  is_current: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    username: string;
  };
}

interface DigitalSignature {
  id: string;
  user_id: string;
  document_id: string;
  document_type: string;
  document_version: string;
  signer_full_name: string;
  signer_email: string;
  signer_document_type: string;
  signer_document_number: string;
  signature_method: string;
  typed_signature: string;
  signature_image_url: string;
  declaration_text: string;
  ip_address: string;
  user_agent: string;
  timestamp_utc: string;
  content_hash: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    username: string;
  };
}

interface ConsentStats {
  total_users: number;
  users_with_consents: number;
  total_consents: number;
  total_signatures: number;
}

export function LegalConsentsAdminPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsent, setSelectedConsent] = useState<UserConsent | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<DigitalSignature | null>(null);

  // Estadísticas generales
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['legal-admin-stats'],
    queryFn: async (): Promise<ConsentStats> => {
      const [usersRes, consentsRes, signaturesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_legal_consents').select('id', { count: 'exact', head: true }),
        supabase.from('digital_signatures').select('id', { count: 'exact', head: true }),
      ]);

      const usersWithConsentsRes = await supabase
        .from('user_legal_consents')
        .select('user_id')
        .eq('accepted', true);

      const uniqueUsers = new Set((usersWithConsentsRes.data || []).map(c => c.user_id));

      return {
        total_users: usersRes.count || 0,
        users_with_consents: uniqueUsers.size,
        total_consents: consentsRes.count || 0,
        total_signatures: signaturesRes.count || 0,
      };
    },
  });

  // Lista de consentimientos
  const { data: consents, isLoading: loadingConsents, error: consentsError } = useQuery({
    queryKey: ['legal-admin-consents', searchTerm],
    queryFn: async () => {
      // Primero obtener los consentimientos
      const { data: consentsData, error: consentsErr } = await supabase
        .from('user_legal_consents')
        .select('*')
        .order('accepted_at', { ascending: false })
        .limit(100);

      if (consentsErr) {
        console.error('[LegalConsentsAdmin] Error fetching consents:', consentsErr);
        throw consentsErr;
      }

      if (!consentsData || consentsData.length === 0) {
        return [];
      }

      // Luego obtener los perfiles de esos usuarios
      const userIds = [...new Set(consentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combinar datos
      let result = consentsData.map(consent => ({
        ...consent,
        profiles: profilesMap.get(consent.user_id) || null,
      }));

      // Filtrar por búsqueda si hay término
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(c => {
          const profile = c.profiles;
          if (!profile) return false;
          return (
            profile.full_name?.toLowerCase().includes(term) ||
            profile.email?.toLowerCase().includes(term) ||
            profile.username?.toLowerCase().includes(term)
          );
        });
      }

      return result as UserConsent[];
    },
  });

  // Log para debug
  if (consentsError) {
    console.error('[LegalConsentsAdmin] Query error:', consentsError);
  }

  // Lista de firmas digitales
  const { data: signatures, isLoading: loadingSignatures, error: signaturesError } = useQuery({
    queryKey: ['legal-admin-signatures', searchTerm],
    queryFn: async () => {
      // Obtener firmas
      const { data: signaturesData, error: sigsErr } = await supabase
        .from('digital_signatures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (sigsErr) {
        console.error('[LegalConsentsAdmin] Error fetching signatures:', sigsErr);
        throw sigsErr;
      }

      if (!signaturesData || signaturesData.length === 0) {
        return [];
      }

      // Obtener perfiles
      const userIds = [...new Set(signaturesData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combinar datos
      let result = signaturesData.map(sig => ({
        ...sig,
        profiles: profilesMap.get(sig.user_id) || null,
      }));

      // Filtrar por búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(s =>
          s.signer_full_name?.toLowerCase().includes(term) ||
          s.signer_email?.toLowerCase().includes(term)
        );
      }

      return result as DigitalSignature[];
    },
  });

  // Log para debug
  if (signaturesError) {
    console.error('[LegalConsentsAdmin] Signatures error:', signaturesError);
  }

  const getDocTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      terms_of_service: 'Términos de Servicio',
      privacy_policy: 'Política de Privacidad',
      acceptable_use_policy: 'Uso Aceptable',
      cookie_policy: 'Cookies',
      age_verification_policy: 'Verificación Edad',
      creator_agreement: 'Acuerdo Creador',
      content_moderation_policy: 'Moderación',
      dmca_policy: 'DMCA',
      brand_agreement: 'Acuerdo Marca',
      escrow_payment_terms: 'Escrow/Pagos',
      white_label_agreement: 'White Label',
      data_processing_agreement: 'DPA',
    };
    return labels[type] || type;
  };

  const getSignatureMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      clickwrap: 'Click',
      typed_name: 'Nombre escrito',
      drawn_signature: 'Firma dibujada',
    };
    return labels[method] || method;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registrados en la plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Consentimientos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.users_with_consents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Han aceptado documentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consentimientos</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.total_consents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros de aceptación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmas Digitales</CardTitle>
            <PenTool className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.total_signatures || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Documentos firmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="consents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consents" className="gap-2">
            <FileText className="h-4 w-4" />
            Consentimientos ({consents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="signatures" className="gap-2">
            <PenTool className="h-4 w-4" />
            Firmas Digitales ({signatures?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab Consentimientos */}
        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <CardTitle>Consentimientos Legales</CardTitle>
              <CardDescription>
                Registro de aceptación de documentos legales por usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : consents && consents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consents.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {consent.profiles?.full_name || 'Sin nombre'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {consent.profiles?.email || consent.user_id.slice(0, 8)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getDocTypeLabel(consent.document_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            v{consent.document_version}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {getSignatureMethodLabel(consent.consent_method)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(consent.accepted_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {consent.accepted ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aceptado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rechazado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedConsent(consent)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron consentimientos
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Firmas Digitales */}
        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Firmas Digitales</CardTitle>
              <CardDescription>
                Documentos con firma digital avanzada (nombre escrito o firma dibujada)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSignatures ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : signatures && signatures.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firmante</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatures.map((sig) => (
                      <TableRow key={sig.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sig.signer_full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sig.signer_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sig.signer_document_type}: {sig.signer_document_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getDocTypeLabel(sig.document_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            v{sig.document_version}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {sig.signature_method === 'drawn_signature' ? (
                              <PenTool className="h-3 w-3 text-purple-500" />
                            ) : (
                              <FileText className="h-3 w-3 text-blue-500" />
                            )}
                            <span className="text-sm">
                              {getSignatureMethodLabel(sig.signature_method)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(sig.timestamp_utc || sig.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sig.status === 'valid' ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <Shield className="h-3 w-3 mr-1" />
                              Válida
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {sig.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSignature(sig)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron firmas digitales
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Detalle Consentimiento */}
      <Dialog open={!!selectedConsent} onOpenChange={() => setSelectedConsent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Consentimiento</DialogTitle>
            <DialogDescription>
              Información completa del registro de consentimiento
            </DialogDescription>
          </DialogHeader>
          {selectedConsent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Usuario</p>
                  <p className="font-medium">{selectedConsent.profiles?.full_name}</p>
                  <p className="text-sm">{selectedConsent.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium">{getDocTypeLabel(selectedConsent.document_type)}</p>
                  <p className="text-sm">Versión {selectedConsent.document_version}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de aceptación</p>
                  <p className="font-medium">{formatDate(selectedConsent.accepted_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método</p>
                  <p className="font-medium">{getSignatureMethodLabel(selectedConsent.consent_method)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dirección IP</p>
                <p className="font-mono text-sm">{selectedConsent.ip_address || 'No registrada'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User Agent</p>
                <p className="font-mono text-xs break-all">{selectedConsent.user_agent || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID del Registro</p>
                <p className="font-mono text-xs">{selectedConsent.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detalle Firma */}
      <Dialog open={!!selectedSignature} onOpenChange={() => setSelectedSignature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Detalle de Firma Digital
            </DialogTitle>
            <DialogDescription>
              Información completa de la firma electrónica
            </DialogDescription>
          </DialogHeader>
          {selectedSignature && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Firmante</p>
                  <p className="font-medium">{selectedSignature.signer_full_name}</p>
                  <p className="text-sm">{selectedSignature.signer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento de Identidad</p>
                  <p className="font-medium">{selectedSignature.signer_document_type}</p>
                  <p className="text-sm">{selectedSignature.signer_document_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Documento Firmado</p>
                  <p className="font-medium">{getDocTypeLabel(selectedSignature.document_type)}</p>
                  <p className="text-sm">Versión {selectedSignature.document_version}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha y Hora UTC</p>
                  <p className="font-medium">{formatDate(selectedSignature.timestamp_utc || selectedSignature.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Método de Firma</p>
                <p className="font-medium">{getSignatureMethodLabel(selectedSignature.signature_method)}</p>
              </div>
              {selectedSignature.typed_signature && (
                <div>
                  <p className="text-sm text-muted-foreground">Firma Escrita</p>
                  <p className="font-medium text-lg italic">"{selectedSignature.typed_signature}"</p>
                </div>
              )}
              {selectedSignature.signature_image_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Firma Dibujada</p>
                  <div className="bg-white rounded-lg p-4 border">
                    <img
                      src={selectedSignature.signature_image_url}
                      alt="Firma digital"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Declaración</p>
                <p className="text-sm italic bg-muted/50 p-3 rounded-lg">
                  "{selectedSignature.declaration_text}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dirección IP</p>
                  <p className="font-mono text-sm">{selectedSignature.ip_address || 'No registrada'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hash del Contenido</p>
                  <p className="font-mono text-xs truncate">{selectedSignature.content_hash || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID de la Firma</p>
                <p className="font-mono text-xs">{selectedSignature.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegalConsentsAdminPanel;
