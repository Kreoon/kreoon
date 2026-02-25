import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  User, Camera, FileText, Briefcase, ArrowRight, ArrowLeft,
  Check, Loader2, Instagram, Youtube, Globe, Plus, X,
  Video, Wand2, Megaphone, Code, GraduationCap, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BunnyImageUploader } from '@/components/marketplace/BunnyImageUploader';
import { MARKETPLACE_ROLES, MARKETPLACE_ROLE_CATEGORIES } from '@/components/marketplace/roles/marketplaceRoleConfig';
import type { MarketplaceRoleCategory } from '@/components/marketplace/types/marketplace';

// ─── Constants ─────────────────────────────────────────────
const STEPS = ['Foto y Bio', 'Especialización', 'Portafolio', 'Redes Sociales'];

const TALENT_AREAS = [
  { id: 'content_creation', label: 'Creador de contenido', icon: Video, color: 'from-pink-500 to-rose-500' },
  { id: 'post_production', label: 'Productor/Editor', icon: Wand2, color: 'from-purple-500 to-violet-500' },
  { id: 'strategy_marketing', label: 'Marketing', icon: Megaphone, color: 'from-blue-500 to-cyan-500' },
  { id: 'technology', label: 'Tecnología', icon: Code, color: 'from-green-500 to-emerald-500' },
  { id: 'education', label: 'Educación', icon: GraduationCap, color: 'from-yellow-500 to-orange-500' },
];

const PLATFORMS = [
  'Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook', 'Twitch', 'Otro',
];

const MAX_ROLES = 5;

