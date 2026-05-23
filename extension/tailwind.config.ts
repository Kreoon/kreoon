import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        kreoon: {
          green: '#22c55e',
          dark: '#0a0a0a',
          surface: '#111111',
          border: '#1f1f1f',
          muted: '#6b7280',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
