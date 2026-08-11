// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1A2A3A',
        'electric-blue': '#3B82F6',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
        'card-dark': '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.10)',
      },
      spacing: {
        'sidebar-collapsed': '72px',
        'sidebar-expanded': '240px',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}