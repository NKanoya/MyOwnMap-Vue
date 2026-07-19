import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Build that produces the published library (dist/). The dev/demo setup
// keeps using the default vite.config.js so `npm run dev` is untouched.
export default defineConfig({
  plugins: [vue()],
  // The library has no use for public/ assets (favicon, sample maps) and
  // must not copy them in — otherwise a 13 MB test.png leaks into the bundle.
  publicDir: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'CustomMap',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
    },
    rollupOptions: {
      // vue is the only PrimeVue-free peer; primeicons stays bundled so the
      // package's control icons work out of the box with zero host deps.
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
        assetFileNames: 'index[extname]', // index.css
      },
    },
    cssCodeSplit: false,
    emptyOutDir: true,
  },
})
