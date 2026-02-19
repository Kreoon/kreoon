import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Zap } from "lucide-react";

interface TechKpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  goalValue?: number;
  goalLabel?: string;
  chartType?: "radial" | "bar" | "sparkline" | "none";
  chartData?: number[];
  color?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  size?: "sm" | "md" | "lg";
}

// Animated counter
const AnimatedCounter = ({ 
  value, 
  prefix = "", 
  suffix = "" 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Radial progress chart
const RadialChart = ({ 
  value, 
  max, 
  color 
}: { 
  value: number; 
  max: number; 
  color: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="hsl(250 20% 15%)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span 
          className="text-sm font-bold"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color }}
        >
          {Math.round(percentage)}%
        </motion.span>
      </div>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            `0 0 20px ${color}33`,
            `0 0 40px ${color}55`,
            `0 0 20px ${color}33`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

// Bar chart mini
const BarChart = ({ 
  data, 
  color 
}: { 
  data: number[]; 
  color: string;
}) => {
  const max = Math.max(...data);
  
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((value, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-t-sm"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
          initial={{ height: 0 }}
          animate={{ height: `${(value / max) * 100}%` }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
        />
      ))}
    </div>
  );
};

// Sparkline chart
const SparklineChart = ({ 
  data, 
  color 
}: { 
  data: number[]; 
  color: string;
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-24 h-10">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <motion.polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#gradient-${color})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
        {/* End dot */}
        <motion.circle
          cx="100"
          cy={100 - ((data[data.length - 1] - min) / range) * 100}
          r="3"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
    </div>
  );
};

const colorMap = {
  violet: "hsl(270 100% 60%)",
  cyan: "hsl(190 100% 50%)",
  emerald: "hsl(160 100% 45%)",
  amber: "hsl(40 100% 50%)",
  rose: "hsl(350 100% 60%)",
};

export function TechKpiCard({
  title,
  value,
  icon: Icon,
  trend,
  onClick,
  subtitle,
  prefix = "",
  suffix = "",
  goalValue,
  goalLabel,
  chartType = "none",
  chartData = [30, 45, 35, 60, 48, 72, 55],
  color = "violet",
  size = "md",
}: TechKpiCardProps) {
  const colorValue = colorMap[color];
  
  const sizeConfig = {
    sm: {
      padding: "p-4",
      iconSize: "h-4 w-4",
      titleSize: "text-[10px]",
      valueSize: "text-xl",
    },
    md: {
      padding: "p-5",
      iconSize: "h-5 w-5",
      titleSize: "text-xs",
      valueSize: "text-2xl md:text-3xl",
    },
    lg: {
      padding: "p-6",
      iconSize: "h-6 w-6",
      titleSize: "text-sm",
      valueSize: "text-3xl md:text-4xl",
    },
  };

  const sizeConf = sizeConfig[size];

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card via-card to-background",
        "border border-[hsl(270,100%,60%,0.15)]",
        "transition-all duration-500 ease-out",
        sizeConf.padding,
        onClick && "cursor-pointer"
      )}
      whileHover={{ 
        scale: 1.02,
        borderColor: `${colorValue}66`,
        boxShadow: `0 0 40px ${colorValue}33`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Animated gradient orb */}
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colorValue}33, transparent 70%)` }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />


      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(${colorValue}40 1px, transparent 1px),
                           linear-gradient(90deg, ${colorValue}40 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Top highlight */}
      <div 
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${colorValue}66, transparent)` }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            <motion.div 
              className="p-2 rounded-lg"
              style={{ 
                background: `${colorValue}15`,
                border: `1px solid ${colorValue}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 0 0 ${colorValue}00`,
                  `0 0 15px 3px ${colorValue}40`,
                  `0 0 0 0 ${colorValue}00`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className={cn(sizeConf.iconSize)} style={{ color: colorValue }} />
            </motion.div>
            <p 
              className={cn(
                "font-semibold uppercase tracking-[0.15em]",
                sizeConf.titleSize
              )}
              style={{ color: `${colorValue}cc` }}
            >
              {title}
            </p>
          </div>

          {/* Value */}
          <motion.p 
            className={cn("font-bold tracking-tight text-white mb-1", sizeConf.valueSize)}
            style={{ 
              textShadow: `0 0 20px ${colorValue}40`,
            }}
          >
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </motion.p>
          
          {subtitle && (
            <p className="text-sm" style={{ color: `${colorValue}99` }}>{subtitle}</p>
          )}

          {/* Trend indicator */}
          {trend !== undefined && trend !== 0 && (
            <motion.div 
              className="flex items-center gap-2 mt-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                "border backdrop-blur-sm"
              )} style={{
                background: trend > 0 ? `${colorValue}15` : "hsl(350 80% 50% / 0.15)",
                borderColor: trend > 0 ? `${colorValue}30` : "hsl(350 80% 50% / 0.3)",
                color: trend > 0 ? colorValue : "hsl(350 80% 60%)",
              }}>
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend > 0 && "+"}{trend}%
              </div>
              <span className="text-xs text-[hsl(250,20%,40%)]">vs anterior</span>
            </motion.div>
          )}
        </div>

        {/* Chart section */}
        <div className="ml-4">
          {chartType === "radial" && goalValue && (
            <RadialChart value={value} max={goalValue} color={colorValue} />
          )}
          {chartType === "bar" && (
            <BarChart data={chartData} color={colorValue} />
          )}
          {chartType === "sparkline" && (
            <SparklineChart data={chartData} color={colorValue} />
          )}
          {chartType === "none" && (
            <motion.div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colorValue}20, ${colorValue}05)`,
                border: `1px solid ${colorValue}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 20px ${colorValue}20`,
                  `0 0 40px ${colorValue}40`,
                  `0 0 20px ${colorValue}20`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="w-8 h-8" style={{ color: colorValue }} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Goal progress bar */}
      {goalValue && goalValue > 0 && chartType !== "radial" && (
        <div className="mt-4 space-y-2 relative z-10">
          <div className="flex justify-between text-xs">
            <span style={{ color: `${colorValue}88` }}>{goalLabel || 'Meta'}</span>
            <span style={{ color: colorValue }} className="font-medium">
              {Math.round(Math.min((value / goalValue) * 100, 100))}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden border" style={{ borderColor: `${colorValue}20` }}>
            <motion.div 
              className="h-full rounded-full relative overflow-hidden"
              style={{ 
                background: `linear-gradient(90deg, ${colorValue}, ${colorValue}cc)`,
                boxShadow: `0 0 15px ${colorValue}66`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((value / goalValue) * 100, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Bottom accent */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${colorValue}66, transparent)` }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}
