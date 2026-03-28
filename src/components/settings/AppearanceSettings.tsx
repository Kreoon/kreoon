import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Palette, Image, Loader2, Save, Info, Smartphone, Globe, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BrandingSettings {
  platform_name: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  pwa_icon_192: string;
  pwa_icon_512: string;
  og_image_url: string;
  primary_color: string;
  theme_color: string;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  platform_name: "KREOON",
  logo_url: "",
  logo_dark_url: "",
  favicon_url: "",
  pwa_icon_192: "",
  pwa_icon_512: "",
  og_image_url: "",
  primary_color: "#7700b8",
  theme_color: "#7700b8"
};

const BRANDING_ITEMS = [
  {
    key: "platform_name",
    title: "Nombre de la Plataforma",
    description: "Aparece en el título del navegador, PWA y meta tags",
    type: "text",
    icon: Globe,
    tips: null
  },
  {
    key: "logo_url",
    title: "Logo Principal (Claro)",
    description: "Logo para fondos claros. Se usa en el header y áreas con fondo blanco.",
    type: "image",
    icon: Image,
    tips: {
      format: "PNG con fondo transparente (recomendado) o SVG",
      size: "Mínimo 200x50px, máximo 400x100px",
      aspectRatio: "Proporción horizontal recomendada (4:1 o 5:1)",
      fileSize: "Menos de 500KB para carga rápida"
    }
  },
  {
    key: "logo_dark_url",
    title: "Logo Principal (Oscuro)",
    description: "Logo para fondos oscuros. Versión en blanco o colores claros.",
    type: "image",
    icon: Image,
    tips: {
      format: "PNG con fondo transparente (recomendado) o SVG",
      size: "Mínimo 200x50px, máximo 400x100px",
      aspectRatio: "Mismas dimensiones que el logo claro",
      fileSize: "Menos de 500KB"
    }
  },
  {
    key: "favicon_url",
    title: "Favicon",
    description: "Icono pequeño en la pestaña del navegador y favoritos.",
    type: "image",
    icon: Image,
    tips: {
      format: "ICO, PNG o SVG",
      size: "32x32px (estándar) o 16x16px (mínimo)",
      aspectRatio: "Cuadrado (1:1)",
      fileSize: "Menos de 50KB",
      note: "Usa un ícono simple y reconocible, no el logo completo"
    }
  },
  {
    key: "pwa_icon_192",
    title: "Ícono PWA (192x192)",
    description: "Ícono para cuando se instala la app en dispositivos móviles.",
    type: "image",
    icon: Smartphone,
    tips: {
      format: "PNG (obligatorio para PWA)",
      size: "Exactamente 192x192px",
      aspectRatio: "Cuadrado (1:1)",
      fileSize: "Menos de 100KB",
      note: "Incluye padding interno de ~10% para que no se corte en círculos"
    }
  },
  {
    key: "pwa_icon_512",
    title: "Ícono PWA (512x512)",
    description: "Ícono de alta resolución para splash screens y tiendas de apps.",
    type: "image",
    icon: Smartphone,
    tips: {
      format: "PNG (obligatorio para PWA)",
      size: "Exactamente 512x512px",
      aspectRatio: "Cuadrado (1:1)",
      fileSize: "Menos de 200KB",
      note: "Mismo diseño que el ícono 192x192, solo más grande"
    }
  },
  {
    key: "og_image_url",
    title: "Imagen para Redes Sociales (OG Image)",
    description: "Imagen que aparece cuando compartes enlaces en Facebook, Twitter, WhatsApp, etc.",
    type: "image",
    icon: Share2,
    tips: {
      format: "PNG o JPG",
      size: "1200x630px (recomendado para todas las redes)",
      aspectRatio: "Aproximadamente 1.91:1",
      fileSize: "Menos de 1MB",
      note: "Incluye logo, nombre de marca y un mensaje corto. El texto debe ser legible"
    }
  },
  {
    key: "primary_color",
    title: "Color Primario",
    description: "Color principal de la marca. Se usa en botones, enlaces y acentos.",
    type: "color",
    icon: Palette,
    tips: {
      format: "Código hexadecimal (#RRGGBB)",
      note: "Elige un color con buen contraste. Evita colores muy claros"
    }
  },
  {
    key: "theme_color",
    title: "Color del Tema (PWA)",
    description: "Color de la barra de estado en dispositivos móviles cuando se instala como app.",
    type: "color",
    icon: Palette,
    tips: {
      format: "Código hexadecimal (#RRGGBB)",
      note: "Generalmente igual o similar al color primario"
    }
  }
];

