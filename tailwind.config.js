/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        }
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
         toastIn: {
    '0%':   { transform: 'translateY(-120%)', opacity: '0' },
    '100%': { transform: 'translateY(0)',     opacity: '1' }
  }
},
animation: {
  slideUp: 'slideUp .2s ease-out',
  toastIn: 'toastIn .2s ease-out'
}
      }
    }
  }