export interface DaemonProfile {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt: number | null;
}

export interface DaemonProfileInput {
  name: string;
  address: string;
  token?: string;
}

export function normalizeDaemonAddress(value: string): string {
  let address = value.trim();
  if (!address) throw new Error('Enter the daemon address');

  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(address)) address = `ws://${address}`;
  if (/^http:\/\//i.test(address)) address = `ws://${address.slice(7)}`;
  if (/^https:\/\//i.test(address)) address = `wss://${address.slice(8)}`;

  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error('Enter a valid ws:// or wss:// daemon address');
  }
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('The daemon address must use ws:// or wss://');
  }
  if (!url.hostname || url.username || url.password) {
    throw new Error('The daemon address must contain a host and no credentials');
  }

  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function normalizeDaemonProfile(
  input: DaemonProfileInput,
  existing: DaemonProfile | undefined,
  id: string,
  now = Date.now(),
): DaemonProfile {
  const address = normalizeDaemonAddress(input.address);
  const name = input.name.trim() || displayHost(address);
  return {
    id,
    name,
    address,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastConnectedAt: existing?.lastConnectedAt ?? null,
  };
}

export function displayHost(address: string): string {
  try {
    const url = new URL(normalizeDaemonAddress(address));
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return address;
  }
}

export function profileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'W';
  if (words.length === 1) return [...words[0]!].slice(0, 2).join('').toUpperCase();
  return `${[...words[0]!][0] ?? ''}${[...words.at(-1)!][0] ?? ''}`.toUpperCase();
}

export function isPrivateDaemonAddress(address: string): boolean {
  try {
    const hostname = new URL(normalizeDaemonAddress(address)).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '');
    if (hostname.includes(':')) {
      return hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') ||
        hostname.startsWith('fe80:');
    }
    if (!hostname.includes('.')) return true;
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return true;
    }
    if (
      /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname)
    ) {
      return true;
    }
    const match = hostname.match(/^172\.(\d{1,3})\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
    if (isTailscaleAddress(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Whether a host is in Tailscale's CGNAT block (`100.64.0.0/10`). Tailscale
 * assigns every device an address there, so this is how the editor recognises
 * a tailnet address and can tell the user it will work from any network. */
export function isTailscaleAddress(hostname: string): boolean {
  return /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname);
}

/** Whether a daemon address points at a Tailscale-assigned host. Returns false
 * for anything unparseable rather than throwing, since it runs on keystrokes. */
export function isTailscaleDaemonAddress(address: string): boolean {
  try {
    const hostname = new URL(normalizeDaemonAddress(address)).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '');
    return isTailscaleAddress(hostname);
  } catch {
    return false;
  }
}

/**
 * A parsed pairing link: the daemon address and the token it carries.
 *
 * The desktop copies a single `waku://<token>@<host>/pair?transport=wss` link
 * so a phone can onboard from one paste instead of matching an address and a
 * token by hand — the two-field version is where people paste the wrong one
 * into the wrong box.
 */
export interface DaemonPairing {
  address: string;
  token: string;
}

/** Whether the value looks like a pairing link rather than a bare address. */
export function isDaemonPairingLink(value: string): boolean {
  return /^waku:\/\//i.test(value.trim());
}

/**
 * Parses a pairing link into an address and token.
 *
 * Throws with a user-facing message when the link is malformed, so the caller
 * can surface the reason instead of silently clearing the form.
 */
export function parseDaemonPairingLink(value: string): DaemonPairing {
  const link = value.trim();
  if (!isDaemonPairingLink(link)) {
    throw new Error('A pairing link starts with waku://');
  }
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new Error('This pairing link is not a valid URL');
  }
  const token = decodeURIComponent(url.username);
  if (!token || !url.hostname) {
    throw new Error('This pairing link is missing its address or token');
  }
  // The transport travels explicitly because a LAN daemon and a tunneled one
  // differ only in scheme, and the host gives no reliable clue which it is.
  const secure = url.searchParams.get('transport') === 'wss';
  const scheme = secure ? 'wss' : 'ws';
  const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return {
    address: normalizeDaemonAddress(`${scheme}://${authority}`),
    token,
  };
}

export function parseDaemonProfiles(value: unknown): DaemonProfile[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const profiles: DaemonProfile[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== 'string' || !record.id || seen.has(record.id) ||
      typeof record.name !== 'string' || typeof record.address !== 'string' ||
      typeof record.createdAt !== 'number' || !Number.isFinite(record.createdAt) ||
      typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt) ||
      (record.lastConnectedAt !== null && (
        typeof record.lastConnectedAt !== 'number' || !Number.isFinite(record.lastConnectedAt)
      ))
    ) {
      continue;
    }
    try {
      profiles.push({
        id: record.id,
        name: record.name.trim() || displayHost(record.address),
        address: normalizeDaemonAddress(record.address),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        lastConnectedAt: record.lastConnectedAt as number | null,
      });
      seen.add(record.id);
    } catch {
      // A malformed profile must not prevent other saved daemons from loading.
    }
  }
  return profiles;
}
