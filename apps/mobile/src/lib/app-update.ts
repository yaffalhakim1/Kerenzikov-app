/**
 * Where the release manifest lives.
 *
 * Served from `raw.githubusercontent.com` rather than the R2 bucket the
 * desktop feed uses: `*.r2.dev` resolves to the Indonesian Internet Positif
 * block page on this project's home network, for every resolver including
 * Cloudflare's own, so an app checking it there can only ever see a failure.
 * GitHub is reachable and is where the APK already lives.
 *
 * The manifest is read from the default branch, which means the checked-in
 * copy is the live one: publishing a release means committing the new
 * manifest, not uploading to a bucket.
 */
export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/yaffalhakim1/Kerenzikov-app/main/apps/mobile/mobile-latest.json';

export interface UpdateManifest {
  /** Monotonic build number, mirroring `versionCode` in build.gradle. */
  versionCode: number;
  /** Human-facing version, mirroring `versionName`. */
  versionName: string;
  /** Direct APK URL, or the release page when the APK is not public. */
  url: string;
  notes?: string;
}

export interface AvailableUpdate {
  current: number;
  latest: number;
  versionName: string;
  url: string;
  notes?: string;
}

/** The installed build's `versionCode`, read from the native bundle by the
 *  caller (Expo surfaces it, and importing it here would drag React Native
 *  into this pure module). A missing value reads 0, which offers any manifest. */
export function currentVersionCode(expoConfig?: {
  android?: { versionCode?: number | null } | null;
} | null): number {
  return expoConfig?.android?.versionCode ?? 0;
}

export function parseManifest(value: unknown): UpdateManifest | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const { versionCode, versionName, url, notes } = record;
  if (typeof versionCode !== 'number' || !Number.isFinite(versionCode)) return null;
  if (typeof url !== 'string' || !isDownloadUrl(url)) return null;
  return {
    versionCode,
    versionName: typeof versionName === 'string' ? versionName : String(versionCode),
    url,
    ...(typeof notes === 'string' ? { notes } : {}),
  };
}

/**
 * Whether a manifest's URL is one the app should send a user to.
 *
 * Only `https:` is accepted: a download the OS will offer to install must not
 * travel in clear, and `http://` would let a downgrade through unnoticed.
 *
 * The check exists because a manifest is authored by a build script, and the
 * failure it catches is real: release assets are versioned by tag, so a URL
 * assembled without the version segment is well-formed, plausible, and 404s
 * only once a user taps install. Rejecting it here turns that into "no update
 * offered" instead of a broken install.
 */
export function isDownloadUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** A manifest entry is only an update when its build number is strictly
 *  greater. A same-or-lower value would make Android reject the install, so it
 *  is not offered at all. */
export function availableUpdate(
  manifest: UpdateManifest | null,
  current: number,
): AvailableUpdate | null {
  if (!manifest || manifest.versionCode <= current) return null;
  return {
    current,
    latest: manifest.versionCode,
    versionName: manifest.versionName,
    url: manifest.url,
    ...(manifest.notes ? { notes: manifest.notes } : {}),
  };
}

/** Fetch and compare in one call. Returns `null` when already current, and
 *  throws on a transport or shape failure so the caller can distinguish
 *  "up to date" from "could not check". */
export async function checkForUpdate(
  fetchFn: typeof fetch = fetch,
  current: number = currentVersionCode(),
): Promise<AvailableUpdate | null> {  const response = await fetchFn(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Update check failed (${response.status})`);
  }
  return availableUpdate(parseManifest(await response.json()), current);
}
