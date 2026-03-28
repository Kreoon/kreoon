import { useState } from 'react';
import { Eye, Monitor, Mail, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

export default function WhiteLabelPreviewTab() {
  const {
    capabilities,
    orgBranding,
    isWhiteLabelActive,
    effectivePlatformName,
    effectiveStudioLabel,
    effectiveMarketplaceLabel,
    effectiveSupportEmail,
    effectiveLogoUrl,
  } = useWhiteLabel();

  const primaryColor = orgBranding?.primaryColor || '#8B5CF6';
  const secondaryColor = orgBranding?.secondaryColor || '#6366F1';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Vista Previa
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Así se verá tu marca en diferentes partes de la plataforma
        </p>
      </div>

      <Tabs defaultValue="sidebar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sidebar" className="gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            Sidebar
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" />
            Login
          </TabsTrigger>
        </TabsList>

        {/* Sidebar Preview */}
        <TabsContent value="sidebar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Navegación Lateral</CardTitle>
              <CardDescription>Así se ve el sidebar con tu branding actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-sm border bg-card overflow-hidden max-w-[260px] mx-auto">
                {/* Sidebar header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="h-9 w-9 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={effectiveLogoUrl}
                      alt="Logo"
                      className="h-9 w-9 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: primaryColor }}>
                      {effectivePlatformName}
                    </p>
                    {!isWhiteLabelActive && orgBranding?.name && (
                      <p className="text-[10px] text-muted-foreground">{orgBranding.name}</p>
                    )}
                  </div>
                </div>

                {/* Sidebar section labels */}
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2 mb-1">
                      {effectiveStudioLabel}
                    </p>
                    <div className="space-y-0.5">
                      {['Dashboard', 'Contenido', 'Calendario', 'Clientes'].map((item) => (
                        <div key={item} className="text-xs px-2 py-1.5 rounded-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2 mb-1">
                      {effectiveMarketplaceLabel}
                    </p>
                    <div className="space-y-0.5">
                      {['Explorar', 'Campañas', 'Proyectos'].map((item) => (
                        <div key={item} className="text-xs px-2 py-1.5 rounded-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Powered by */}
                {!capabilities.hidePoweredBy && isWhiteLabelActive && (
                  <div className="border-t px-4 py-2 text-center">
                    <p className="text-[9px] text-muted-foreground/50">Powered by KREOON</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Preview */}
        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email de Notificación</CardTitle>
              <CardDescription>Vista previa de un email enviado desde tu organización</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-sm border bg-card overflow-hidden max-w-md mx-auto">
                {/* Email header */}
                <div className="p-4 text-center border-b border-white/10">
                  <div className="inline-block h-12 w-12 rounded-sm overflow-hidden mb-2">
                    {orgBranding?.logoUrl ? (
                      <img src={orgBranding.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-sm flex items-center justify-center text-white font-bold text-xl"
                        style={{ background: primaryColor }}
                      >
                        {effectivePlatformName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email body */}
                <div className="p-6 text-center">
                  <h3 className="text-white text-base font-semibold mb-2">
                    Nuevo contenido asignado
                  </h3>
                  <p className="text-gray-400 text-xs mb-4">
                    Se te ha asignado un nuevo contenido para producción
                  </p>
                  <div
                    className="inline-block px-6 py-2 rounded-sm text-white text-sm font-medium"
                    style={{ background: primaryColor }}
                  >
                    Ver contenido
                  </div>
                </div>

                {/* Email footer */}
                <div className="border-t border-white/10 p-4 text-center">
                  <p className="text-gray-500 text-[10px]">
                    {effectivePlatformName} — {effectiveSupportEmail}
                  </p>
                </div>

                {/* Sender info */}
                <div className="bg-black/30 px-4 py-2 text-[10px] text-gray-500">
                  <p>
                    De: {orgBranding?.senderName || effectivePlatformName}{' '}
                    &lt;{capabilities.customSenderDomain && orgBranding?.senderEmail
                      ? orgBranding.senderEmail
                      : 'noreply@kreoon.com'}&gt;
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auth Preview */}
        <TabsContent value="auth" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Página de Login</CardTitle>
              <CardDescription>Así verán tus miembros la pantalla de inicio de sesión</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-sm border bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] overflow-hidden max-w-sm mx-auto">
                {/* Auth header */}
                <div className="p-8 flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-sm overflow-hidden">
                    <img
                      src={effectiveLogoUrl}
                      alt="Logo"
                      className="h-14 w-14 object-contain"
                    />
                  </div>
                  <h2 className="text-white text-lg font-bold">{effectivePlatformName}</h2>
                </div>

                {/* Mock form */}
                <div className="px-8 pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 uppercase">Email</p>
                    <div className="h-8 rounded-sm bg-white/5 border border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 uppercase">Contraseña</p>
                    <div className="h-8 rounded-sm bg-white/5 border border-white/10" />
                  </div>
                  <div
                    className="h-9 rounded-sm flex items-center justify-center text-white text-xs font-medium mt-2"
                    style={{ background: primaryColor }}
                  >
                    Iniciar sesión
                  </div>
                </div>

                {/* Domain */}
                <div className="border-t border-white/10 p-3 text-center">
                  <p className="text-[10px] text-gray-500">
                    {orgBranding?.customDomain
                      ? orgBranding.customDomain
                      : orgBranding?.slug
                        ? `${orgBranding.slug}.kreoon.com`
                        : 'kreoon.com'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Capability Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de Capacidades</CardTitle>
          <CardDescription>
            Funciones de marca blanca disponibles en tu plan actual
            {orgBranding?.selectedPlan && (
              <Badge variant="outline" className="ml-2 text-xs capitalize">{orgBranding.selectedPlan}</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <CapRow label="Logo personalizado" enabled={capabilities.customLogo} />
            <CapRow label="Logo modo oscuro" enabled={capabilities.customLogoDark} />
            <CapRow label="Color primario" enabled={capabilities.customPrimaryColor} />
            <CapRow label="Color secundario" enabled={capabilities.customSecondaryColor} />
            <CapRow label="Favicon" enabled={capabilities.customFavicon} />
            <CapRow label="Iconos PWA" enabled={capabilities.customPwaIcons} />
            <CapRow label="Nombre plataforma" enabled={capabilities.customPwaName} />
            <CapRow label="Imagen OG" enabled={capabilities.customOgImage} />
            <CapRow label="Reemplazar KREOON" enabled={capabilities.replaceKreoonBranding} />
            <CapRow label='Sin "Powered by"' enabled={capabilities.hidePoweredBy} />
            <CapRow label="Subdominio" enabled={capabilities.subdomain} />
            <CapRow label="Dominio custom" enabled={capabilities.customDomain} />
            <CapRow label="Nombre remitente" enabled={capabilities.customSenderName} />
            <CapRow label="Dominio email" enabled={capabilities.customSenderDomain} />
            <CapRow label="Auth emails custom" enabled={capabilities.customAuthEmails} />
            <CapRow label="Email soporte" enabled={capabilities.customSupportEmail} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CapRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
      <span className={enabled ? 'text-foreground' : 'text-muted-foreground/60'}>{label}</span>
    </div>
  );
}
