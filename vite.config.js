export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // מבטיח שלא ייווצרו קבצי מפה שחושפים את הקוד המקורי
  }
})
