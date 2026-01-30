import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface DashboardKpiCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  subtitle?: ReactNode;
  trend?: number;
  children?: ReactNode;
  className?: string;
  borderColor?: string;
}

export function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  iconColor = "hsl(270 100% 60%)",
  onClick,
  subtitle,
  trend,
  children,
  className,
  borderColor
}: DashboardKpiCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl p-4",
        "bg-gradient-to-br from-[hsl(250,20%,7%)] to-[hsl(250,20%,5%)]",
        "border transition-all duration-500",
        onClick && "cursor-pointer",
        className
      )}
      style={{ 
        borderColor: borderColor || `${iconColor}33`,
      }}
      whileHover={onClick ? { 
        scale: 1.02,
        boxShadow: `0 0 30px ${iconColor}25`,
      } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Animated gradient orb */}
      <motion.div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${iconColor}30, transparent 70%)` }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />


      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <motion.div 
            className="p-2 rounded-lg"
            style={{ 
              background: `${iconColor}15`,
              border: `1px solid ${iconColor}30`,
            }}
            whileHover={{
              boxShadow: `0 0 15px ${iconColor}40`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </motion.div>
          <span className="text-sm text-[hsl(270,30%,60%)]">{title}</span>
        </div>
        
        <div className="text-3xl font-bold text-white mb-1" style={{ textShadow: `0 0 20px ${iconColor}30` }}>
          {value}
        </div>
        
        {subtitle && (
          <div className="text-sm text-[hsl(270,30%,55%)]">{subtitle}</div>
        )}

        {trend !== undefined && trend !== 0 && (
          <motion.div 
            className="flex items-center gap-1 mt-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              "border backdrop-blur-sm"
            )} style={{
              background: trend > 0 ? `${iconColor}15` : "hsl(350 80% 50% / 0.15)",
              borderColor: trend > 0 ? `${iconColor}30` : "hsl(350 80% 50% / 0.3)",
              color: trend > 0 ? iconColor : "hsl(350 80% 60%)",
            }}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend > 0 && "+"}{trend}%
            </div>
          </motion.div>
        )}

        {children}
      </div>

      {/* Bottom accent */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${iconColor}50, transparent)` }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}

// Animated progress bar with glow
export function TechProgress({ 
  value, 
  max = 100, 
  color = "hsl(270 100% 60%)",
  label,
  showPercent = true
}: { 
  value: number; 
  max?: number; 
  color?: string;
  label?: string;
  showPercent?: boolean;
}) {
  const percent = Math.min((value / max) * 100, 100);
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(270,30%,55%)]">{label || 'Meta'}: {max.toLocaleString()}</span>
        {showPercent && (
          <span style={{ color }} className="font-medium">
            {Math.round(percent)}%
          </span>
        )}
      </div>
      <div className="h-2 bg-[hsl(250,20%,10%)] rounded-full overflow-hidden border" style={{ borderColor: `${color}20` }}>
        <motion.div 
          className="h-full rounded-full relative overflow-hidden"
          style={{ 
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 15px ${color}66`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Pipeline item with glow
export function PipelineItem({
  icon: Icon,
  value,
  label,
  color,
  onClick
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div 
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg text-center transition-all cursor-pointer",
        "border backdrop-blur-sm"
      )}
      style={{
        background: `${color}10`,
        borderColor: `${color}25`,
      }}
      whileHover={{
        scale: 1.05,
        boxShadow: `0 0 20px ${color}30`,
        borderColor: `${color}50`,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
      <motion.p 
        className="text-xl font-bold" 
        style={{ color, textShadow: `0 0 10px ${color}50` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {value}
      </motion.p>
      <p className="text-[10px] text-[hsl(270,30%,55%)]">{label}</p>
    </motion.div>
  );
}

// Section header with glow
export function TechSectionHeader({
  icon: Icon,
  title,
  action
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 0 0 hsl(270 100% 60% / 0)",
              "0 0 10px 2px hsl(270 100% 60% / 0.3)",
              "0 0 0 0 hsl(270 100% 60% / 0)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="p-1.5 rounded-lg bg-[hsl(270,100%,60%,0.1)]"
        >
          <Icon className="h-4 w-4 text-[hsl(270,100%,70%)]" />
        </motion.div>
        <span className="text-[hsl(270,100%,75%)]" style={{ textShadow: "0 0 10px hsl(270 100% 60% / 0.3)" }}>
          {title}
        </span>
      </h3>
      {action}
    </div>
  );
}
