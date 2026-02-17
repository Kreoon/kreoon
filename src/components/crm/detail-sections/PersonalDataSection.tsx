import { useState, useCallback, useRef, useEffect } from 'react';
import { Phone, Mail, FileText, MapPin, Building2, Globe, Pencil, Check } from 'lucide-react';
import { DetailSection } from '@/components/crm/DetailSection';
import { CopyButton } from '@/components/crm/CopyButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PersonalDataSectionProps {
  phone: string | null;
  email: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  onSave?: (data: Record<string, string | null>) => void;
}

function InlineEdit({
  value,
  fieldKey,
  placeholder,
  type,
  onSave,
}: {
  value: string | null;
  fieldKey: string;
  placeholder: string;
  type?: string;
  onSave: (key: string, value: string | null) => void;
}) {
  const [local, setLocal] = useState(value || '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value || '');
  }, [value]);

  const debouncedSave = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(fieldKey, v.trim() || null);
      }, 1200);
    },
    [fieldKey, onSave],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Input
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        debouncedSave(e.target.value);
      }}
      placeholder={placeholder}
      type={type || 'text'}
      className="h-6 text-xs bg-white/5 border-white/10 text-white/70 placeholder:text-white/20 px-2"
    />
  );
}

export function PersonalDataSection({
  phone,
  email,
  documentType,
  documentNumber,
  address,
  city,
  country,
  onSave,
}: PersonalDataSectionProps) {
  const [editing, setEditing] = useState(false);
  const hasData = phone || email || documentType || documentNumber || address || city || country;

  if (!hasData && !onSave) return null;

  const handleFieldSave = (key: string, value: string | null) => {
    onSave?.({ [key]: value });
  };

  const editAction = onSave ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setEditing(!editing)}
      className="h-6 px-2 text-[10px] text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/10"
    >
      {editing ? <Check className="h-3 w-3 mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}
      {editing ? 'Listo' : 'Editar'}
    </Button>
  ) : undefined;

  const fields: { key: string; label: string; icon: typeof Phone; value: string | null; type?: string; placeholder: string }[] = [
    { key: 'phone', label: 'Telefono', icon: Phone, value: phone, type: 'tel', placeholder: '+57 300...' },
    { key: 'email', label: 'Email', icon: Mail, value: email, type: 'email', placeholder: 'correo@email.com' },
    { key: 'document_number', label: 'Documento', icon: FileText, value: documentNumber, placeholder: 'Numero de documento' },
    { key: 'address', label: 'Direccion', icon: MapPin, value: address, placeholder: 'Direccion' },
    { key: 'city', label: 'Ciudad', icon: Building2, value: city, placeholder: 'Ciudad' },
    { key: 'country', label: 'Pais', icon: Globe, value: country, placeholder: 'Pais' },
  ];

  return (
    <DetailSection title="Datos personales" action={editAction}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {fields.map((f) => {
          if (!editing && !f.value) return null;
          const Icon = f.icon;
          return (
            <span key={f.key} className="contents">
              <span className="text-white/40 flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {f.label}
              </span>
              {editing ? (
                <InlineEdit
                  value={f.value}
                  fieldKey={f.key}
                  placeholder={f.placeholder}
                  type={f.type}
                  onSave={handleFieldSave}
                />
              ) : (
                <span className="text-white/70 flex items-center gap-1">
                  <span className="truncate">{f.value}</span>
                  {f.value && <CopyButton text={f.value} />}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </DetailSection>
  );
}
