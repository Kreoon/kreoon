import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, FileText, Briefcase, ArrowRight, ArrowLeft,
  Check, Loader2, Instagram, Youtube, Globe,
  Video, Wand2, Megaphone, Code, GraduationCap, Sparkles,
  Upload, Image as ImageIcon, Film, AlertCircle, X, CheckCircle2,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
const MAX_PORTFOLIO_FILES = 5;

interface UploadingFile {
  id: string;
  file: File;
  type: 'video' | 'image';
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// ─── Component ─────────────────────────────────────────────
const OnboardingProfile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const creatingProfileRef = useRef(false);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
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

  // Fetch or create creator profile when reaching portfolio step
  useEffect(() => {
    if (currentStep === 2 && user && !creatorProfileId && !creatingProfileRef.current) {
      fetchOrCreateCreatorProfile();
    }
  }, [currentStep, user, creatorProfileId]);

  const fetchOrCreateCreatorProfile = async () => {
    if (!user || creatingProfileRef.current) return;
    creatingProfileRef.current = true;
    setProfileError(null);

    try {
      // Check if creator profile exists
      const { data: existing, error: fetchError } = await (supabase as any)
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching creator profile:', fetchError);
      }

      if (existing?.id) {
        setCreatorProfileId(existing.id);
        // Count existing portfolio items
        const { count } = await (supabase as any)
          .from('portfolio_items')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', existing.id);
        setUploadedCount(count || 0);
        return;
      }

      // Create new creator profile
      const { data: created, error } = await (supabase as any)
        .from('creator_profiles')
        .insert({
          user_id: user.id,
          display_name: profile?.full_name || 'Creador',
          bio: bio || '',
          avatar_url: avatarUrl,
          categories: selectedAreas,
          marketplace_roles: selectedRoles,
          platforms: selectedPlatforms,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        // If unique constraint error, try to fetch existing
        if (error.code === '23505') {
          const { data: retry } = await (supabase as any)
            .from('creator_profiles')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          if (retry?.id) {
            setCreatorProfileId(retry.id);
            return;
          }
        }
        throw error;
      }
      if (created?.id) {
        setCreatorProfileId(created.id);
      }
    } catch (err: any) {
      console.error('Error creating creator profile:', err);
      setProfileError(err?.message || 'Error al preparar el perfil');
      toast.error('Error al preparar el portafolio', {
        description: 'Intenta recargar la página',
      });
    } finally {
      creatingProfileRef.current = false;
    }
  };

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

