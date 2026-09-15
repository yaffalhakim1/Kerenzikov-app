/** Where the release manifest and the APK land. The same R2 bucket the
 *  desktop builds publish into, so there is one origin to trust and one place
 *  to look when a release goes missing. */
export const UPDATE_MANIFEST_URL =
  'https://pub-a8392f3fe55a424497fe5174b0179915.r2.dev/mobile-latest.json';

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
  if (typeof url !== 'string' || url.length === 0) return null;
  return {
    versionCode,
    versionName: typeof versionName === 'string' ? versionName : String(versionCode),
    url,
    ...(typeof notes === 'string' ? { notes } : {}),
  };
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
