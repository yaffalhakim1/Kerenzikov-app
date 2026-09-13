/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SITE_URL } from '@/lib/release'
import appCss from '@/styles.css?url'

const TITLE = 'Kerenzikov — one native Windows window for every coding agent'
const DESCRIPTION =
  'A native Windows app for local coding agents. Twelve providers over their own protocols, one timeline, sessions and transcripts on your own disk. OpenCode first, plus Claude Code, Codex, Amp, Cursor, Grok, Kimi, and Pi.'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:image', content: `${SITE_URL}/og-icon.png` },
      { name: 'twitter:card', content: 'summary' },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: light)',
        content: '#f2f9f4',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: dark)',
        content: '#070d09',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${SITE_URL}/favicon.png` },
      { rel: 'apple-touch-icon', sizes: '180x180', href: `${SITE_URL}/apple-touch-icon.png` },
    ],
    scripts: [
      {
        // Resolve the theme before first paint. A saved choice wins; otherwise
        // the system preference decides. Dark is the default register, so an
        // unreadable preference store still lands on dark rather than flashing
        // a light page.
        children: `try{var s=localStorage.getItem('kerenzikov-theme');var d=s?s==='dark':!window.matchMedia('(prefers-color-scheme: light)').matches;var e=document.documentElement;e.classList.toggle('light',!d);e.classList.toggle('dark',d)}catch(x){document.documentElement.classList.add('dark')}`,
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