  // ─── Portfolio Upload Logic ─────────────────────────────
  const uploadFile = async (file: File) => {
    if (!creatorProfileId) {
      toast.error('Perfil no listo, intenta de nuevo');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Solo se permiten videos o imágenes');
      return;
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newFile: UploadingFile = {
      id: fileId,
      file,
      type: isVideo ? 'video' : 'image',
      preview: isImage ? URL.createObjectURL(file) : undefined,
      status: 'uploading',
      progress: 10,
    };

    setUploadingFiles(prev => [...prev, newFile]);

    try {
      if (isVideo) {
        await uploadVideoToBunny(fileId, file);
      } else {
        await uploadImageToBunny(fileId, file);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'error', error: err.message || 'Error al subir' } : f)
      );
    }
  };

  const uploadVideoToBunny = async (fileId: string, file: File) => {
    if (!creatorProfileId) throw new Error('No creator profile');

    // Update progress
    const updateProgress = (progress: number) => {
      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, progress } : f)
      );
    };

    updateProgress(20);

    // Step 1: Create video slot
    const { data: slotData, error: slotError } = await supabase.functions.invoke('bunny-marketplace-upload', {
      body: {
        upload_type: 'portfolio',
        portfolio_item_id: null,
        title: file.name.replace(/\.[^.]+$/, ''),
        creator_id: creatorProfileId,
      },
    });

    if (slotError) {
      throw new Error(slotError.message || 'Error creando slot de video');
    }
    if (!slotData?.success) {
      throw new Error(slotData?.error || 'Error creando slot de video');
    }

    const { upload_url, access_key, video_id, embed_url, media_id } = slotData;
    updateProgress(40);

    // Step 2: Upload to Bunny CDN
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'AccessKey': access_key,
        'Content-Type': 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error en upload: ${uploadResponse.status}`);
    }

    updateProgress(70);

    // Step 3: Confirm upload and create portfolio item
    const { error: confirmError } = await supabase.functions.invoke('bunny-marketplace-upload', {
      method: 'PUT',
      body: {
        upload_type: 'portfolio',
        video_id,
        embed_url,
        media_id,
        portfolio_creator_id: creatorProfileId,
        portfolio_title: file.name.replace(/\.[^.]+$/, ''),
      },
    });

    if (confirmError) {
      console.warn('Confirm warning:', confirmError);
    }

    updateProgress(100);

    // Mark as success
    setUploadingFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, status: 'success', progress: 100 } : f)
    );
    setUploadedCount(prev => prev + 1);
    toast.success('Video subido correctamente');
  };

  const uploadImageToBunny = async (fileId: string, file: File) => {
    if (!creatorProfileId) throw new Error('No creator profile');

    const updateProgress = (progress: number) => {
      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, progress } : f)
      );
    };

    updateProgress(20);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `marketplace/portfolio/${creatorProfileId}/${uniqueSuffix}.${ext}`;

    // Step 1: Get upload credentials
    const { data: creds, error: credsError } = await supabase.functions.invoke('bunny-raw-upload', {
      body: { storagePath },
    });

    if (credsError) {
      throw new Error(credsError.message || 'Error obteniendo credenciales');
    }
    if (!creds?.success) {
      throw new Error(creds?.error || 'Error obteniendo credenciales');
    }

    updateProgress(40);

    // Step 2: Upload to Bunny Storage
    const uploadResponse = await fetch(creds.uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': creds.accessKey,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error en upload: ${uploadResponse.status}`);
    }

    updateProgress(70);

    // Step 3: Create portfolio item in database
    const { error: insertError } = await (supabase as any)
      .from('portfolio_items')
      .insert({
        creator_id: creatorProfileId,
        media_type: 'image',
        media_url: creds.cdnUrl,
        thumbnail_url: creds.cdnUrl,
        title: file.name.replace(/\.[^.]+$/, ''),
        is_public: true,
      });

    if (insertError) {
      console.error('Error inserting portfolio item:', insertError);
      throw new Error('Error guardando en base de datos');
    }

    updateProgress(100);

    // Mark as success
    setUploadingFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, status: 'success', progress: 100 } : f)
    );
    setUploadedCount(prev => prev + 1);
    toast.success('Imagen subida correctamente');
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const currentTotal = uploadingFiles.length + uploadedCount;
    const remainingSlots = MAX_PORTFOLIO_FILES - currentTotal;
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);

    filesToAdd.forEach(file => uploadFile(file));
  }, [uploadingFiles.length, uploadedCount, creatorProfileId]);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    maxFiles: MAX_PORTFOLIO_FILES,
    disabled: !creatorProfileId || (uploadingFiles.length + uploadedCount) >= MAX_PORTFOLIO_FILES,
    noClick: false,
    noKeyboard: false,
  });

  const isUploading = uploadingFiles.some(f => f.status === 'uploading');
  const totalItems = uploadedCount + uploadingFiles.filter(f => f.status === 'success').length;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return bio.length >= 10;
      case 1: return selectedAreas.length > 0;
      case 2: return totalItems >= 1 && !isUploading;
      case 3: return true;
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

      // Update creator_profile
      const { error: updateError } = await (supabase as any)
        .from('creator_profiles')
        .update({
          display_name: profile?.full_name || '',
          bio,
          avatar_url: avatarUrl,
          categories: selectedAreas,
          marketplace_roles: selectedRoles,
          platforms: selectedPlatforms,
          social_links: socialLinks,
          is_active: true,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

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
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    <Camera className="w-4 h-4 inline mr-2" />
                    Foto de perfil
                  </label>
                  <div className="flex justify-center">
                    <div className="w-32">
                      <BunnyImageUploader
                        mode="single"
                        value={avatarUrl || ''}
                        onChange={(url) => setAvatarUrl(url || null)}
                        getStoragePath={(file) => `avatars/${user?.id || 'unknown'}/${Date.now()}-${file.name}`}
                        aspectRatio="square"
                        height="h-32"
                        maxSizeMB={5}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-white/40 text-center mt-2">
                    Una buena foto aumenta tus oportunidades
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Cuéntanos sobre ti *
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
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    <Briefcase className="w-4 h-4 inline mr-2" />
                    ¿En qué áreas te especializas? *
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

                {selectedAreas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Roles específicos <span className="text-white/40">(opcional - {selectedRoles.length}/{MAX_ROLES})</span>
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

          {/* Step 3: Portfolio Upload (REQUIRED) */}
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
                    <Film className="w-4 h-4 inline mr-2" />
                    Sube tu mejor trabajo *
                  </label>
                  <p className="text-xs text-white/50 mb-4">
                    Las marcas quieren ver tu trabajo. Sube al menos 1 video o imagen.
                  </p>

                  {/* Dropzone */}
                  {(uploadingFiles.length + uploadedCount) < MAX_PORTFOLIO_FILES && (
                    <div
                      {...(creatorProfileId && !profileError ? getRootProps() : {})}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all p-8',
                        profileError
                          ? 'border-red-500/50 bg-red-500/10'
                          : isDragActive
                          ? 'border-purple-500 bg-purple-500/10'
                          : creatorProfileId
                          ? 'border-white/20 hover:border-purple-500/50 bg-white/[0.02] cursor-pointer'
                          : 'border-white/20 bg-white/[0.02] cursor-wait opacity-50'
                      )}
                    >
                      {creatorProfileId && !profileError && <input {...getInputProps()} />}
                      {profileError ? (
                        <>
                          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                          <p className="text-sm text-red-300 mb-2">{profileError}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              creatingProfileRef.current = false;
                              fetchOrCreateCreatorProfile();
                            }}
                            className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                          >
                            Reintentar
                          </Button>
                        </>
                      ) : !creatorProfileId ? (
                        <>
                          <Loader2 className="w-10 h-10 text-white/40 mb-3 animate-spin" />
                          <p className="text-sm text-white/60">Preparando tu perfil...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-white/40 mb-3" />
                          <p className="text-sm text-white/80 mb-1">
                            {isDragActive ? 'Suelta los archivos aquí' : 'Toca para seleccionar archivos'}
                          </p>
                          <p className="text-xs text-white/40 mb-3">
                            Videos (MP4, MOV) o Imágenes (JPG, PNG)
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFileDialog();
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Seleccionar archivos
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Uploaded/Uploading files */}
                  {uploadingFiles.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {uploadingFiles.map(uf => (
                        <div
                          key={uf.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border',
                            uf.status === 'error'
                              ? 'bg-red-500/10 border-red-500/30'
                              : uf.status === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-white/[0.02] border-white/10'
                          )}
                        >
                          {/* Preview/Icon */}
                          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {uf.preview ? (
                              <img src={uf.preview} alt="" className="w-full h-full object-cover" />
                            ) : uf.type === 'video' ? (
                              <Video className="w-5 h-5 text-purple-400" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-blue-400" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{uf.file.name}</p>
                            {uf.status === 'uploading' && (
                              <div className="mt-1">
                                <Progress value={uf.progress} className="h-1.5" />
                                <p className="text-xs text-white/50 mt-0.5">{uf.progress}% subiendo...</p>
                              </div>
                            )}
                            {uf.status === 'error' && (
                              <p className="text-xs text-red-400 mt-1">{uf.error}</p>
                            )}
                            {uf.status === 'success' && (
                              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Subido correctamente
                              </p>
                            )}
                          </div>

                          {/* Status Icon */}
                          {uf.status === 'uploading' ? (
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                          ) : uf.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                          )}

                          {/* Remove button */}
                          {uf.status !== 'uploading' && (
                            <button
                              onClick={() => removeFile(uf.id)}
                              className="p-1 text-white/40 hover:text-white transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status message */}
                  <div className={cn(
                    'mt-4 p-3 rounded-lg border',
                    totalItems >= 1
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-purple-500/10 border-purple-500/20'
                  )}>
                    <p className={cn(
                      'text-sm',
                      totalItems >= 1 ? 'text-emerald-200' : 'text-purple-200'
                    )}>
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      {totalItems === 0 ? (
                        'Sube al menos 1 archivo para continuar'
                      ) : totalItems === 1 ? (
                        '¡Genial! Ya tienes 1 archivo. Puedes agregar más o continuar.'
                      ) : (
                        `¡Excelente! Tienes ${totalItems} archivos en tu portafolio.`
                      )}
                    </p>
                  </div>
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
            disabled={!canProceed() || saving || isUploading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
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
      </div>
    </div>
  );
};

export default OnboardingProfile;
