import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Mail, User, Lock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPasswordStrength } from '../useRegistration';
import type { StepComponentProps } from '../types';

export function CredentialsStep({ data, onChange, onNext, onBack, mode }: StepComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const isCompact = mode === 'compact';
  const isBrand = data.intent === 'brand';
  const pw = getPasswordStrength(data.password);

  const handleNext = () => {
    if (!data.fullName.trim()) return setError('Ingresa tu nombre completo');
    if (isBrand && !data.brandName.trim()) return setError('Ingresa el nombre de tu marca');
    if (!data.email.trim()) return setError('Ingresa tu email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return setError('Email no válido');
    if (data.password.length < 8) return setError('Mínimo 8 caracteres');
    if (data.password !== data.confirmPassword) return setError('Las contraseñas no coinciden');
    setError('');
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <h2 className={cn('font-bold text-white mb-1', isCompact ? 'text-lg' : 'text-xl')}>
        {isBrand ? 'Tu marca y tus datos' : 'Crea tu cuenta'}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {isBrand ? 'Información básica de tu marca y tus credenciales' : 'Completa tus datos para registrarte'}
      </p>

      <div className="space-y-3">
        {/* Brand name (only for brand intent) */}
        {isBrand && (
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Nombre de la marca</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={data.brandName}
                onChange={e => onChange({ brandName: e.target.value })}
                placeholder="Mi Marca"
                className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
              />
            </div>
          </div>
        )}

        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-foreground/80 mb-1">Nombre completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={data.fullName}
              onChange={e => onChange({ fullName: e.target.value })}
              placeholder="Tu nombre"
              className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-foreground/80 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="email"
              value={data.email}
              onChange={e => onChange({ email: e.target.value })}
              placeholder="tu@email.com"
              className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-foreground/80 mb-1">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={e => onChange({ password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {data.password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', pw.color)}
                  style={{ width: `${(pw.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{pw.label}</span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-foreground/80 mb-1">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={e => onChange({ confirmPassword: e.target.value })}
              placeholder="Repite la contraseña"
              className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}

      <button
        onClick={handleNext}
        className="w-full mt-5 rounded-sm bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 text-sm transition-colors"
      >
        Continuar
      </button>
    </motion.div>
  );
}
