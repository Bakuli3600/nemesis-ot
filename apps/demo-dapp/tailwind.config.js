import type { Config } from 'tailwindcss';

/**
 * Cognitia Shield — demo dApp design system.
 * Light premium base (Apple-style neutrals) + deep graphite "console" surfaces
 * for the live attack simulation and threat-intelligence sections.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'Cascadia Code', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0c12',
          900: '#10131c',
          800: '#181c28',
          700: '#232838',
          600: '#313750',
        },
        fog: {
          50: '#fafafa',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d2d2d7',
          400: '#a1a1a6',
          500: '#6e6e73',
        },
        accent: {
          blue: '#0071e3',
          'blue-dark': '#0060c2',
          teal: '#2dd4bf',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'card-lg': '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.10)',
        console: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 64px rgba(0,0,0,0.55)',
        glow: '0 0 0 1px rgba(0,113,227,0.25), 0 8px 32px rgba(0,113,227,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flow-dash': {
          to: { strokeDashoffset: '-24' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'flow-dash': 'flow-dash 1.1s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.22,1,0.36,1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
