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
        sans: ['"Crimson Text"', 'Georgia', 'serif'],
        display: ['"Cinzel Decorative"', '"Cinzel"', 'serif'],
        medieval: ['"Cinzel"', 'serif'],
        body: ['"Crimson Text"', 'Georgia', 'serif'],
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
        // Medieval Level Colors
        bronze: "hsl(var(--level-bronze))",
        silver: "hsl(var(--level-silver))",
        gold: "hsl(var(--gold))",
        diamond: "hsl(var(--level-diamond))",
        // Medieval Accent Colors
        rust: "hsl(var(--rust))",
        leather: "hsl(var(--leather))",
        parchment: "hsl(var(--parchment))",
        iron: "hsl(var(--iron))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "torch-flicker": {
          "0%, 100%": { 
            filter: "brightness(1)",
            transform: "scale(1)",
          },
          "25%": { 
            filter: "brightness(1.15)",
            transform: "scale(1.03)",
          },
          "50%": { 
            filter: "brightness(0.9)",
            transform: "scale(0.97)",
          },
          "75%": { 
            filter: "brightness(1.1)",
            transform: "scale(1.02)",
          },
        },
        "torch-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(38 75% 50% / 0.4), 0 0 40px hsl(38 75% 50% / 0.2)",
            filter: "brightness(1)",
          },
          "50%": { 
            boxShadow: "0 0 30px hsl(38 75% 50% / 0.6), 0 0 60px hsl(38 75% 50% / 0.3)",
            filter: "brightness(1.1)",
          },
        },
        "ember-float": {
          "0%": { 
            transform: "translateY(0) translateX(0) scale(1)",
            opacity: "1",
          },
          "50%": { 
            transform: "translateY(-10px) translateX(5px) scale(0.8)",
            opacity: "0.6",
          },
          "100%": { 
            transform: "translateY(-20px) translateX(-5px) scale(0.5)",
            opacity: "0",
          },
        },
        "fire-dance": {
          "0%, 100%": { 
            transform: "scaleY(1) scaleX(1)",
            opacity: "1",
          },
          "25%": { 
            transform: "scaleY(1.1) scaleX(0.95)",
            opacity: "0.9",
          },
          "50%": { 
            transform: "scaleY(0.95) scaleX(1.05)",
            opacity: "1",
          },
          "75%": { 
            transform: "scaleY(1.05) scaleX(0.98)",
            opacity: "0.95",
          },
        },
        "golden-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 5px hsl(38 75% 50% / 0.3), inset 0 0 10px hsl(38 75% 50% / 0.1)",
          },
          "50%": { 
            boxShadow: "0 0 20px hsl(38 75% 50% / 0.5), inset 0 0 20px hsl(38 75% 50% / 0.2)",
          },
        },
        "sword-gleam": {
          "0%": { 
            backgroundPosition: "-200% center",
          },
          "100%": { 
            backgroundPosition: "200% center",
          },
        },
        "magic-sparkle": {
          "0%, 100%": { 
            opacity: "0",
            transform: "scale(0) rotate(0deg)",
          },
          "50%": { 
            opacity: "1",
            transform: "scale(1) rotate(180deg)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        marquee: "marquee 10s linear infinite",
        "torch-flicker": "torch-flicker 2s ease-in-out infinite",
        "torch-glow": "torch-glow 3s ease-in-out infinite",
        "ember-float": "ember-float 2s ease-out infinite",
        "fire-dance": "fire-dance 1.5s ease-in-out infinite",
        "golden-pulse": "golden-pulse 2s ease-in-out infinite",
        "sword-gleam": "sword-gleam 3s ease-in-out infinite",
        "magic-sparkle": "magic-sparkle 1.5s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-parchment': 'var(--gradient-parchment)',
        'gradient-stone': 'var(--gradient-stone)',
        'gradient-banner': 'var(--gradient-banner)',
        'gradient-royal': 'var(--gradient-royal)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;