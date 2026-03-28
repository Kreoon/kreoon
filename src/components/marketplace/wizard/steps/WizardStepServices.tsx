import { useState } from 'react';
import { Plus, X, DollarSign, Gift, Package, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorServiceData, ServicePackage } from '@/hooks/useCreatorServices';
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_CATEGORIES } from '@/types/marketplace';

interface ServicesData {
  accepts_exchange: boolean;
  exchange_conditions: string;
  base_price: number | null;
  currency: string;
}

interface WizardStepServicesProps {
  services: CreatorServiceData[];
  servicesData: ServicesData;
  onCreateService: (data: any) => Promise<any>;
  onUpdateService: (params: { id: string } & Record<string, any>) => Promise<any>;
  onDeleteService: (id: string) => Promise<any>;
  onChange: (data: ServicesData) => void;
  userId: string;
}

const CURRENCIES = ['USD', 'COP', 'MXN', 'EUR'];

interface NewServiceForm {
  title: string;
  service_type: string;
  description: string;
  price_amount: string;
  price_currency: string;
  delivery_days: string;
  includes: string[];
}

const DEFAULT_SERVICE_FORM: NewServiceForm = {
  title: '',
  service_type: '',
  description: '',
  price_amount: '',
  price_currency: 'USD',
  delivery_days: '',
  includes: [],
};

export function WizardStepServices({
  services,
  servicesData,
  onCreateService,
  onDeleteService,
  onChange,
}: WizardStepServicesProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewServiceForm>(DEFAULT_SERVICE_FORM);
  const [newInclude, setNewInclude] = useState('');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const handleCreateService = async () => {
    if (!form.title || !form.service_type) return;

    await onCreateService({
      title: form.title,
      service_type: form.service_type,
      description: form.description || null,
      price_amount: form.price_amount ? Number(form.price_amount) : null,
      price_currency: 'USD', // Fixed to USD for all services
      delivery_days: form.delivery_days ? Number(form.delivery_days) : null,
      deliverables: form.includes.length > 0
        ? [{ name: 'Basico', description: form.description, price: Number(form.price_amount) || 0, currency: 'USD', delivery_days: Number(form.delivery_days) || 7, includes: form.includes, is_popular: false }]
        : [],
    });

    setForm(DEFAULT_SERVICE_FORM);
    setShowForm(false);
  };

  const addInclude = () => {
    const trimmed = newInclude.trim();
    if (trimmed && !form.includes.includes(trimmed)) {
      setForm(prev => ({ ...prev, includes: [...prev.includes, trimmed] }));
      setNewInclude('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Servicios y precios</h2>
        <p className="text-gray-400 text-sm">Define que ofreces y a que precio</p>
      </div>

      {/* Pricing basics */}
      <div className="bg-white/5 rounded-sm border border-white/10 p-6 space-y-5">
        <h3 className="text-white font-medium text-sm">Configuracion general</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Precio base</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="number"
                value={servicesData.base_price ?? ''}
                onChange={(e) => onChange({ ...servicesData, base_price: e.target.value ? Number(e.target.value) : null })}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-sm pl-9 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Moneda</label>
            <div className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white/60 text-sm">
              USD
            </div>
          </div>
        </div>

        {/* Exchange toggle */}
        <div className="flex items-center justify-between p-4 rounded-sm bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-white text-sm font-medium">Acepta canje de producto</p>
              <p className="text-gray-500 text-xs">Recibe productos en lugar de pago</p>
            </div>
          </div>
          <button
            onClick={() => onChange({ ...servicesData, accepts_exchange: !servicesData.accepts_exchange })}
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative',
              servicesData.accepts_exchange ? 'bg-green-500' : 'bg-white/20'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
              servicesData.accepts_exchange ? 'translate-x-5.5 left-[1px]' : 'left-[2px]'
            )} style={{ transform: servicesData.accepts_exchange ? 'translateX(22px)' : 'translateX(0)' }} />
          </button>
        </div>

        {servicesData.accepts_exchange && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Condiciones de canje</label>
            <textarea
              value={servicesData.exchange_conditions}
              onChange={(e) => onChange({ ...servicesData, exchange_conditions: e.target.value })}
              placeholder="Ej: Acepto productos de moda y skincare con valor minimo de $150.000 COP"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none"
            />
          </div>
        )}
      </div>

      {/* Services list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium text-sm">Tus servicios ({services.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-sm text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar servicio
          </button>
        </div>

        {services.map(service => (
          <div
            key={service.id}
            className="bg-white/5 rounded-sm border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-purple-400" />
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{service.title}</p>
                  <p className="text-gray-500 text-xs">
                    {SERVICE_TYPE_LABELS[service.service_type as keyof typeof SERVICE_TYPE_LABELS] || service.service_type}
                    {service.price_amount && ` · $${service.price_amount.toLocaleString()} ${service.price_currency}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteService(service.id); }}
                  className="p-1.5 hover:bg-red-500/20 rounded-sm transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-400" />
                </button>
                {expandedService === service.id
                  ? <ChevronUp className="h-4 w-4 text-gray-500" />
                  : <ChevronDown className="h-4 w-4 text-gray-500" />
                }
              </div>
            </button>

            {expandedService === service.id && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3">
                {service.description && (
                  <p className="text-gray-400 text-xs mb-2">{service.description}</p>
                )}
                {service.deliverables.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide">Incluye:</p>
                    {(service.deliverables as ServicePackage[]).map((pkg, i) => (
                      <div key={i} className="pl-3 border-l-2 border-purple-500/30">
                        <p className="text-white text-xs font-medium">{pkg.name}</p>
                        {pkg.includes?.map((inc, j) => (
                          <p key={j} className="text-gray-500 text-[11px]">• {inc}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add service form */}
      {showForm && (
        <div className="bg-white/5 rounded-sm border border-purple-500/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">Nuevo servicio</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titulo *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Video UGC Vertical"
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo *</label>
              <select
                value={form.service_type}
                onChange={(e) => setForm(prev => ({ ...prev, service_type: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-card">Seleccionar...</option>
                {Object.entries(SERVICE_TYPE_CATEGORIES).map(([, category]) => (
                  <optgroup key={category.label} label={category.label}>
                    {category.types.map(type => (
                      <option key={type} value={type} className="bg-card">{SERVICE_TYPE_LABELS[type]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe que incluye este servicio..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder:text-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio</label>
              <input
                type="number"
                value={form.price_amount}
                onChange={(e) => setForm(prev => ({ ...prev, price_amount: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Moneda</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white/60 text-sm">
                USD
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entrega (dias)</label>
              <input
                type="number"
                value={form.delivery_days}
                onChange={(e) => setForm(prev => ({ ...prev, delivery_days: e.target.value }))}
                placeholder="7"
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* Includes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Que incluye</label>
            {form.includes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.includes.map((inc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px]">
                    {inc}
                    <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setForm(prev => ({ ...prev, includes: prev.includes.filter((_, idx) => idx !== i) }))} />
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newInclude}
                onChange={(e) => setNewInclude(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                placeholder="Ej: 1 video vertical 15-30s"
                className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <button onClick={addInclude} className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-sm text-xs text-foreground/80">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateService}
            disabled={!form.title || !form.service_type}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-sm text-sm font-medium transition-colors"
          >
            Crear servicio
          </button>
        </div>
      )}

      {services.length === 0 && !showForm && (
        <div className="text-center py-6">
          <Package className="h-10 w-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">Aun no tienes servicios</p>
          <p className="text-gray-600 text-xs mt-1">Agrega al menos un servicio para que las marcas sepan que ofreces</p>
        </div>
      )}
    </div>
  );
}
