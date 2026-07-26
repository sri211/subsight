import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        card: '#1a1d27',
        border: '#2a2d3a',
        accent: '#5b8dee',
        positive: '#22c55e',
        negative: '#ef4444',
        warning: '#f59e0b',
        muted: '#64748b',
        primary: '#f1f5f9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