// ─── Component ─────────────────────────────────────────────
const OnboardingProfile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(['']);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    tiktok: '',
    youtube: '',
    website: '',
  });

  // Load existing data
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url || null);
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) return prev.filter(r => r !== roleId);
      if (prev.length >= MAX_ROLES) return prev;
      return [...prev, roleId];
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const addPortfolioUrl = () => {
    if (portfolioUrls.length < 5) {
      setPortfolioUrls([...portfolioUrls, '']);
    }
  };

  const removePortfolioUrl = (index: number) => {
    setPortfolioUrls(portfolioUrls.filter((_, i) => i !== index));
  };

  const updatePortfolioUrl = (index: number, value: string) => {
    const updated = [...portfolioUrls];
    updated[index] = value;
    setPortfolioUrls(updated);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return avatarUrl && bio.length >= 10;
      case 1: return selectedAreas.length > 0 && selectedRoles.length > 0;
      case 2: return true; // Portfolio is optional
      case 3: return true; // Social links are optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile
      await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          bio,
        })
        .eq('id', user.id);

      // Update or create creator_profile
      const validPortfolioUrls = portfolioUrls.filter(url => url.trim());

      const creatorData = {
        user_id: user.id,
        display_name: profile?.full_name || '',
        bio,
        avatar_url: avatarUrl,
        categories: selectedAreas,
        marketplace_roles: selectedRoles,
        platforms: selectedPlatforms,
        social_links: socialLinks,
        portfolio_urls: validPortfolioUrls,
        is_active: true,
      };

      const { error: upsertError } = await (supabase as any)
        .from('creator_profiles')
        .upsert(creatorData, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      toast.success('¡Perfil completado!', {
        description: 'Ahora obtén tus llaves para desbloquear KREOON',
      });

      navigate('/unlock-access');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/unlock-access');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Completa tu perfil</h1>
          <p className="text-white/50 text-sm">
            Para que las marcas te encuentren en el marketplace
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    i < currentStep
                      ? 'bg-purple-500 text-white'
                      : i === currentStep
                      ? 'bg-purple-500/30 border-2 border-purple-500 text-purple-300'
                      : 'bg-white/10 text-white/40'
                  )}
                >
                  {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-12 sm:w-20 h-0.5 mx-1',
                      i < currentStep ? 'bg-purple-500' : 'bg-white/10'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/60">{STEPS[currentStep]}</p>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {/* Step 1: Photo & Bio */}
          {currentStep === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="!bg-white/[0.03] !border-white/10 p-6 space-y-6">
                {/* Avatar */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    <Camera className="w-4 h-4 inline mr-2" />
                    Foto de perfil
                  </label>
                  <div className="flex justify-center">
                    <BunnyImageUploader
                      currentUrl={avatarUrl}
                      onUpload={setAvatarUrl}
                      folder="avatars"
                      className="w-32 h-32 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-white/40 text-center mt-2">
                    Una buena foto aumenta tus oportunidades
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Cuéntanos sobre ti
                  </label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Describe tu experiencia, estilo y lo que te hace único como creador..."
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-white/40 text-right mt-1">{bio.length}/500</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Specialization */}
          {currentStep === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="!bg-white/[0.03] !border-white/10 p-6 space-y-6">
                {/* Areas */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    <Briefcase className="w-4 h-4 inline mr-2" />
                    ¿En qué áreas te especializas?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TALENT_AREAS.map(area => {
                      const Icon = area.icon;
                      const isSelected = selectedAreas.includes(area.id);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => toggleArea(area.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                            isSelected
                              ? 'border-purple-500/60 bg-purple-500/15'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          )}
                        >
                          <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center', area.color)}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white/80">{area.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Roles */}
                {selectedAreas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Roles específicos <span className="text-white/40">({selectedRoles.length}/{MAX_ROLES})</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                      {selectedAreas.map(areaId => {
                        const roles = MARKETPLACE_ROLES.filter(r => r.category === areaId);
                        if (roles.length === 0) return null;
                        const category = MARKETPLACE_ROLE_CATEGORIES[areaId as MarketplaceRoleCategory];
                        return (
                          <div key={areaId}>
                            <p className="text-xs font-medium text-white/50 uppercase mb-1.5">{category?.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {roles.map(role => {
                                const isSelected = selectedRoles.includes(role.id);
                                const isDisabled = !isSelected && selectedRoles.length >= MAX_ROLES;
                                return (
                                  <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => !isDisabled && toggleRole(role.id)}
                                    disabled={isDisabled}
                                    className={cn(
                                      'px-3 py-1.5 rounded-full text-xs border transition-all',
                                      isSelected
                                        ? 'border-purple-500/50 bg-purple-500/20 text-white'
                                        : isDisabled
                                        ? 'border-white/5 text-white/30 cursor-not-allowed'
                                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                    )}
                                  >
                                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                    {role.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Platforms */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Plataformas donde creas contenido
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(platform => {
                      const isSelected = selectedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs border transition-all',
                            isSelected
                              ? 'border-purple-500/50 bg-purple-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Portfolio */}
          {currentStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="!bg-white/[0.03] !border-white/10 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    <Video className="w-4 h-4 inline mr-2" />
                    Links de tu portafolio <span className="text-white/40">(opcional)</span>
                  </label>
                  <p className="text-xs text-white/50 mb-4">
                    Agrega links a tu mejor trabajo (YouTube, Vimeo, Behance, etc.)
                  </p>
                  <div className="space-y-2">
                    {portfolioUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={url}
                          onChange={e => updatePortfolioUrl(i, e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-white/5 border-white/10"
                        />
                        {portfolioUrls.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePortfolioUrl(i)}
                            className="text-white/40 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {portfolioUrls.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addPortfolioUrl}
                      className="mt-2 text-purple-400 hover:text-purple-300"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Agregar otro link
                    </Button>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-200">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Podrás subir videos directamente a tu portafolio después desde tu perfil.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Social Links */}
          {currentStep === 3 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="!bg-white/[0.03] !border-white/10 p-6 space-y-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Redes sociales <span className="text-white/40">(opcional)</span>
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </label>
                    <Input
                      value={socialLinks.instagram}
                      onChange={e => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      placeholder="@usuario"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </label>
                    <Input
                      value={socialLinks.tiktok}
                      onChange={e => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                      placeholder="@usuario"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                      <Youtube className="w-3.5 h-3.5" /> YouTube
                    </label>
                    <Input
                      value={socialLinks.youtube}
                      onChange={e => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                      placeholder="URL del canal"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                      <Globe className="w-3.5 h-3.5" /> Sitio web
                    </label>
                    <Input
                      value={socialLinks.website}
                      onChange={e => setSocialLinks({ ...socialLinks, website: e.target.value })}
                      placeholder="https://..."
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="text-white/60"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === STEPS.length - 1 ? (
              <>
                Guardar y continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            className="text-sm text-white/40 hover:text-white/60 underline"
          >
            Completar después
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingProfile;
