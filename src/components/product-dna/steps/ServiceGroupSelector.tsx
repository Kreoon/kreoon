import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Star } from 'lucide-react';
import { ServiceGroupConfig } from '@/config/service-catalog';

interface ServiceGroupSelectorProps {
  groups: ServiceGroupConfig[];
  selectedGroup: ServiceGroupConfig | null;
  onSelect: (group: ServiceGroupConfig) => void;
}

export function ServiceGroupSelector({ groups, selectedGroup, onSelect }: ServiceGroupSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((group, index) => {
        const Icon = group.icon;
        const isSelected = selectedGroup?.id === group.id;
        const isRecommended = group.id === 'content_creation'; // Destacar UGC

        return (
          <motion.button
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(group)}
            className={`relative overflow-hidden p-6 rounded-sm border text-left
                       transition-all duration-300 group ${
              isSelected
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${group.gradient}
                            opacity-0 group-hover:opacity-10 transition-opacity`} />

            {/* Recommended Badge */}
            {isRecommended && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1
                              rounded-full bg-amber-500/20 border border-amber-500/30">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Popular</span>
              </div>
            )}

            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-sm bg-gradient-to-br ${group.gradient}
                              flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  {group.name}
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform
                                           group-hover:translate-x-1 ${isSelected ? 'text-purple-400' : ''}`} />
                </h3>
                <p className="text-sm text-gray-400">{group.description}</p>

                {/* Services Preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {group.services.slice(0, 3).map((service) => (
                    <span
                      key={service.id}
                      className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-500"
                    >
                      {service.name}
                    </span>
                  ))}
                  {group.services.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-500">
                      +{group.services.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <motion.div
                layoutId="group-selection"
                className="absolute inset-0 border-2 border-purple-500 rounded-sm pointer-events-none"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
