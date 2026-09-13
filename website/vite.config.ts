import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ponytail: static prerender for GitHub Pages. No Cloudflare/worker runtime,
// no server fns — the page fetches the GitHub releases API client-side.
//
// `base` must match the repo name, because Pages serves a project site at
// `<owner>.github.io/<repo>/`. It is read from BASE_PATH so renaming or moving
// the repo is a workflow change, not a code change. Defaults to the current
// repo so local `bun run build` keeps working untouched.
const base = process.env.BASE_PATH ?? '/waku/'

export default defineConfig({
  base,
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
