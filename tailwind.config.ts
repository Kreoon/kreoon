import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'Satoshi', 'sans-serif'],
        body: ['Inter', 'Satoshi', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // KREOON Level Colors
        violet: "hsl(var(--violet))",
        bronze: "hsl(var(--level-bronze))",
        silver: "hsl(var(--level-silver))",
        gold: "hsl(var(--level-gold))",
        diamond: "hsl(var(--level-diamond))",
        // Social Theme
        social: {
          background: "hsl(var(--social-background))",
          foreground: "hsl(var(--social-foreground))",
          card: "hsl(var(--social-card))",
          "card-foreground": "hsl(var(--social-card-foreground))",
          muted: "hsl(var(--social-muted))",
          "muted-foreground": "hsl(var(--social-muted-foreground))",
          accent: "hsl(var(--social-accent))",
          "accent-foreground": "hsl(var(--social-accent-foreground))",
          border: "hsl(var(--social-border))",
          input: "hsl(var(--social-input))",
        },
        // Reaction colors
        reaction: {
          love: "hsl(var(--reaction-love))",
          fire: "hsl(var(--reaction-fire))",
          clap: "hsl(var(--reaction-clap))",
          wow: "hsl(var(--reaction-wow))",
          sad: "hsl(var(--reaction-sad))",
        },
        // Kreoon palette
        "kreoon-bg-primary": "#0a0a0f",
        "kreoon-bg-secondary": "#12121a",
        "kreoon-bg-card": "#1a1a24",
        "kreoon-purple-500": "#7c3aed",
        "kreoon-purple-400": "#a855f7",
        "kreoon-purple-600": "#6d28d9",
        "kreoon-purple-glow": "rgba(124, 58, 237, 0.3)",
        "kreoon-border": "rgba(139, 92, 246, 0.2)",
        "kreoon-text-primary": "#ffffff",
        "kreoon-text-secondary": "#a1a1aa",
        "kreoon-text-muted": "#71717a",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px hsl(282 100% 36% / 0.3)" },
          "50%": { boxShadow: "0 0 25px hsl(282 100% 36% / 0.5)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "bounce-heart": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.3)" },
          "50%": { transform: "scale(0.95)" },
          "75%": { transform: "scale(1.1)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-bottom": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-5deg)" },
          "75%": { transform: "rotate(5deg)" },
        },
        "confetti": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(-100px) rotate(720deg)", opacity: "0" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "kreoon-skeleton-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        "kreoon-skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-up": "fade-up 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "slide-down": "slide-down 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "bounce-heart": "bounce-heart 0.4s ease-out",
        "pop-in": "pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "wiggle": "wiggle 0.3s ease-in-out",
        "confetti": "confetti 0.8s ease-out forwards",
        "spin-slow": "spin-slow 3s linear infinite",
        "kreoon-skeleton-pulse": "kreoon-skeleton-pulse 1.5s ease-in-out infinite",
        "kreoon-skeleton-shimmer": "kreoon-skeleton-shimmer 1.5s ease-in-out infinite",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-glow': 'var(--gradient-glow)',
        'kreoon-gradient': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        'kreoon-gradient-dark': 'linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'violet': 'var(--shadow-violet)',
        'glow-sm': '0 0 15px hsl(282 100% 36% / 0.2)',
        'kreoon-glow': '0 0 40px rgba(124, 58, 237, 0.3)',
        'kreoon-glow-lg': '0 0 60px rgba(124, 58, 237, 0.4)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
