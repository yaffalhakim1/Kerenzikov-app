import type { Directory, File as ExpoFile } from 'expo-file-system';

/** The two members this module needs from `expo-file-system`, named so the lazy
 *  `require` below has a readable contract rather than a structural cast. */
interface FileSystemModule {
  File: new (parent: Directory, name: string) => ExpoFile;
  Paths: { document: Directory };
}

/**
 * A crash and error log that survives the crash it records.
 *
 * A release build has no dev overlay and no console, so a screen that throws
 * simply disappears and takes its own evidence with it. This keeps that
 * evidence: every error is written to a file on disk the moment it happens, so
 * the app can be killed, relaunched, or reinstalled-over and the log is still
 * there to be read and sent.
 *
 * ## Why a file rather than state
 *
 * The failure this exists for is a render error in a screen that unmounts when
 * it throws. Anything held in React state dies with it, and anything held in a
 * module-level array dies when the process is killed — which is what a crash
 * does. Only a write to the filesystem outlives the thing that failed.
 *
 * ## The buffer
 *
 * Writes are synchronous and unbatched, because the process may be gone before
 * a queued write lands. To keep that from being one filesystem call per frame
 * on a noisy error, entries are held briefly in memory and flushed on a short
 * timer — with a synchronous flush on the way out for anything that looks
 * fatal. Both paths are cheap: an error is not a hot path, and the log is
 * capped, so the file cannot grow without bound.
 */

/** Where the log lives. `document` rather than `cache`, so a low-storage
 *  reclaim cannot delete the evidence before it is read. */
export const LOG_FILE_NAME = 'waku-errors.log';

/** Past this the log is trimmed from the front, so the newest entries — the
 *  ones that explain a crash — always survive. */
const MAX_BYTES = 256 * 1024;

/** Entries older than this are dropped on read, so a log from a month ago does
 *  not bury the crash that just happened. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** How long an entry waits in memory before it reaches the disk. */
const FLUSH_DELAY_MS = 400;

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  at: number;
  level: LogLevel;
  /** Short origin, e.g. `ErrorBoundary` or `global`. */
  scope: string;
  message: string;
  /** The JS stack, when the error carried one. */
  stack?: string;
  /** The React component stack, when the boundary could read it. */
  componentStack?: string;
  /** Anything else worth keeping — route, session id, a count. */
  extra?: Record<string, unknown>;
}

let pending: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let file: ExpoFile | null = null;
let ready = false;

/**
 * Loaded lazily so importing this module never costs a native call, and so a
 * failure to reach the filesystem cannot itself crash the app at startup — the
 * whole point is to record failures, not to cause them.
 */
function logFile(): ExpoFile | null {
  if (ready) return file;
  ready = true;
  try {
    // Required lazily: the module touches native storage on construction.
    const { File, Paths } = require('expo-file-system') as FileSystemModule;
    file = new File(Paths.document, LOG_FILE_NAME);
    if (!file.exists) {
      file.create({ intermediates: true, overwrite: true });
    }
  } catch {
    // No filesystem: the log degrades to nothing rather than throwing from
    // inside an error handler, which would replace one crash with another.
    file = null;
  }
  return file;
}

function serialize(entry: LogEntry): string {
  const stamp = new Date(entry.at).toISOString();
  const head = `[${stamp}] ${entry.level.toUpperCase()} ${entry.scope}: ${entry.message}`;
  const lines = [head];
  if (entry.extra && Object.keys(entry.extra).length > 0) {
    lines.push(`  context: ${safeJson(entry.extra)}`);
  }
  if (entry.componentStack) lines.push(indent(entry.componentStack));
  if (entry.stack) lines.push(indent(entry.stack));
  return `${lines.join('\n')}\n\n`;
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Trim from the front so the newest entries always survive a cap. */
function trimToCap(text: string): string {
  if (text.length <= MAX_BYTES) return text;
  const cut = text.slice(text.length - MAX_BYTES);
  // Land on an entry boundary rather than mid-stack, so the head of the file
  // is a readable line instead of the tail of a frame.
  const boundary = cut.indexOf('\n[');
  return boundary === -1 ? cut : cut.slice(boundary + 1);
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending.length === 0) return;
  const target = logFile();
  if (!target) {
    pending = [];
    return;
  }
  const batch = pending;
  pending = [];
  try {
    const existing = target.exists ? target.textSync() : '';
    target.write(trimToCap(existing + batch.map(serialize).join('')));
  } catch {
    // A log write must never be the reason something breaks.
  }
}

/** Queued, then flushed shortly after — see the note on the buffer above. */
function queue(entry: LogEntry): void {
  pending.push(entry);
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

export interface RecordOptions {
  scope: string;
  level?: LogLevel;
  stack?: string;
  componentStack?: string;
  extra?: Record<string, unknown>;
}

/**
 * Record one error. Never throws: it is called from error handlers, and a
 * logger that can fail is worse than no logger.
 */
export function recordError(cause: unknown, options: RecordOptions): void {
  try {
    const error = cause instanceof Error ? cause : undefined;
    const message = error
      ? `${error.name}: ${error.message}`
      : typeof cause === 'string'
        ? cause
        : safeJson(cause);
    queue({
      at: Date.now(),
      level: options.level ?? 'error',
      scope: options.scope,
      message,
      stack: options.stack ?? error?.stack,
      componentStack: options.componentStack,
      extra: options.extra,
    });
  } catch {
    // Nothing useful to do; swallowing keeps the caller alive.
  }
}

/**
 * Write everything buffered, now and synchronously.
 *
 * Called on the way out of a fatal error, where the timer would not survive.
 */
export function flushNow(): void {
  try {
    flush();
  } catch {
    // See above.
  }
}

/**
 * Leave a trail of what the app was doing, so a death with no error still says
 * something.
 *
 * The failure this exists for is a screen that closes with no error and no
 * crash report. That is not a throw — a throw is caught and logged — so the
 * evidence has to come from the steps *before* it. Breadcrumbs are written on
 * the transitions that matter (a turn starting, a turn finishing, the app
 * going to the background, a route change), and the last one before the log
 * stops is the answer.
 *
 * Kept to `info` level and flushed with everything else, so a report shows them
 * interleaved with any real errors in the order they happened.
 */
export function recordBreadcrumb(scope: string, message: string, extra?: Record<string, unknown>): void {
  try {
    queue({
      at: Date.now(),
      level: 'info',
      scope,
      message,
      extra,
    });
  } catch {
    // A breadcrumb must never be the reason something breaks.
  }
}

/** The whole log, oldest first. Empty when nothing has been recorded. */
export function readLog(): string {
  flush();
  const target = logFile();
  if (!target || !target.exists) return '';
  try {
    return target.textSync();
  } catch {
    return '';
  }
}

/** Drop the log. Used by the settings row that sends it. */
export function clearLog(): void {
  pending = [];
  const target = logFile();
  if (!target) return;
  try {
    if (target.exists) target.delete();
  } catch {
    // Nothing to do; a stale file is harmless.
  }
}

/** The file, for sharing. `null` when it does not exist yet. */
export function logFileUri(): string | null {
  flushNow();
  const target = logFile();
  if (!target || !target.exists) return null;
  return target.uri;
}

/** Entries still recent enough to be worth reading, newest last. */
export function recentLines(text: string, now = Date.now()): string {
  const blocks = text.split('\n\n');
  const kept = blocks.filter((block) => {
    const match = block.match(/^\[([^\]]+)\]/);
    if (!match) return false;
    const at = Date.parse(match[1]!);
    return Number.isNaN(at) || now - at <= MAX_AGE_MS;
  });
  return kept.join('\n\n');
}
