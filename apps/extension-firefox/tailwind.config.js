import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        cognitia: {
          cyan: '#06b6d4',
          navy: '#050811',
          graphite: '#0d121d',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
