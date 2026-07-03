import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  define: {
    __MAPBOX_ACCESS_TOKEN__: JSON.stringify(
      process.env.MAPBOX_ACCESS_TOKEN ??
        process.env.VITE_MAPBOX_ACCESS_TOKEN ??
        process.env.MAPBOX_TOKEN ??
        '',
    ),
  },
  build: {
    rollupOptions: {
      external: ['sharp'],
    },
  },
})
