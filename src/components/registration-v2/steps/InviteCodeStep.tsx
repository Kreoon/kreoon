import { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface InviteCodeStepProps {
  orgSlug: string;
  orgName?: string;
  orgLogo?: string | null;
  value: string;
  onChange: (code: string) => void;
  onValidated: (isValid: boolean) => void;
  isValid?: boolean;
}

export function InviteCodeStep({
  orgSlug,
  orgName,
  orgLogo,
  value,
  onChange,
  onValidated,
  isValid,
}: InviteCodeStepProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    onChange(code);
    setTouched(true);
    setError(null);
    onValidated(false);
  };

  const validateCode = async () => {
    if (!value || value.length < 4) {
      setError('El código debe tener al menos 4 caracteres');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Llamar al RPC que valida el código de invitación
      const { data, error: rpcError } = await supabase.rpc('validate_registration_code', {
        code: value,
        org_slug: orgSlug,
        ip: 'client', // IP se valida en el servidor
      });

      if (rpcError) throw rpcError;

      if (data?.valid) {
        onValidated(true);
      } else {
        setError(data?.message || 'Código inválido o expirado');
        onValidated(false);
      }
    } catch (err) {
      console.error('Error validating invite code:', err);
      setError('Error al validar el código. Intenta de nuevo.');
      onValidated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.length >= 4) {
      e.preventDefault();
      validateCode();
    }
  };

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="text-center space-y-4">
        {orgLogo && (
          <img
            src={orgLogo}
            alt={orgName || 'Organización'}
            className="w-16 h-16 rounded-xl mx-auto object-cover bg-white/10"
          />
        )}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Únete a {orgName || 'la organización'}
          </h1>
          <p className="text-white/60">
            Ingresa tu código de invitación para continuar
          </p>
        </div>
      </div>

      {/* Code input */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/90">
            Código de invitación <span className="text-red-400">*</span>
          </label>

          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              value={value}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              onBlur={() => touched && value.length >= 4 && validateCode()}
              placeholder="XXXX-XXXX"
              maxLength={12}
              className={cn(
                "w-full h-14 pl-12 pr-14 rounded-xl border-2 transition-all",
                "text-center text-xl font-mono tracking-wider uppercase",
                "bg-white/5 text-white placeholder:text-white/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                isValid
                  ? "border-green-500/50 bg-green-500/10"
                  : error
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-white/10 focus:border-primary"
              )}
              disabled={isValidating}
            />

            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating ? (
                <Loader2 className="h-5 w-5 text-white/50 animate-spin" />
              ) : isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : null}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {isValid && (
            <p className="text-sm text-green-400 text-center">
              ¡Código válido! Puedes continuar
            </p>
          )}
        </div>

        {/* Validate button */}
        {!isValid && (
          <button
            type="button"
            onClick={validateCode}
            disabled={isValidating || value.length < 4}
            className={cn(
              "w-full h-12 rounded-xl font-semibold transition-all",
              "flex items-center justify-center gap-2",
              isValidating || value.length < 4
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-white"
            )}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              'Validar código'
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-white/40">
        ¿No tienes código?{' '}
        <a
          href={`mailto:soporte@kreoon.com?subject=Solicitud de código - ${orgName || orgSlug}`}
          className="text-primary hover:underline"
        >
          Contacta al administrador
        </a>
      </p>
    </div>
  );
}
