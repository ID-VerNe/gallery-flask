/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          'surface-hover': 'var(--color-bg-surface-hover)',
          header: 'var(--color-bg-header)',
          panel: 'var(--color-bg-panel)',
          input: 'var(--color-bg-input)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          default: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        button: {
          DEFAULT: 'var(--color-bg-button)',
          hover: 'var(--color-bg-button-hover)',
        }
      }
    },
  },
  plugins: [],
}
