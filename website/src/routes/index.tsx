import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Menu } from '@base-ui/react/menu'
import { Download, Moon, Smartphone, Sun } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  GITHUB_URL,
  RELEASES_URL,
  releaseQuery,
} from '@/lib/release'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({
  loader: ({ context }) => {
    // Fire-and-forget: the version chip streams in when the GitHub API answers.
    void context.queryClient.prefetchQuery(releaseQuery)
  },
  component: Home,
})

const UPSTREAM_URL = 'https://github.com/egoist/waku'
const WINDOWS_DOCS_URL = `${GITHUB_URL}/blob/main/docs/windows.md`

const APP_NAME = 'Kerenzikov'
const THEME_KEY = 'kerenzikov-theme'

/** Marks that exist in `public/providers/`. The rest are named in the line below. */
const PROVIDERS = [
  { slug: 'opencode', label: 'OpenCode' },
  { slug: 'claude', label: 'Claude Code' },
  { slug: 'openai', label: 'Codex CLI' },
  { slug: 'amp', label: 'Amp' },
  { slug: 'cursor', label: 'Cursor CLI' },
  { slug: 'grok', label: 'Grok Build' },
  { slug: 'kimi', label: 'Kimi Code' },
  { slug: 'pi', label: 'Pi' },
  { slug: 'ohmypi', label: 'Oh My Pi' },
]

const ALSO_DRIVES = 'Copilot CLI · Fx · DeepSeek Harness'

/** The spec sheet is the identity: the facts, stated flatly. */
const SPEC: { key: string; value: string }[] = [
  { key: 'Form factor', value: 'One native binary. Rust + GPUI, no browser engine.' },
  { key: 'Platforms', value: 'Windows x86_64 · Windows arm64 · Android (building)' },
  { key: 'Agents', value: '12 providers over their own native protocols' },
  { key: 'Session model', value: 'One long-lived process per conversation' },
  { key: 'Storage', value: 'Local. SQLite, blob store, your user profile.' },
  { key: 'Updates', value: 'Manual. No updater, no feed.' },
  { key: 'Licence', value: 'GPL-3.0-only' },
  { key: 'Origin', value: 'Forked from an open-source GPL project' },
]

/** The interview. Real questions, answered concretely. */
const INTERVIEW: { q: string; a: string[] }[] = [
  {
    q: 'What is this, exactly?',
    a: [
      'A native desktop app for running and managing local coding agents. One window holds every project, every session, every transcript.',
      'It is a single Rust binary rendered by GPUI — the GPU-accelerated framework behind Zed — not a browser engine wearing a window frame.',
    ],
  },
  {
    q: 'Do I need new API keys or subscriptions?',
    a: [
      'No. Kerenzikov drives the agent CLIs already installed and authenticated on your machine. It detects each binary on launch and talks to it directly, so your existing logins, plans, and rate limits apply unchanged.',
    ],
  },
  {
    q: 'How can one app drive twelve different agents?',
    a: [
      'Each provider is reached through its strongest native interface — stream-json, JSON-RPC, the Agent Client Protocol, HTTP with server-sent events, or NDJSON — and normalized into one provider-neutral model.',
      'A session spans the whole conversation. Switching providers mid-project keeps each agent’s own context instead of replaying a transcript at it.',
    ],
  },
  {
    q: 'What happens when an agent edits my code?',
    a: [
      'Every prompt checkpoints your working tree under a hidden git ref. Rolling back restores the code and the provider conversation together, so the two never drift apart. You can also branch from an earlier turn.',
    ],
  },
  {
    q: 'Where does my data live?',
    a: [
      'On your disk. Tasks and transcripts in a local SQLite database, attachments in a local blob store, settings in your user profile.',
      'There is no account and no hosted service between you and your agents.',
    ],
  },
  {
    q: 'Can I drive it without a mouse?',
    a: [
      'Yes. Ctrl+N starts a session, Ctrl+Tab switches tasks, Ctrl+L focuses the composer, Escape stops a turn. Enter queues a follow-up while the agent is working; Ctrl+Enter steers the turn already in flight.',
      'Every control is reachable from the keyboard, and focus is always visible.',
    ],
  },
  {
    q: 'Does it phone home?',
    a: [
      'Only when the build was compiled with an analytics endpoint, and then only coarse events — app version, platform, and which provider ran.',
      'Prompts, file paths, project names, and provider output never leave the machine. The switch is in Settings.',
    ],
  },
  {
    q: 'What about macOS and Linux?',
    a: [
      'Not built here. This fork targets Windows. The desktop app that was native on macOS is still carried in the source, but nobody maintains or ships those builds, so treat them as unavailable rather than broken.',
      'If you are on macOS or Linux, use the upstream project instead — the link is in the footer.',
    ],
  },
  {
    q: 'Is this a fork?',
    a: [
      'Yes, of an open-source GPL-3.0 coding-agent client, tuned here for Windows with OpenCode as the best-supported provider. The licence and the upstream attribution travel with it.',
    ],
  },
  {
    q: 'How do updates work?',
    a: [
      'Manually. Kerenzikov ships no auto-updater and no update feed, so nothing replaces your binary behind your back. Download a new release when you want one.',
    ],
  },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p className="label">{children}</p>
}

