import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Link2, Mail, Loader2, Building2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

type JoinMethod = 'link' | 'code' | null;

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_registration_open: boolean;
}

export function JoinOrgStep({ data, updateData, onNext, onBack }: StepProps) {
  const [joinMethod, setJoinMethod] = useState<JoinMethod>(null);
  const [linkInput, setLinkInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundOrg, setFoundOrg] = useState<Organization | null>(null);

  const extractSlugFromLink = (link: string) => {
    // Handle various formats:
    // - https://kreoon.app/register/my-org
    // - kreoon.app/register/my-org
    // - /register/my-org
    // - my-org
    const patterns = [
      /register\/([a-z0-9-]+)/i,
      /^([a-z0-9-]+)$/i,
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) return match[1].toLowerCase();
    }
    return link.toLowerCase().trim();
  };

  const handleSearchByLink = async () => {
    if (!linkInput.trim()) {
      setError('Ingresa un enlace');
      return;
    }

    setLoading(true);
    setError('');
    setFoundOrg(null);

    try {
      const slug = extractSlugFromLink(linkInput.trim());
      
      const { data: org, error: fetchError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, is_registration_open')
        .eq('slug', slug)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!org) {
        setError('No se encontró ninguna organización con ese enlace');
        return;
      }

      if (!org.is_registration_open) {
        setError('Esta organización no tiene registro público abierto');
        return;
      }

      setFoundOrg(org);
      updateData({ joinLink: org.slug });
    } catch (err) {
      setError('Error al buscar la organización');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByCode = async () => {
    if (!codeInput.trim()) {
      setError('Ingresa un código de invitación');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Look up invitation by token
      const { data: invitation, error: invError } = await supabase
        .from('organization_invitations')
        .select('id, organization_id, email, token, expires_at, accepted_at')
        .eq('token', codeInput.trim())
        .maybeSingle();

      if (invError || !invitation) {
        setError('Código de invitación no válido');
        return;
      }

      // Check if already accepted
      if (invitation.accepted_at) {
        setError('Esta invitación ya fue utilizada');
        return;
      }

      // Check if expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        setError('Esta invitación ha expirado');
        return;
      }

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url')
        .eq('id', invitation.organization_id)
        .single();

      if (orgError || !org) {
        setError('Error al obtener datos de la organización');
        return;
      }

      setFoundOrg({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        is_registration_open: true,
      });
      updateData({ 
        inviteCode: codeInput.trim(),
        email: invitation.email || ''
      });
    } catch (err) {
      setError('Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (foundOrg) {
      onNext();
    }
  };

  if (!joinMethod) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Cómo quieres <span className="text-gradient-violet">unirte</span>?
          </h1>
          <p className="text-muted-foreground text-lg">
            Selecciona cómo recibiste tu acceso
          </p>
        </motion.div>

        <div className="grid gap-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setJoinMethod('link')}
            className={cn(
              'p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm',
              'hover:border-primary/50 hover:bg-card transition-all duration-300',
              'group cursor-pointer text-left flex items-center gap-5',
              'hover:shadow-[0_0_30px_hsl(252_100%_68%_/_0.1)]'
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
              'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
              'transition-all duration-300'
            )}>
              <Link2 className="w-7 h-7" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Tengo un enlace
              </h3>
              <p className="text-muted-foreground">
                Me compartieron un link de registro
              </p>
            </div>

            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setJoinMethod('code')}
            className={cn(
              'p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm',
              'hover:border-primary/50 hover:bg-card transition-all duration-300',
              'group cursor-pointer text-left flex items-center gap-5',
              'hover:shadow-[0_0_30px_hsl(252_100%_68%_/_0.1)]'
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
              'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
              'transition-all duration-300'
            )}>
              <Mail className="w-7 h-7" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Tengo un código de invitación
              </h3>
              <p className="text-muted-foreground">
                Me enviaron una invitación por email
              </p>
            </div>

            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Button
        variant="ghost"
        onClick={() => {
          if (foundOrg) {
            setFoundOrg(null);
            setError('');
          } else {
            setJoinMethod(null);
          }
        }}
        className="mb-8 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Atrás
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          {joinMethod === 'link' ? (
            <Link2 className="w-7 h-7 text-primary" />
          ) : (
            <Mail className="w-7 h-7 text-primary" />
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {joinMethod === 'link' ? 'Ingresa el enlace' : 'Ingresa tu código'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {joinMethod === 'link' 
            ? 'Pega el enlace de registro que te compartieron'
            : 'Encuentra el código en el email de invitación'
          }
        </p>
      </motion.div>

      {!foundOrg ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <Label className="text-sm font-medium text-foreground">
              {joinMethod === 'link' ? 'Enlace de registro' : 'Código de invitación'}
            </Label>
            {joinMethod === 'link' ? (
              <Input
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setError('');
                }}
                placeholder="kreoon.app/register/mi-organizacion"
                className={cn(
                  'mt-1.5 h-12 bg-card border-border',
                  error && 'border-destructive'
                )}
              />
            ) : (
              <Input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setError('');
                }}
                placeholder="XXXX-XXXX-XXXX"
                className={cn(
                  'mt-1.5 h-12 bg-card border-border font-mono',
                  error && 'border-destructive'
                )}
              />
            )}
            {error && (
              <p className="text-destructive text-sm mt-2">{error}</p>
            )}
          </div>

          <Button
            onClick={joinMethod === 'link' ? handleSearchByLink : handleSearchByCode}
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Buscar organización
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 text-center">
            <div className="w-16 h-16 rounded-xl bg-card flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {foundOrg.logo_url ? (
                <img src={foundOrg.logo_url} alt={foundOrg.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {foundOrg.name}
            </h3>
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Organización verificada</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            Unirme a {foundOrg.name}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
