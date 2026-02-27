import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Gift,
  Search,
  Users,
  Calendar,
  Percent,
  Coins,
  ExternalLink,
  Mail,
  Clock,
  Palette,
  Type,
  Image,
  Video,
  Star,
  MessageSquare,
  Trash2,
  Save,
  Loader2,
  DollarSign,
  TrendingUp,
  UserCheck,
  Crown,
  Copy,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "@/components/crm";
import type { ViewMode } from "@/components/crm";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

// =====================================================
// TYPES
// =====================================================

interface LandingFeature {
  title: string;
  description: string;
  icon?: string;
}

interface LandingTestimonial {
  quote: string;
  author: string;
  role?: string;
  avatar_url?: string;
}

interface LandingMetadata {
  hero_title?: string;
  hero_subtitle?: string;
  cta_title?: string;
  cta_subtitle?: string;
  cta_button_text?: string;
  theme_color?: string;
  background_gradient?: string;
  features?: LandingFeature[];
  testimonials?: LandingTestimonial[];
  video_url?: string;
  partner_logo_url?: string;
}

interface CommunityWithMetrics {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  free_months: number;
  commission_discount_points: number;
  bonus_ai_tokens: number;
  custom_badge_text: string | null;
  custom_badge_color: string | null;
  target_types: string[];
  max_redemptions: number | null;
  current_redemptions: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  partner_contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  owner_commission_rate: string | null;
  owner_subscription_rate: string | null;
  metadata: LandingMetadata | null;
  // Computed metrics
  member_count: number;
  active_member_count: number;
}

// =====================================================
// STAT CARD
// =====================================================

type StatColor = "purple" | "pink" | "blue" | "green" | "yellow" | "orange" | "amber";

