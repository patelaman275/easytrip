/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        darkCard: '#111827',
        brandCyan: '#06b6d4',
        brandPurple: '#8b5cf6',
        brandCrimson: '#ef4444',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
