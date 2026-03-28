import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LATAM_COUNTRIES, CountryOption } from '../types';

interface PhoneInputProps {
  value: string;
  countryCode: string;
  onChange: (phone: string) => void;
  onCountryChange: (dialCode: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  countryCode,
  onChange,
  onCountryChange,
  error,
  disabled,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Encontrar país seleccionado
  const selectedCountry = LATAM_COUNTRIES.find(c => c.dialCode === countryCode) || LATAM_COUNTRIES[0];

  // Filtrar países por búsqueda
  const filteredCountries = LATAM_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.dialCode.includes(search)
  );

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatear número de teléfono (solo dígitos)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits);
  };

  const handleCountrySelect = (country: CountryOption) => {
    onCountryChange(country.dialCode);
    setIsOpen(false);
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/90">
        Teléfono <span className="text-red-400">*</span>
      </label>

      <div className="flex gap-2">
        {/* Selector de país */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 h-11 px-3 rounded-sm border transition-all",
              "bg-white/5 hover:bg-white/10",
              isOpen
                ? "border-primary ring-2 ring-primary/20"
                : "border-white/10 hover:border-white/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm text-white/80 min-w-[45px]">
              {selectedCountry.dialCode}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-white/50 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>

          {/* Dropdown de países */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-64 max-h-64 overflow-hidden rounded-sm border border-white/10 bg-slate-900 shadow-xl">
              {/* Búsqueda */}
              <div className="p-2 border-b border-white/10">
                <input
                  type="text"
                  placeholder="Buscar país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              {/* Lista de países */}
              <div className="overflow-y-auto max-h-48">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      "hover:bg-white/5",
                      country.dialCode === countryCode && "bg-primary/10"
                    )}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="text-sm text-white/90 flex-1">{country.name}</span>
                    <span className="text-xs text-white/50">{country.dialCode}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-white/40">
                    No se encontraron países
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input de teléfono */}
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={handlePhoneChange}
            disabled={disabled}
            placeholder="300 123 4567"
            className={cn(
              "w-full h-11 pl-10 pr-4 rounded-sm border transition-all text-white",
              "bg-white/5 placeholder:text-white/40",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              error
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/10 focus:border-primary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