export function AppearanceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.keys(DEFAULT_SETTINGS));

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((item) => {
        if (item.key in newSettings) {
          (newSettings as any)[item.key] = item.value;
        }
      });
      setSettings(newSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, key: string) => {
    if (!file) return;

    setUploading(key);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${key}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, [key]: publicUrl }));
      toast.success("Imagen subida correctamente");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Error al subir: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const descriptions: Record<string, string> = {
        platform_name: "Nombre de la plataforma",
        logo_url: "URL del logo principal (claro)",
        logo_dark_url: "URL del logo para fondos oscuros",
        favicon_url: "URL del favicon",
        pwa_icon_192: "Ícono PWA 192x192",
        pwa_icon_512: "Ícono PWA 512x512",
        og_image_url: "Imagen para redes sociales",
        primary_color: "Color primario de la marca",
        theme_color: "Color del tema PWA"
      };

      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({
            key,
            value: value || "",
            description: descriptions[key] || key,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Configuración de branding guardada correctamente");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderImageUploader = (key: string, currentValue: string) => (
    <div className="flex items-start gap-4">
      <div className="h-20 w-20 rounded-sm border border-border flex items-center justify-center bg-muted overflow-hidden shrink-0">
        {currentValue ? (
          <img src={currentValue} alt={key} className="h-full w-full object-contain" />
        ) : (
          <Image className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <Input
          value={currentValue}
          onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder="https://ejemplo.com/imagen.png"
          className="text-sm"
        />
        <Label className="cursor-pointer inline-block">
          <Input
            type="file"
            accept="image/*,.ico,.svg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], key)}
            disabled={uploading === key}
          />
          <Button variant="outline" size="sm" asChild disabled={uploading === key}>
            <span>
              {uploading === key ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir imagen
            </span>
          </Button>
        </Label>
      </div>
    </div>
  );

  const renderColorPicker = (key: string, currentValue: string) => (
    <div className="flex items-center gap-4">
      <input
        type="color"
        value={currentValue || "#000000"}
        onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
        className="h-12 w-16 rounded border border-border cursor-pointer"
      />
      <Input
        value={currentValue}
        onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder="#7700b8"
        className="max-w-40"
      />
      <div 
        className="h-12 flex-1 rounded-sm border border-border"
        style={{ backgroundColor: currentValue || "#000000" }}
      />
    </div>
  );

  const renderTips = (tips: Record<string, string> | null) => {
    if (!tips) return null;
    
    return (
      <div className="mt-3 p-3 rounded-sm bg-muted/50 border text-xs space-y-1">
        <div className="flex items-center gap-1 text-muted-foreground font-medium mb-2">
          <Info className="h-3 w-3" />
          Especificaciones:
        </div>
        {Object.entries(tips).map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="text-muted-foreground capitalize min-w-20">{label === "note" ? "💡 Tip" : label}:</span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Branding y Apariencia</h2>
        <p className="text-sm text-muted-foreground">
          Personaliza la identidad visual completa de tu plataforma. Todos estos elementos reemplazarán el branding por defecto.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Después de guardar los cambios, algunos elementos como el favicon y los íconos PWA pueden requerir que limpies la caché del navegador o reinstales la app para ver los cambios.
        </AlertDescription>
      </Alert>

      {BRANDING_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {item.title}
            </CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {item.type === "text" && (
              <Input
                value={(settings as any)[item.key] || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                placeholder="Nombre de tu plataforma"
              />
            )}
            {item.type === "image" && renderImageUploader(item.key, (settings as any)[item.key] || "")}
            {item.type === "color" && renderColorPicker(item.key, (settings as any)[item.key] || "")}
            {renderTips(item.tips)}
          </CardContent>
        </Card>
      ))}

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista Previa</CardTitle>
          <CardDescription>Así se verá tu branding en diferentes contextos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Tab Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Pestaña del navegador:</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-t-lg border max-w-xs">
              {settings.favicon_url ? (
                <img src={settings.favicon_url} alt="Favicon" className="h-4 w-4" />
              ) : (
                <div className="h-4 w-4 bg-muted-foreground/30 rounded" />
              )}
              <span className="text-xs truncate">{settings.platform_name || "Tu Plataforma"}</span>
            </div>
          </div>

          {/* Mobile App Icon Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ícono de app móvil:</Label>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div 
                  className="h-16 w-16 rounded-sm border-2 border-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: settings.theme_color || "#F5A623" }}
                >
                  {settings.pwa_icon_192 ? (
                    <img src={settings.pwa_icon_192} alt="PWA Icon" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {(settings.platform_name || "U")[0]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">iOS/Android</span>
              </div>
            </div>
          </div>

          {/* Social Share Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Compartir en redes sociales:</Label>
            <div className="border rounded-sm overflow-hidden max-w-sm">
              <div className="h-32 bg-muted flex items-center justify-center">
                {settings.og_image_url ? (
                  <img src={settings.og_image_url} alt="OG Image" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-muted-foreground text-sm">Sin imagen OG</span>
                )}
              </div>
              <div className="p-2 bg-card border-t">
                <p className="text-xs text-muted-foreground uppercase">tudominio.com</p>
                <p className="text-sm font-medium truncate">{settings.platform_name || "Tu Plataforma"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={saveSettings} disabled={saving} size="lg" className="shadow-lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios de Branding
        </Button>
      </div>
    </div>
  );
}
