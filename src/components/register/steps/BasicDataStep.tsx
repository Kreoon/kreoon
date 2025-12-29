import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const countries = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana',
  'Uruguay', 'Venezuela', 'Estados Unidos', 'Otro'
];

const categories = [
  'Marketing Digital', 'Producción de Contenido', 'E-commerce',
  'Educación', 'Entretenimiento', 'Moda y Belleza',
  'Fitness y Salud', 'Tecnología', 'Gastronomía', 'Viajes', 'Otro'
];

export function BasicDataStep({ data, updateData, onNext, onBack }: StepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isOrgFlow = data.registrationMode === 'create_org';

  const generateUsername = (name: string) => {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleOrgNameChange = (name: string) => {
    updateData({ 
      organizationName: name,
      organizationUsername: generateUsername(name)
    });
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) return;
    
    setCheckingUsername(true);
    try {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', username)
        .maybeSingle();
      
      setUsernameAvailable(!existing);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.fullName.trim()) {
      newErrors.fullName = 'El nombre es requerido';
    }
    if (!data.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!data.password || data.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }
    if (!data.country) {
      newErrors.country = 'Selecciona un país';
    }
    
    if (isOrgFlow) {
      if (!data.organizationName.trim()) {
        newErrors.organizationName = 'El nombre es requerido';
      }
      if (!data.organizationUsername || data.organizationUsername.length < 3) {
        newErrors.organizationUsername = 'Mínimo 3 caracteres';
      }
      if (usernameAvailable === false) {
        newErrors.organizationUsername = 'Este username ya está en uso';
      }
      if (!data.organizationCategory) {
        newErrors.organizationCategory = 'Selecciona una categoría';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
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
        className="text-center mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {isOrgFlow ? 'Datos de tu organización' : 'Tus datos básicos'}
        </h1>
        <p className="text-muted-foreground text-lg">
          Solo lo esencial para comenzar
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-5"
      >
        {/* Personal info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Nombre completo
            </Label>
            <Input
              id="fullName"
              value={data.fullName}
              onChange={(e) => updateData({ fullName: e.target.value })}
              placeholder="Tu nombre"
              className={cn(
                'mt-1.5 h-12 bg-card border-border',
                errors.fullName && 'border-destructive'
              )}
            />
            {errors.fullName && (
              <p className="text-destructive text-xs mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              placeholder="tu@email.com"
              className={cn(
                'mt-1.5 h-12 bg-card border-border',
                errors.email && 'border-destructive'
              )}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={(e) => updateData({ password: e.target.value })}
                placeholder="••••••••"
                className={cn(
                  'mt-1.5 h-12 bg-card border-border pr-10',
                  errors.password && 'border-destructive'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground mt-0.5"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <Label htmlFor="country" className="text-sm font-medium text-foreground">
              País
            </Label>
            <Select value={data.country} onValueChange={(v) => updateData({ country: v })}>
              <SelectTrigger className={cn(
                'mt-1.5 h-12 bg-card border-border',
                errors.country && 'border-destructive'
              )}>
                <SelectValue placeholder="Selecciona tu país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-destructive text-xs mt-1">{errors.country}</p>
            )}
          </div>
        </div>

        {/* Organization specific */}
        {isOrgFlow && (
          <div className="pt-4 border-t border-border space-y-4">
            <div>
              <Label htmlFor="orgName" className="text-sm font-medium text-foreground">
                Nombre de la organización
              </Label>
              <Input
                id="orgName"
                value={data.organizationName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="Mi Agencia UGC"
                className={cn(
                  'mt-1.5 h-12 bg-card border-border',
                  errors.organizationName && 'border-destructive'
                )}
              />
              {errors.organizationName && (
                <p className="text-destructive text-xs mt-1">{errors.organizationName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="orgUsername" className="text-sm font-medium text-foreground">
                Username único
              </Label>
              <div className="relative">
                <Input
                  id="orgUsername"
                  value={data.organizationUsername}
                  onChange={(e) => {
                    updateData({ organizationUsername: e.target.value.toLowerCase() });
                    checkUsernameAvailability(e.target.value.toLowerCase());
                  }}
                  placeholder="mi-agencia"
                  className={cn(
                    'mt-1.5 h-12 bg-card border-border',
                    errors.organizationUsername && 'border-destructive',
                    usernameAvailable === true && 'border-success',
                    usernameAvailable === false && 'border-destructive'
                  )}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground mt-0.5" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                kreoon.app/{data.organizationUsername || 'tu-org'}
              </p>
              {errors.organizationUsername && (
                <p className="text-destructive text-xs mt-1">{errors.organizationUsername}</p>
              )}
              {usernameAvailable === true && !errors.organizationUsername && (
                <p className="text-success text-xs mt-1">✓ Disponible</p>
              )}
            </div>

            <div>
              <Label htmlFor="orgCategory" className="text-sm font-medium text-foreground">
                Categoría
              </Label>
              <Select value={data.organizationCategory} onValueChange={(v) => updateData({ organizationCategory: v })}>
                <SelectTrigger className={cn(
                  'mt-1.5 h-12 bg-card border-border',
                  errors.organizationCategory && 'border-destructive'
                )}>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.organizationCategory && (
                <p className="text-destructive text-xs mt-1">{errors.organizationCategory}</p>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full h-12 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
