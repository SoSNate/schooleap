import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// הגדרות עבור Vercel ואבטחת קוד המקור
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // השבתת Source Maps מונעת מהדפדפן להציג את קבצי המקור המקוריים (JSX) שלכם.
    // זהו צעד קריטי להגנה על הקוד באתר החי.
    sourcemap: false,
    
    // כיווץ הקוד (Minification) הופך אותו לבלתי קריא עבור בני אדם
    minify: 'oxc',
  }
})