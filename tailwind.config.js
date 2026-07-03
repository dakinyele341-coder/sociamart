/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        navy: 'var(--color-navy)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        verified: 'var(--color-verified)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 10px 15px -3px rgba(26, 26, 46, 0.1), 0 4px 6px -2px rgba(26, 26, 46, 0.05)',
        soft: '0 1px 3px 0 rgba(26, 26, 46, 0.08), 0 1px 2px 0 rgba(26, 26, 46, 0.04)',
        nav: '0 -2px 12px -2px rgba(26, 26, 46, 0.08)',
      },
      transitionTimingFunction: {
        tactile: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'sheet-up': 'sheet-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
