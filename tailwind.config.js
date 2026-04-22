/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    // צבעי זהות משחקים (Menu + גבולות + כפתורים)
    { pattern: /border-(purple|green|blue|yellow|orange|pink|teal|red)-(100|200|300|400|600|700|800)/ },
    { pattern: /text-(purple|green|blue|yellow|orange|pink|teal|red)-(300|400|600|700|800)/, variants: ['dark'] },
    { pattern: /bg-(purple|green|blue|yellow|orange|pink|teal|red)-(50|100|500|600|900)/, variants: ['dark'] },
    // צבעים ישנים לתאימות אחורה (shapes/rects בתוך משחקים)
    { pattern: /border-(emerald|cyan|violet|indigo)-(400|600)/ },
    { pattern: /text-(emerald|cyan|violet|indigo)-(400|600)/, variants: ['dark'] },
    { pattern: /bg-(emerald|cyan|violet|indigo)-(50|900)/, variants: ['dark'] },
  ],
  theme: {
    extend: {
      screens: {
        xs: '400px', // between mobile (320px) and sm (640px)
      },
    },
  },
  plugins: [],
}
