/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep jamun purple base
        jamun: {
          50: '#f5f0fa',
          100: '#ebe0f3',
          200: '#d4bce6',
          300: '#b89bd6',
          400: '#9a72c4',
          500: '#7e52b0',
          600: '#673f9c',
          700: '#523180',
          800: '#3d2460',
          900: '#2a1844',
          950: '#1a0f2e',
          975: '#0f0a1e',
        },
        // Mint green accent
        mint: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Gold/amber accent
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};