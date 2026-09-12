import { queryOptions } from '@tanstack/react-query'

export interface LatestRelease {
  version: string
  /** Direct download URLs; null until the GitHub API answers. */
  assets: {
    x64: string
    arm64: string
    portableX64: string
  } | null
}

const OWNER = 'yaffalhakim1'
const REPO = 'waku'

export const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`

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
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
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
      assets: {
        x64: pick(`Waku-${version}-x86_64-Setup.exe`),
        arm64: pick(`Waku-${version}-aarch64-Setup.exe`),
        portableX64: pick(`waku-${version}-x86_64-pc-windows-msvc.zip`),
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