const COLOR_MAP: Record<StatColor, { text: string; iconBg: string }> = {
  purple: { text: "text-purple-400", iconBg: "bg-purple-500/20" },
  pink: { text: "text-pink-400", iconBg: "bg-pink-500/20" },
  blue: { text: "text-blue-400", iconBg: "bg-blue-500/20" },
  green: { text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  yellow: { text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  orange: { text: "text-orange-400", iconBg: "bg-orange-500/20" },
  amber: { text: "text-amber-400", iconBg: "bg-amber-500/20" },
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{title}</p>
          {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// HELPERS
// =====================================================

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: "Activa", class: "bg-green-500/20 text-green-300" },
  inactive: { label: "Inactiva", class: "bg-red-500/20 text-red-300" },
  scheduled: { label: "Programada", class: "bg-blue-500/20 text-blue-300" },
  expired: { label: "Expirada", class: "bg-gray-500/20 text-gray-300" },
};

function getCommunityStatus(community: CommunityWithMetrics): string {
  if (!community.is_active) return "inactive";

  const now = new Date();
  if (community.start_date && new Date(community.start_date) > now) return "scheduled";
  if (community.end_date && new Date(community.end_date) < now) return "expired";

  return "active";
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// =====================================================
// COMMUNITY FORM (Create/Edit)
// =====================================================

interface CommunityFormData {
  slug: string;
  name: string;
  description: string;
  logo_url: string;
  free_months: number;
  commission_discount_points: number;
  bonus_ai_tokens: number;
  custom_badge_text: string;
  custom_badge_color: string;
  max_redemptions: number | null;
  is_active: boolean;
  start_date: string;
  end_date: string;
  partner_contact_email: string;
  notes: string;
  owner_user_id: string;
  owner_commission_rate: number;
  owner_subscription_rate: number;
}

function CommunityForm({
  community,
  onSuccess,
  onCancel,
}: {
  community?: CommunityWithMetrics;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!community;

  // Form state
  const [formData, setFormData] = useState<CommunityFormData>({
    slug: community?.slug || "",
    name: community?.name || "",
    description: community?.description || "",
    logo_url: community?.logo_url || "",
    free_months: community?.free_months || 0,
    commission_discount_points: community?.commission_discount_points || 0,
    bonus_ai_tokens: community?.bonus_ai_tokens || 0,
    custom_badge_text: community?.custom_badge_text || "",
    custom_badge_color: community?.custom_badge_color || "#f59e0b",
    max_redemptions: community?.max_redemptions || null,
    is_active: community?.is_active ?? true,
    start_date: community?.start_date ? community.start_date.split("T")[0] : "",
    end_date: community?.end_date ? community.end_date.split("T")[0] : "",
    partner_contact_email: community?.partner_contact_email || "",
    notes: community?.notes || "",
    owner_user_id: community?.owner_user_id || "",
    owner_commission_rate: community?.owner_commission_rate ? parseFloat(community.owner_commission_rate) * 100 : 5,
    owner_subscription_rate: community?.owner_subscription_rate ? parseFloat(community.owner_subscription_rate) * 100 : 20,
  });

  const updateField = <K extends keyof CommunityFormData>(field: K, value: CommunityFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: formData.slug,
        name: formData.name,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        free_months: formData.free_months,
        commission_discount_points: formData.commission_discount_points,
        bonus_ai_tokens: formData.bonus_ai_tokens,
        custom_badge_text: formData.custom_badge_text || null,
        custom_badge_color: formData.custom_badge_color || "#f59e0b",
        max_redemptions: formData.max_redemptions,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        partner_contact_email: formData.partner_contact_email || null,
        notes: formData.notes || null,
        owner_user_id: formData.owner_user_id || null,
        owner_commission_rate: formData.owner_commission_rate ? formData.owner_commission_rate / 100 : 0.05,
        owner_subscription_rate: formData.owner_subscription_rate ? formData.owner_subscription_rate / 100 : 0.20,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("partner_communities")
          .update(payload)
          .eq("id", community.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_communities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-communities"] });
      toast.success(isEditing ? "Comunidad actualizada" : "Comunidad creada");
      onSuccess();
    },
    onError: (error) => {
      const msg = (error as Error).message;
      if (msg.includes("duplicate key") || msg.includes("unique")) {
        toast.error("El slug ya existe, usa uno diferente");
      } else {
        toast.error("Error: " + msg);
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Información básica</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                updateField("name", e.target.value);
                if (!isEditing && !formData.slug) {
                  updateField("slug", generateSlug(e.target.value));
                }
              }}
              placeholder="Nombre de la comunidad"
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Slug (URL) *</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">/comunidad/</span>
              <Input
                value={formData.slug}
                onChange={(e) => updateField("slug", generateSlug(e.target.value))}
                placeholder="mi-comunidad"
                className="flex-1"
              />
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe la comunidad y sus beneficios..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Logo URL</Label>
            <Input
              value={formData.logo_url}
              onChange={(e) => updateField("logo_url", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Benefits */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Beneficios
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Meses gratis</Label>
            <Input
              type="number"
              min={0}
              value={formData.free_months}
              onChange={(e) => updateField("free_months", parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descuento (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.commission_discount_points}
              onChange={(e) => updateField("commission_discount_points", parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tokens AI</Label>
            <Input
              type="number"
              min={0}
              value={formData.bonus_ai_tokens}
              onChange={(e) => updateField("bonus_ai_tokens", parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Badge */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Badge personalizado</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Texto del badge</Label>
            <Input
              value={formData.custom_badge_text}
              onChange={(e) => updateField("custom_badge_text", e.target.value)}
              placeholder="Comunidad Partner"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formData.custom_badge_color}
                onChange={(e) => updateField("custom_badge_color", e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={formData.custom_badge_color}
                onChange={(e) => updateField("custom_badge_color", e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        {formData.custom_badge_text && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Vista previa:</span>
            <Badge style={{ backgroundColor: formData.custom_badge_color, color: "white" }}>
              {formData.custom_badge_text}
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Limits & Dates */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Limites y vigencia
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Max redenciones</Label>
            <Input
              type="number"
              min={0}
              value={formData.max_redemptions ?? ""}
              onChange={(e) => updateField("max_redemptions", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Ilimitado"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => updateField("is_active", checked)}
            />
            <Label className="text-sm">Activa</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha inicio</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha fin</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => updateField("end_date", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Contacto
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email de contacto</Label>
            <Input
              type="email"
              value={formData.partner_contact_email}
              onChange={(e) => updateField("partner_contact_email", e.target.value)}
              placeholder="partner@ejemplo.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notas internas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Notas privadas sobre esta comunidad..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Owner & Commissions */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Owner y comisiones
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Owner User ID (UUID)</Label>
            <Input
              value={formData.owner_user_id}
              onChange={(e) => updateField("owner_user_id", e.target.value)}
              placeholder="UUID del usuario dueño de la comunidad"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              El owner recibe comisiones de las transacciones de los miembros
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Comision transacciones (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={formData.owner_commission_rate}
                onChange={(e) => updateField("owner_commission_rate", parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Comision suscripciones (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={formData.owner_subscription_rate}
                onChange={(e) => updateField("owner_subscription_rate", parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !formData.name || !formData.slug}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEditing ? "Guardar cambios" : "Crear comunidad"}
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// LANDING CUSTOMIZATION FORM
// =====================================================

function LandingCustomizationForm({
  community,
  onSaved,
}: {
  community: CommunityWithMetrics;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const metadata = community.metadata || {};

  // Form state
  const [heroTitle, setHeroTitle] = useState(metadata.hero_title || "");
  const [heroSubtitle, setHeroSubtitle] = useState(metadata.hero_subtitle || "");
  const [ctaTitle, setCtaTitle] = useState(metadata.cta_title || "");
  const [ctaSubtitle, setCtaSubtitle] = useState(metadata.cta_subtitle || "");
  const [ctaButtonText, setCtaButtonText] = useState(metadata.cta_button_text || "");
  const [themeColor, setThemeColor] = useState(metadata.theme_color || "#f59e0b");
  const [backgroundGradient, setBackgroundGradient] = useState(metadata.background_gradient || "");
  const [videoUrl, setVideoUrl] = useState(metadata.video_url || "");
  const [partnerLogoUrl, setPartnerLogoUrl] = useState(metadata.partner_logo_url || "");
  const [features, setFeatures] = useState<LandingFeature[]>(metadata.features || []);
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>(metadata.testimonials || []);

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: async () => {
      const newMetadata: LandingMetadata = {
        hero_title: heroTitle || undefined,
        hero_subtitle: heroSubtitle || undefined,
        cta_title: ctaTitle || undefined,
        cta_subtitle: ctaSubtitle || undefined,
        cta_button_text: ctaButtonText || undefined,
        theme_color: themeColor || undefined,
        background_gradient: backgroundGradient || undefined,
        video_url: videoUrl || undefined,
        partner_logo_url: partnerLogoUrl || undefined,
        features: features.length > 0 ? features : undefined,
        testimonials: testimonials.length > 0 ? testimonials : undefined,
      };

      const { error } = await supabase
        .from('partner_communities')
        .update({ metadata: newMetadata })
        .eq('id', community.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-communities'] });
      toast.success("Landing actualizada correctamente");
      onSaved();
    },
    onError: (error) => {
      toast.error("Error al guardar: " + (error as Error).message);
    },
  });

  // Feature management
  const addFeature = () => {
    setFeatures([...features, { title: "", description: "", icon: "Star" }]);
  };
  const updateFeature = (index: number, field: keyof LandingFeature, value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    setFeatures(updated);
  };
  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  // Testimonial management
  const addTestimonial = () => {
    setTestimonials([...testimonials, { quote: "", author: "", role: "" }]);
  };
  const updateTestimonial = (index: number, field: keyof LandingTestimonial, value: string) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  };
  const removeTestimonial = (index: number) => {
    setTestimonials(testimonials.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          Hero Section
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titulo principal</Label>
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder={`Bienvenido a ${community.name}`}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subtitulo</Label>
            <Textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Describe los beneficios de unirse a tu comunidad..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* CTA Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Call to Action
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titulo CTA</Label>
            <Input
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.target.value)}
              placeholder="Unete ahora"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subtitulo CTA</Label>
            <Input
              value={ctaSubtitle}
              onChange={(e) => setCtaSubtitle(e.target.value)}
              placeholder="Aprovecha esta oferta exclusiva"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Texto del boton</Label>
            <Input
              value={ctaButtonText}
              onChange={(e) => setCtaButtonText(e.target.value)}
              placeholder="Comenzar gratis"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Theme */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Tema Visual
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Color principal</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#f59e0b"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gradiente (CSS)</Label>
            <Input
              value={backgroundGradient}
              onChange={(e) => setBackgroundGradient(e.target.value)}
              placeholder="linear-gradient(135deg, ...)"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Media */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Image className="h-4 w-4" />
          Media
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Logo del partner (URL)</Label>
            <Input
              value={partnerLogoUrl}
              onChange={(e) => setPartnerLogoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Video promocional (URL)</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/embed/..."
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Features */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4" />
            Caracteristicas ({features.length})
          </h4>
          <Button variant="outline" size="sm" onClick={addFeature}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={feature.title}
                  onChange={(e) => updateFeature(index, "title", e.target.value)}
                  placeholder="Titulo de la caracteristica"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={feature.description}
                onChange={(e) => updateFeature(index, "description", e.target.value)}
                placeholder="Descripcion..."
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Testimonials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Testimonios ({testimonials.length})
          </h4>
          <Button variant="outline" size="sm" onClick={addTestimonial}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={testimonial.author}
                  onChange={(e) => updateTestimonial(index, "author", e.target.value)}
                  placeholder="Nombre del autor"
                  className="flex-1"
                />
                <Input
                  value={testimonial.role || ""}
                  onChange={(e) => updateTestimonial(index, "role", e.target.value)}
                  placeholder="Rol/Cargo"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeTestimonial(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={testimonial.quote}
                onChange={(e) => updateTestimonial(index, "quote", e.target.value)}
                placeholder="Testimonio..."
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// MEMBERS TAB
// =====================================================

interface MemberInfo {
  id: string;
  user_id: string;
  brand_id: string | null;
  status: string;
  applied_at: string;
  free_months_granted: number;
  commission_discount_applied: number;
  bonus_tokens_granted: number;
  total_transactions: number;
  total_owner_earnings: number;
  user_email?: string;
  user_name?: string;
  brand_name?: string;
}

function MembersTab({ community }: { community: CommunityWithMetrics }) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['community-members', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_members', {
        p_community_id: community.id
      });

      if (error) {
        console.error('Error fetching members:', error);
        throw error;
      }

      return (data || []) as MemberInfo[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Aun no hay miembros en esta comunidad</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{members.length} miembros</h4>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className="p-3 rounded-lg bg-muted/50 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              {member.brand_name ? (
                <Users2 className="h-5 w-5 text-amber-500" />
              ) : (
                <UserCheck className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {member.brand_name || member.user_name || 'Usuario'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.user_email}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(member.applied_at), "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <Badge
                className={cn(
                  "text-[10px]",
                  member.status === 'active'
                    ? "bg-green-500/20 text-green-300"
                    : "bg-gray-500/20 text-gray-300"
                )}
              >
                {member.status === 'active' ? 'Activo' : member.status}
              </Badge>
              {member.total_transactions > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  ${member.total_transactions.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// FINANCES TAB
// =====================================================

interface EarningInfo {
  id: string;
  transaction_amount: number;
  earnings_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  description: string;
}

function FinancesTab({ community }: { community: CommunityWithMetrics }) {
  // Get earnings data
  const { data: earnings = [], isLoading: loadingEarnings } = useQuery({
    queryKey: ['community-earnings', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_earnings', {
        p_community_id: community.id
      });

      if (error) {
        console.error('Error fetching earnings:', error);
        return [];
      }
      return (data || []) as EarningInfo[];
    },
  });

  // Get totals using RPC
  const { data: totals } = useQuery({
    queryKey: ['community-totals', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_totals', {
        p_community_id: community.id
      });

      if (error) {
        console.error('Error fetching totals:', error);
        return { total_transactions: 0, total_owner_earnings: 0, pending_earnings: 0, paid_earnings: 0 };
      }

      return data?.[0] || { total_transactions: 0, total_owner_earnings: 0, pending_earnings: 0, paid_earnings: 0 };
    },
  });

  const totalEarnings = totals?.total_owner_earnings || 0;
  const totalTransactions = totals?.total_transactions || 0;
  const pendingEarnings = totals?.pending_earnings || 0;
  const paidEarnings = totals?.paid_earnings || 0;

  const ownerRate = community.owner_commission_rate
    ? parseFloat(community.owner_commission_rate) * 100
    : 5;

  return (
    <div className="space-y-6">
      {/* Owner info */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-500">Owner de la comunidad</span>
        </div>
        {community.owner_user_id ? (
          <p className="text-sm text-muted-foreground">
            Comision: {ownerRate}% de las transacciones de miembros
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin owner configurado. Configura uno en la pestaña Editar.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-500">${totalTransactions.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Transacciones totales</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-500">${totalEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Ganancias del owner</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-500">${pendingEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Pendiente</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">${paidEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Pagado</p>
        </div>
      </div>

      {/* Recent earnings */}
      {loadingEarnings ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        </div>
      ) : earnings.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Ultimas ganancias</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {earnings.slice(0, 10).map((earning) => (
              <div
                key={earning.id}
                className="p-2 rounded-lg bg-muted/30 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(earning.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-xs truncate max-w-[200px]">{earning.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-500">+${earning.earnings_amount.toFixed(2)}</p>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      earning.status === 'paid'
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-blue-500/20 text-blue-300"
                    )}
                  >
                    {earning.status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin ganancias registradas</p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// DETAIL PANEL
// =====================================================

function CommunityDetailPanel({
  community,
  onClose,
}: {
  community: CommunityWithMetrics;
  onClose: () => void;
}) {
  const status = getCommunityStatus(community);
  const cfg = STATUS_CONFIG[status];
  const [activeTab, setActiveTab] = useState("info");

  return (
    <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: community.custom_badge_color || '#8b5cf6' }}
          >
            {community.logo_url ? (
              <img src={community.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Users2 className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold">{community.name}</p>
            <p className="text-sm text-muted-foreground">/{community.slug}</p>
          </div>
        </SheetTitle>
      </SheetHeader>

      {/* Link copiable */}
      <div className="mt-4 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {window.location.origin}/comunidad/{community.slug}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/comunidad/${community.slug}`);
            toast.success("Link copiado");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="info" className="text-xs px-2">Info</TabsTrigger>
          <TabsTrigger value="members" className="text-xs px-2">
            <Users className="h-3 w-3 mr-1" />
            {community.member_count}
          </TabsTrigger>
          <TabsTrigger value="finances" className="text-xs px-2">
            <DollarSign className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="edit" className="text-xs px-2">
            <Pencil className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="landing" className="text-xs px-2">
            <Palette className="h-3 w-3" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-6">
          {/* Status & Badge */}
          <div className="flex items-center gap-2">
            <Badge className={cfg.class}>{cfg.label}</Badge>
            {community.custom_badge_text && (
              <Badge
                style={{
                  backgroundColor: community.custom_badge_color || '#8b5cf6',
                  color: 'white',
                }}
              >
                {community.custom_badge_text}
              </Badge>
            )}
          </div>

          {/* Description */}
          {community.description && (
            <div>
              <p className="text-sm text-muted-foreground">{community.description}</p>
            </div>
          )}

          <Separator />

          {/* Benefits */}
          <div>
            <h4 className="text-sm font-medium mb-3">Beneficios</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <Gift className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-500">{community.free_months}</p>
                <p className="text-[10px] text-muted-foreground">Meses gratis</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <Percent className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-500">{community.commission_discount_points}%</p>
                <p className="text-[10px] text-muted-foreground">Descuento</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10">
                <Coins className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-500">{community.bonus_ai_tokens}</p>
                <p className="text-[10px] text-muted-foreground">Tokens</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metrics */}
          <div>
            <h4 className="text-sm font-medium mb-3">Metricas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{community.current_redemptions}</p>
                <p className="text-xs text-muted-foreground">Redenciones</p>
                {community.max_redemptions && (
                  <p className="text-[10px] text-muted-foreground">
                    de {community.max_redemptions} max
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{community.member_count}</p>
                <p className="text-xs text-muted-foreground">Miembros</p>
                <p className="text-[10px] text-muted-foreground">
                  {community.active_member_count} activos
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <h4 className="text-sm font-medium mb-3">Fechas</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada</span>
                <span>{format(new Date(community.created_at), "d MMM yyyy", { locale: es })}</span>
              </div>
              {community.start_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inicio</span>
                  <span>{format(new Date(community.start_date), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {community.end_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fin</span>
                  <span>{format(new Date(community.end_date), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          {community.partner_contact_email && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Contacto</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${community.partner_contact_email}`}
                    className="text-primary hover:underline"
                  >
                    {community.partner_contact_email}
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {community.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Notas</h4>
                <p className="text-sm text-muted-foreground">{community.notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" asChild>
              <a href={`/comunidad/${community.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver landing
              </a>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersTab community={community} />
        </TabsContent>

        <TabsContent value="finances" className="mt-4">
          <FinancesTab community={community} />
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <CommunityForm community={community} onSuccess={() => setActiveTab("info")} />
        </TabsContent>

        <TabsContent value="landing" className="mt-4">
          <LandingCustomizationForm community={community} onSaved={() => setActiveTab("info")} />
        </TabsContent>
      </Tabs>
    </SheetContent>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMCommunities = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch communities with metrics using RPC
  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['crm-communities'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_communities_with_metrics');

      if (error) {
        console.error('Error fetching communities:', error);
        throw error;
      }

      return (data || []) as CommunityWithMetrics[];
    },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityWithMetrics | null>(null);

  // Derive stats
  const stats = useMemo(() => {
    const total = communities.length;
    const active = communities.filter((c) => getCommunityStatus(c) === "active").length;
    const totalMembers = communities.reduce((sum, c) => sum + c.member_count, 0);
    const totalRedemptions = communities.reduce((sum, c) => sum + c.current_redemptions, 0);
    return { total, active, totalMembers, totalRedemptions };
  }, [communities]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...communities];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.custom_badge_text?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => getCommunityStatus(c) === statusFilter);
    }
    switch (sortBy) {
      case "created_asc":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "members_desc":
        list.sort((a, b) => b.member_count - a.member_count);
        break;
      case "redemptions_desc":
        list.sort((a, b) => b.current_redemptions - a.current_redemptions);
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return list;
  }, [communities, search, statusFilter, sortBy]);

  const handleSelectCommunity = (community: CommunityWithMetrics) => {
    setSelectedCommunity(selectedCommunity?.id === community.id ? null : community);
  };

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-8">
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Comunidades</h1>
            <p className="text-white/60">Gestiona las comunidades de partners de Kreoon</p>
          </div>
          <div className="flex gap-3 items-center">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva comunidad
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear nueva comunidad</DialogTitle>
                </DialogHeader>
                <CommunityForm
                  onSuccess={() => setShowCreateDialog(false)}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar comunidad..."
                className="w-64 bg-white/5 border-white/10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ========== KPI CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Comunidades" value={stats.total} icon={Users2} color="amber" />
          <StatCard title="Activas" value={stats.active} subtitle="Disponibles ahora" icon={CheckCircle} color="green" />
          <StatCard title="Miembros" value={stats.totalMembers} subtitle="En todas las comunidades" icon={Users} color="blue" />
          <StatCard title="Redenciones" value={stats.totalRedemptions} subtitle="Beneficios aplicados" icon={Gift} color="purple" />
        </div>

        {/* ========== FILTERS ========== */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
              <SelectItem value="scheduled">Programadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Mas recientes</SelectItem>
              <SelectItem value="created_asc">Mas antiguas</SelectItem>
              <SelectItem value="members_desc">Mas miembros</SelectItem>
              <SelectItem value="redemptions_desc">Mas redenciones</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-white/40 self-center">{filtered.length} comunidades</div>
        </div>

        {/* ========== CONTENT ========== */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/40">Cargando comunidades...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users2 className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">
              {search || statusFilter !== "all" ? "Sin resultados para los filtros aplicados" : "Aun no hay comunidades"}
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* ---- CARDS VIEW ---- */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((community) => {
              const status = getCommunityStatus(community);
              const cfg = STATUS_CONFIG[status];
              return (
                <Card
                  key={community.id}
                  className={cn(
                    "p-4 cursor-pointer hover:border-amber-500/40 transition-all",
                    selectedCommunity?.id === community.id && "border-amber-500/60 bg-amber-500/5",
                  )}
                  onClick={() => handleSelectCommunity(community)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                    >
                      {community.logo_url ? (
                        <img src={community.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <Users2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{community.name}</p>
                      <p className="text-white/40 text-xs truncate">/{community.slug}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", cfg.class)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{community.member_count}</p>
                      <p className="text-[10px] text-white/40">Miembros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 font-semibold text-sm">{community.free_months}</p>
                      <p className="text-[10px] text-white/40">Meses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 font-semibold text-sm">{community.commission_discount_points}%</p>
                      <p className="text-[10px] text-white/40">Desc.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-400 font-semibold text-sm">{community.current_redemptions}</p>
                      <p className="text-[10px] text-white/40">Usos</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : viewMode === "list" ? (
          /* ---- LIST VIEW ---- */
          <div className="space-y-1">
            {filtered.map((community) => {
              const status = getCommunityStatus(community);
              const cfg = STATUS_CONFIG[status];
              return (
                <div
                  key={community.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors",
                    selectedCommunity?.id === community.id && "bg-amber-500/10 border border-amber-500/30",
                  )}
                  onClick={() => handleSelectCommunity(community)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                  >
                    {community.logo_url ? (
                      <img src={community.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">{getInitials(community.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{community.name}</p>
                  </div>
                  <span className="text-xs text-white/50 hidden sm:inline">{community.member_count} miembros</span>
                  <span className="text-xs text-amber-400 hidden md:inline">{community.free_months} meses</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", cfg.class)}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---- TABLE VIEW ---- */
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Comunidad</TableHead>
                  <TableHead className="text-white/70">Miembros</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">Meses Gratis</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">Descuento</TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">Tokens</TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">Redenciones</TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((community) => {
                  const status = getCommunityStatus(community);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <TableRow
                      key={community.id}
                      className={cn(
                        "border-white/10 hover:bg-white/5 cursor-pointer",
                        selectedCommunity?.id === community.id && "bg-amber-500/10",
                      )}
                      onClick={() => handleSelectCommunity(community)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                          >
                            {community.logo_url ? (
                              <img src={community.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <Users2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{community.name}</p>
                            <p className="text-white/40 text-xs truncate">/{community.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{community.member_count}</TableCell>
                      <TableCell className="text-amber-400 hidden md:table-cell">{community.free_months}</TableCell>
                      <TableCell className="text-green-400 hidden md:table-cell">{community.commission_discount_points}%</TableCell>
                      <TableCell className="text-purple-400 hidden lg:table-cell">{community.bonus_ai_tokens}</TableCell>
                      <TableCell className="text-white hidden lg:table-cell">
                        {community.current_redemptions}
                        {community.max_redemptions && (
                          <span className="text-white/40">/{community.max_redemptions}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-1 rounded-full text-xs", cfg.class)}>{cfg.label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* ========== DETAIL PANEL ========== */}
      <Sheet open={!!selectedCommunity} onOpenChange={(open) => !open && setSelectedCommunity(null)}>
        {selectedCommunity && (
          <CommunityDetailPanel
            community={selectedCommunity}
            onClose={() => setSelectedCommunity(null)}
          />
        )}
      </Sheet>
    </div>
  );
};

export default PlatformCRMCommunities;
