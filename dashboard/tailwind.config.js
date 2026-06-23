/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0d1117',
          card: 'rgba(22, 27, 34, 0.7)',
          border: 'rgba(48, 54, 61, 0.6)',
          accent: '#58a6ff',
          success: '#2ea44f',
        }
      }
    },
  },
  plugins: [],
}
