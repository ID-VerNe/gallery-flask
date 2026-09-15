/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#121316',
          800: '#1a1c23',
          700: '#242731',
          600: '#2e323f',
        }
      }
    },
  },
  plugins: [],
}
