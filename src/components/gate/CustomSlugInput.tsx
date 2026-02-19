import { useState, useCallback, useRef, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CustomSlugInputProps {
  currentCode: string;
  codeId: string;
  onSave: (params: { code_id: string; new_slug: string }) => Promise<any>;
  isSaving: boolean;
}

export function CustomSlugInput({ currentCode, codeId, onSave, isSaving }: CustomSlugInputProps) {
  const [slug, setSlug] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validate = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setValidation({ valid: false, error: 'Minimo 3 caracteres' });
      return;
    }

    // Same as current code? No change needed
    if (value.toUpperCase() === currentCode.toUpperCase()) {
      setValidation({ valid: false, error: 'Es el mismo codigo actual' });
      return;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_referral_slug', { p_slug: value });
      if (error) {
        setValidation({ valid: false, error: error.message });
      } else {
        setValidation(data as { valid: boolean; error?: string });
      }
    } catch {
      setValidation({ valid: false, error: 'Error de validacion' });
    } finally {
      setValidating(false);
    }
  }, [currentCode]);

  const handleChange = (value: string) => {
    // Only allow alphanumeric + hyphens
    const clean = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    setSlug(clean);
    setValidation(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length >= 3) {
      debounceRef.current = setTimeout(() => validate(clean), 400);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!validation?.valid || !slug) return;
    await onSave({ code_id: codeId, new_slug: slug });
    setSlug('');
    setValidation(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-white/70">Personalizar tu slug</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={slug}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="MI-CODIGO"
            className="bg-white/5 border-white/10 font-mono uppercase pr-8"
            maxLength={30}
          />
          {/* Status icon */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {validating && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
            {!validating && validation?.valid && <Check className="w-4 h-4 text-green-400" />}
            {!validating && validation && !validation.valid && slug.length >= 3 && <X className="w-4 h-4 text-red-400" />}
          </div>
        </div>
        <Button
          variant="glow"
          size="sm"
          disabled={!validation?.valid || isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      {/* Preview */}
      {slug && (
        <p className="text-xs text-white/40">
          Preview: <span className="text-purple-300">kreoon.com/r/{slug || '...'}</span>
        </p>
      )}
      {/* Validation message */}
      {validation && !validation.valid && slug.length >= 3 && (
        <p className="text-xs text-red-400">{validation.error}</p>
      )}
    </div>
  );
}