/** Dark is the default; the choice persists across visits. */
function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains('light') ? 'light' : 'dark',
    )
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    const root = document.documentElement
    root.classList.toggle('light', next === 'light')
    root.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private mode: the choice just does not persist.
    }
  }

  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function DownloadMenu({
  primaryUrl,
  assets,
  variant = 'primary',
  showIcon = false,
}: {
  primaryUrl: string
  assets: {
    x64: string
    arm64: string
    portableX64: string
    apk: string
  } | null
  variant?: 'primary' | 'outline'
  showIcon?: boolean
}) {
  const itemClassName =
    'flex h-8 cursor-default items-center gap-2 rounded-[4px] px-2.5 text-sm outline-none data-highlighted:bg-[var(--color-paper-3)] data-highlighted:text-[var(--color-ink)] data-disabled:pointer-events-none data-disabled:opacity-45'

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Download for Windows"
        className={variant === 'primary' ? 'btn btn-primary' : 'btn btn-outline'}
      >
        {showIcon && <Download data-icon="inline-start" />}
        {/* The header row cannot fit the full label at 320px, so the visible
            text shortens while aria-label keeps the accessible name complete. */}
        <span className="hidden sm:inline">Download for Windows</span>
        <span className="sm:hidden">Download</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          sideOffset={6}
          align="start"
          className="isolate z-50"
        >
          <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-[6px] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 text-[var(--color-ink)] shadow-md outline-none data-[side=bottom]:slide-in-from-top-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Menu.LinkItem
              href={primaryUrl}
              closeOnClick
              className={itemClassName}
            >
              Windows (x86_64 installer)
            </Menu.LinkItem>
            <Menu.LinkItem
              href={assets?.arm64 ?? RELEASES_URL}
              closeOnClick
              className={itemClassName}
            >
              Windows (arm64 installer)
            </Menu.LinkItem>
            <Menu.LinkItem
              href={assets?.portableX64 ?? RELEASES_URL}
              closeOnClick
              className={itemClassName}
            >
              Portable (.zip)
            </Menu.LinkItem>
            <Menu.LinkItem
              href={assets?.apk ?? RELEASES_URL}
              closeOnClick
              className={itemClassName}
            >
              <Smartphone className="size-3.5 shrink-0 opacity-70" />
              Android (universal APK)
            </Menu.LinkItem>
            <Menu.LinkItem
              href={RELEASES_URL}
              closeOnClick
              className={itemClassName}
            >
              All releases
            </Menu.LinkItem>
            <Menu.LinkItem
              href={WINDOWS_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              closeOnClick
              className={itemClassName}
            >
              Requirements & docs
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

function VersionChip({ version }: { version: string }) {
  return (
    <span className="mono text-xs text-[var(--color-muted)]">v{version}</span>
  )
}

function Home() {
  const { data: release } = useQuery(releaseQuery)
  const primaryUrl = release?.assets?.x64 ?? RELEASES_URL

  return (
    <TooltipProvider>
      <div className="min-h-dvh">
        {/* N9 · Edge-aligned minimal. Wordmark left, one action right, and a
            deliberate void between them. The absence is the design. */}
        <header className="flex items-center justify-between px-[var(--page-gutter)] py-[var(--space-md)]">
          <a
            href={import.meta.env.BASE_URL}
            className="wordmark text-[1.0625rem] text-[var(--color-ink)] no-underline"
          >
            {APP_NAME}
          </a>
          <div className="flex items-center gap-[var(--space-2xs)]">
            <ThemeToggle />
            <DownloadMenu
              primaryUrl={primaryUrl}
              assets={release?.assets ?? null}
              variant="outline"
            />
          </div>
        </header>

        <main>
          {/* Opener — a statement and the facts. No badge, no eyebrow. */}
          <section className="px-[var(--page-gutter)] pt-[var(--space-xl)] pb-[var(--space-2xl)]">
            <h1 className="display rise text-[length:var(--text-display)]">
              One window for every coding agent.
            </h1>

            <p className="prose-measure mt-[var(--space-md)] text-[length:var(--text-md)] leading-[1.55] text-[var(--color-ink-2)] text-pretty">
              A single native binary that drives the agent CLIs already on your
              machine — over their own protocols, on your own disk, with no
              account in between.
            </p>

            <div className="mt-[var(--space-lg)] flex flex-wrap items-center gap-x-[var(--space-sm)] gap-y-[var(--space-xs)]">
              <DownloadMenu
                primaryUrl={primaryUrl}
                assets={release?.assets ?? null}
                showIcon
              />
              {release && <VersionChip version={release.version} />}
            </div>

            {/* F3 · Tabular spec sheet. The facts carry the opener. */}
            <dl className="mt-[var(--space-2xl)] grid grid-cols-[minmax(0,1fr)] border-t border-[var(--color-rule)]">
              {SPEC.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1fr)] gap-x-[var(--space-md)] gap-y-[var(--space-3xs)] border-b border-[var(--color-rule-2)] py-[var(--space-sm)] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"
                >
                  <dt className="label pt-[0.2em]">{row.key}</dt>
                  <dd className="text-[length:var(--text-sm)] leading-[1.6] text-[var(--color-ink-2)]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Providers — the marks, then the ones without marks named. */}
          <section className="px-[var(--page-gutter)] pb-[var(--space-2xl)]">
            <Label>Drives the agents you already use</Label>
            <div className="mt-[var(--space-sm)] flex flex-wrap items-center gap-x-[var(--space-lg)] gap-y-[var(--space-sm)]">
              {PROVIDERS.map((p) => (
                <Tooltip key={p.slug}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={p.label}
                        className="cursor-default rounded-[2px] text-[var(--color-muted)] outline-none transition-colors hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)]"
                      />
                    }
                  >
                    <span
                      className="provider-mark size-[20px]"
                      style={{
                        maskImage: `url(${import.meta.env.BASE_URL}providers/${p.slug}.svg)`,
                        WebkitMaskImage: `url(${import.meta.env.BASE_URL}providers/${p.slug}.svg)`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{p.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <p className="mono mt-[var(--space-sm)] text-xs text-[var(--color-muted)]">
              Also {ALSO_DRIVES}
            </p>
          </section>

          {/* The product, shown plainly. No re-drawn chrome around it.
              Both captures ship and CSS picks one, so the screenshot follows
              the site's theme toggle rather than the OS preference. */}
          <figure className="border-y border-[var(--color-rule)]">
            <img
              src={`${import.meta.env.BASE_URL}app-screenshot-dark.png`}
              alt={`${APP_NAME} showing a coding-agent session: task list on the left, transcript and tool activity in the centre, file diffs on the right`}
              width={2266}
              height={1752}
              className="shot shot-dark block h-auto w-full"
            />
            <img
              src={`${import.meta.env.BASE_URL}app-screenshot-light.png`}
              alt={`${APP_NAME} showing a coding-agent session: task list on the left, transcript and tool activity in the centre, file diffs on the right`}
              width={2266}
              height={1752}
              className="shot shot-light block h-auto w-full"
            />
            <figcaption className="mono border-t border-[var(--color-rule-2)] px-[var(--page-gutter)] py-[var(--space-sm)] text-xs text-[var(--color-muted)]">
              A session in progress. Tasks left, transcript centre, diffs right.
            </figcaption>
          </figure>

          {/* The interview. Each heading is the question. */}
          <section
            aria-labelledby="interview-heading"
            className="px-[var(--page-gutter)] py-[var(--space-2xl)]"
          >
            <h2
              id="interview-heading"
              className="display text-[length:var(--text-xl)]"
            >
              Straight answers
            </h2>

            <div className="mt-[var(--space-lg)]">
              {INTERVIEW.map((item) => (
                <div
                  key={item.q}
                  className="flex flex-col gap-[var(--space-sm)] border-t border-[var(--color-rule)] py-[var(--space-lg)]"
                >
                  <h3 className="display max-w-[24ch] text-[length:var(--text-lg)] text-[var(--color-ink)]">
                    {item.q}
                  </h3>
                  <div className="prose-measure flex flex-col gap-[var(--space-sm)]">
                    {item.a.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[length:var(--text-base)] leading-[1.65] text-[var(--color-ink-2)]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Download. */}
          <section
            id="download"
            aria-labelledby="download-heading"
            className="border-t border-[var(--color-rule)] px-[var(--page-gutter)] py-[var(--space-2xl)]"
          >
            <h2
              id="download-heading"
              className="display text-[length:var(--text-xl)]"
            >
              Get {APP_NAME}
            </h2>
            <p className="prose-measure mt-[var(--space-sm)] text-[length:var(--text-base)] leading-[1.65] text-[var(--color-ink-2)]">
              Per-user installer for Windows, with a portable archive beside
              it and an arm64 build for ARM machines. The Android companion
              ships as a universal APK. Install and authenticate at least one
              agent CLI first — {APP_NAME} drives those, it does not replace
              them.
            </p>
            <div className="mt-[var(--space-lg)] flex flex-wrap items-center gap-x-[var(--space-sm)] gap-y-[var(--space-xs)]">
              <DownloadMenu
                primaryUrl={primaryUrl}
                assets={release?.assets ?? null}
                showIcon
              />
              <a
                className="link text-[length:var(--text-sm)]"
                href={WINDOWS_DOCS_URL}
                target="_blank"
                rel="noreferrer"
              >
                Requirements
              </a>
              <a
                className="link text-[length:var(--text-sm)]"
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
              {release && <VersionChip version={release.version} />}
            </div>
          </section>
        </main>

        {/* Ft4 · Dense typographic colophon. */}
        <footer className="colophon border-t border-[var(--color-rule)] px-[var(--page-gutter)] py-[var(--space-xl)]">
          <p className="mono max-w-[70ch] text-xs leading-[1.8] text-[var(--color-muted)]">
            {APP_NAME}
            {release ? ` v${release.version}` : ''} — built by{' '}
            <a
              className="link"
              href="https://yafialhakim.netlify.app"
              target="_blank"
              rel="noreferrer"
            >
              Yafi Alhakim
            </a>
            . A fork of an open-source GPL-3.0 coding-agent client by{' '}
            <a
              className="link"
              href={UPSTREAM_URL}
              target="_blank"
              rel="noreferrer"
            >
              egoist
            </a>
            . Built with Rust, GPUI, Space Grotesk, Geist, and Geist Mono.
            Windows and Android only; macOS and Linux builds are unmaintained
            here. Source and releases at{' '}
            <a className="link" href={GITHUB_URL} target="_blank" rel="noreferrer">
              {GITHUB_URL.replace('https://', '')}
            </a>
            .
          </p>
        </footer>
      </div>
    </TooltipProvider>
  )
}
