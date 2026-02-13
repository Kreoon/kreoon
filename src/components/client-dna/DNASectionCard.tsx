import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DNASectionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function DNASectionCard({
  title,
  description,
  icon: Icon,
  gradient,
  isExpanded,
  onToggle,
  children
}: DNASectionCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 transition-all duration-300">
      {/* Background */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        isExpanded ? 'opacity-100' : 'opacity-50'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      </div>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

      {/* Header - Clickeable */}
      <button
        onClick={onToggle}
        className="relative w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} p-[2px]`}>
            <div className="w-full h-full rounded-xl bg-black/80 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>

        {/* Chevron */}
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                        transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {/* Content */}
      <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 pt-2 border-t border-white/5">
          {children}
        </div>
      </div>
    </div>
  );
}
