import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ponytail: static prerender for GitHub Pages (yaffalhakim1.github.io/waku).
// No Cloudflare/worker runtime, no server fns — the page fetches the GitHub
// releases API client-side.
export default defineConfig({
  base: '/waku/',
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    client: {
      build: {
        outDir: 'dist',
      },
    },
    server: {
      build: {
        outDir: 'dist/server',
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    viteReact(),
  ],
})
