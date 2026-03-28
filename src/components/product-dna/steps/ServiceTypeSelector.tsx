import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { ServiceGroupConfig, ServiceConfig } from '@/config/service-catalog';

interface ServiceTypeSelectorProps {
  group: ServiceGroupConfig;
  selected: ServiceConfig[];
  onSelect: (services: ServiceConfig[]) => void;
  maxSelections: number;
}

export function ServiceTypeSelector({
  group,
  selected,
  onSelect,
  maxSelections
}: ServiceTypeSelectorProps) {

  const toggleService = (service: ServiceConfig) => {
    const isSelected = selected.some(s => s.id === service.id);

    if (isSelected) {
      onSelect(selected.filter(s => s.id !== service.id));
    } else {
      if (selected.length >= maxSelections) {
        // Remover el primero y agregar el nuevo
        onSelect([...selected.slice(1), service]);
      } else {
        onSelect([...selected, service]);
      }
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'moderate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'complex': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection Counter */}
      <div className="flex items-center justify-between p-4 rounded-sm bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400">
            Selecciona hasta {maxSelections} servicios
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxSelections }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < selected.length
                  ? 'bg-purple-500'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {group.services.map((service, index) => {
          const Icon = service.icon;
          const isSelected = selected.some(s => s.id === service.id);
          const selectionIndex = selected.findIndex(s => s.id === service.id);

          return (
            <motion.button
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleService(service)}
              className={`relative p-4 rounded-sm border text-left transition-all ${
                isSelected
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {/* Selection Number */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full
                                bg-gradient-to-br from-purple-500 to-pink-500
                                flex items-center justify-center text-xs font-bold text-white">
                  {selectionIndex + 1}
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-sm bg-gradient-to-br ${service.gradient}
                                flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{service.name}</h4>
                    {isSelected && (
                      <Check className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{service.description}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getComplexityColor(service.complexity)}`}>
                      {service.complexity === 'simple' ? 'Simple' :
                       service.complexity === 'moderate' ? 'Moderado' : 'Complejo'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {service.estimatedTime}
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
