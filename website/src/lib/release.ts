import { queryOptions } from '@tanstack/react-query'

/**
 * One place to rename the project. Overridable at build time so moving the
 * site to its own repo is a workflow env change, not a code edit:
 *
 *   VITE_SITE_OWNER   github user/org that owns the site repo
 *   VITE_SITE_REPO    repo the site is published from (drives the Pages URL)
 *   VITE_RELEASE_REPO repo whose GitHub Releases the download buttons point at
 *
 * The site and the app can live in different repos; downloads follow
 * RELEASE_REPO, the Pages URL follows SITE_REPO.
 */
export const OWNER = import.meta.env.VITE_SITE_OWNER ?? 'yaffalhakim1'
export const REPO = import.meta.env.VITE_SITE_REPO ?? 'waku'
export const RELEASE_REPO = import.meta.env.VITE_RELEASE_REPO ?? REPO

export const SITE_URL = `https://${OWNER}.github.io/${REPO}`
export const GITHUB_URL = `https://github.com/${OWNER}/${RELEASE_REPO}`
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`

export interface LatestRelease {
  version: string
  /** Direct download URLs; null until the GitHub API answers. */
  assets: {
    x64: string
    arm64: string
    portableX64: string
    apk: string
  } | null
}

// ponytail: client-side GitHub API, no server fn — GH Pages serves static files only.
interface GhAsset {
  name: string
  browser_download_url: string
}

interface GhRelease {
  tag_name?: string
  assets?: GhAsset[]
}

async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${RELEASE_REPO}/releases/latest`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return null
    const json = (await res.json()) as GhRelease
    const version = (json.tag_name ?? '').replace(/^v/, '')
    if (!version) return null
    const byName = new Map(
      (json.assets ?? []).map((a) => [a.name, a.browser_download_url] as const),
    )
    const pick = (...names: string[]): string =>
      names.map((n) => byName.get(n)).find((u): u is string => !!u) ??
      RELEASES_URL
    return {
      version,
      // Filenames come from the Cargo package name, which is still `waku`
      // until the desktop app is renamed too. Keep these in sync with the
      // artifact paths in .github/workflows/release.yml.
      assets: {
        x64: pick(`Waku-${version}-x86_64-Setup.exe`),
        arm64: pick(`Waku-${version}-aarch64-Setup.exe`),
        portableX64: pick(`waku-${version}-x86_64-pc-windows-msvc.zip`),
        apk: pick(`Waku-${version}-universal.apk`),
      },
    }
  } catch {
    return null
  }
}

export const releaseQuery = queryOptions({
  queryKey: ['latest-release'],
  queryFn: fetchLatestRelease,
  staleTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
})
