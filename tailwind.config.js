/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: { 50: '#f5f0ff', 100: '#ede4ff', 200: '#d9c5ff', 300: '#c0a0f2', 400: '#9460ed', 500: '#7135d1', 600: '#5b21b6', 700: '#4c1d95', 800: '#391174', 900: '#2a0e57', 950: '#1b083a' },
        indigo: { 50: '#f5f0ff', 100: '#ede4ff', 200: '#d9c5ff', 300: '#c0a0f2', 400: '#9460ed', 500: '#7135d1', 600: '#5b21b6', 700: '#4c1d95', 800: '#391174', 900: '#2a0e57', 950: '#1b083a' },
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0b1b2b',
        },
        brand: {
          primary: '#4c1d95', // Deep Purple from logo
          primaryLight: '#6d28d9',
          accent: '#00a8ed', // Sky Blue from logo
          accentLight: '#67d5ff',
          emerald: '#15803d', // Green from logo chart
          slate: '#1E293B',
          blue: '#1e40af',
          sky: '#0284c7',
          rose: '#e11d48',
          amber: '#d97706',
          violet: '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
