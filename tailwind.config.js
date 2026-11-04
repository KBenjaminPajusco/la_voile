/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#050b18',
        navy: { 950: '#07101f', 900: '#0a1628', 850: '#0d1c33', 800: '#10223d', 700: '#16304f', 600: '#1e3d63' },
        sea: { 500: '#1f7ae0', 400: '#3b95f0', 300: '#6cb4f7' },
        cyan: { 400: '#22d3ee', 300: '#67e8f9' },
        warn: '#f59e0b',
        alarm: '#ef4444',
        good: '#34d399',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Rajdhani"', '"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
