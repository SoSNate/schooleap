/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    // Dynamic color classes used in Menu buttons
    { pattern: /border-(purple|emerald|blue|cyan)-(400|600)/ },
    { pattern: /text-(purple|emerald|blue|cyan)-(400|600)/, variants: ['dark'] },
    { pattern: /bg-(purple|emerald|blue|cyan)-(50|900)/, variants: ['dark'] },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
