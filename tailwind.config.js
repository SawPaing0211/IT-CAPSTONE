/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0b1120',      // Deep dark background from prototype
          card: '#1e293b',    // Card/panel background
          accent: '#eab308',  // Yellow/Gold for buttons & highlights
          text: '#f8fafc',    // Main text color
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}