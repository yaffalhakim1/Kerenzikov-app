import type {
  FileEntry,
  ProviderKind,
  ReportedCommand,
  SlashCommand,
} from '@waku/client';

export type ComposerTrigger =
  | { kind: 'command'; query: string; start: number; end: number }
  | { kind: 'file'; query: string; start: number; end: number };

/**
 * The trigger at the caret: a slash command at the start of the caret's line,
 * or an `@` file mention at any whitespace boundary. A slash command stops at
 * the first whitespace, the same rule the desktop picker uses, so typing an
 * argument dismisses the list. An `@` inside a token (`user@host`) is prose,
 * not a mention, which is why the sigil must follow whitespace.
 */
export function detectComposerTrigger(text: string, cursor: number): ComposerTrigger | null {
  const end = Math.max(0, Math.min(cursor, text.length));
  const lineStart = text.lastIndexOf('\n', end - 1) + 1;
  const linePrefix = text.slice(lineStart, end);
  if (linePrefix.startsWith('/')) {
    const query = linePrefix.slice(1);
    if (/\s/u.test(query)) return null;
    return { kind: 'command', query, start: lineStart, end };
  }
  const mention = /(?:^|\s)@([^\s@]*)$/u.exec(text.slice(0, end));
  if (!mention) return null;
  const query = mention[1];
  return { kind: 'file', query, start: end - query.length - 1, end };
}

export const COMPOSER_COMMAND_CAP = 8;
export const COMPOSER_FILE_CAP = 20;

/** Commands matching the query, in picker order. Prefix hits rank above
 * interior ones; the merged order (scope, then name) decides the rest. */
export function filterComposerCommands(
  commands: SlashCommand[],
  query: string,
  cap = COMPOSER_COMMAND_CAP,
): SlashCommand[] {
  const normalized = query.trim().toLocaleLowerCase();
  // Browsing (no query) shows every command; the picker scrolls. Capping here
  // would hide skills once the list passed COMPOSER_COMMAND_CAP.
  if (!normalized) return commands;
  return commands
    .map((command, index) => ({
      command,
      rank: command.name.toLocaleLowerCase().startsWith(normalized) ? 0 : 1,
      matches: command.name.toLocaleLowerCase().includes(normalized),
      index,
    }))
    .filter((candidate) => candidate.matches)
    // Stable sort: equal ranks keep the merged order rather than re-sorting
    // by name and losing scope precedence.
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, cap)
    .map((candidate) => candidate.command);
}

/** Provider-reported commands (what the CLI says it understands) folded into
 * discovered ones (what the project, user, and skills define). A report only
 * fills in a missing description — it never overrides a real definition,
 * because a project command may deliberately own the same name. */
export function mergeComposerCommands(
  discovered: SlashCommand[],
  reported: ReportedCommand[],
): SlashCommand[] {
  const merged = discovered.map((command) => ({ ...command }));
  for (const report of reported) {
    const known = merged.find((command) => command.name === report.name);
    if (known) {
      if (!known.description) known.description = report.description ?? '';
      continue;
    }
    merged.push({
      name: report.name,
      description: report.description ?? '',
      scope: 'Builtin',
      argument_hint: null,
      template: null,
    });
  }
  return merged.sort((left, right) => (
    commandScopeRank(left.scope) - commandScopeRank(right.scope)
    || left.name.localeCompare(right.name)
  ));
}

/** Replace the trigger with the chosen command, leaving the caret after the
 * trailing space so arguments can be typed straight away. */
export function replaceComposerTrigger(
  text: string,
  trigger: ComposerTrigger,
  command: SlashCommand,
): { text: string; cursor: number } {
  const insert = `/${command.name} `;
  return {
    text: `${text.slice(0, trigger.start)}${insert}${text.slice(trigger.end)}`,
    cursor: trigger.start + insert.length,
  };
}

/** Replace the `@` trigger with the chosen file path, leaving the caret after
 * a trailing space so the mention is complete. A directory keeps its trailing
 * slash, matching how the desktop inserts one. */
export function replaceComposerFileTrigger(
  text: string,
  trigger: ComposerTrigger,
  file: FileEntry,
): { text: string; cursor: number } {
  const path = file.is_dir && !file.path.endsWith('/') ? `${file.path}/` : file.path;
  const insert = `@${path} `;
  return {
    text: `${text.slice(0, trigger.start)}${insert}${text.slice(trigger.end)}`,
    cursor: trigger.start + insert.length,
  };
}

/** Project files matching an `@` query, ranked the way the desktop's picker
 * ranks them: prefix hits first, then substring hits, each keeping the index
 * order the daemon returned (shallow entries first).
 *
 * This runs on every keystroke over a list that can reach tens of thousands of
 * entries, so it allocates nothing per entry and stops as soon as the prefix
 * bucket is full — prefix hits always outrank interior ones, so a full prefix
 * bucket is already the answer. */
export function filterComposerFiles(
  files: FileEntry[],
  query: string,
  cap = COMPOSER_FILE_CAP,
): FileEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return files.slice(0, cap);
  const prefix: FileEntry[] = [];
  const interior: FileEntry[] = [];
  for (const file of files) {
    const path = file.path.toLowerCase();
    if (path.startsWith(normalized)) {
      prefix.push(file);
      if (prefix.length >= cap) break;
    } else if (interior.length < cap && path.includes(normalized)) {
      interior.push(file);
    }
  }
  return prefix.concat(interior).slice(0, cap);
}

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; value: string };

/**
 * Split a sent prompt into text and `@` mention runs so the transcript can
 * style the mentions. A mention is an `@` at a whitespace boundary followed by
 * a path with no whitespace — the same rule the picker triggers on, so a
 * `user@host` in prose stays plain text.
 */
export function mentionSegments(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  const pattern = /(^|\s)(@[^\s@]+)/gu;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index + match[1].length;
    if (start > cursor) segments.push({ kind: 'text', value: text.slice(cursor, start) });
    segments.push({ kind: 'mention', value: match[2] });
    cursor = start + match[2].length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) });
  return segments;
}

export function expandCommandTemplate(template: string, args: string): string {
  const positional = args.split(/\s+/u).filter(Boolean);
  let expanded = '';
  let consumedArgs = false;
  let rest = template;
  for (;;) {
    const index = rest.indexOf('$');
    if (index < 0) break;
    expanded += rest.slice(0, index);
    const after = rest.slice(index + 1);
    if (after.startsWith('ARGUMENTS')) {
      expanded += args;
      consumedArgs = true;
      rest = after.slice('ARGUMENTS'.length);
    } else if (after.startsWith('@')) {
      expanded += args;
      consumedArgs = true;
      rest = after.slice(1);
    } else if (/^[1-9]/u.test(after)) {
      expanded += positional[Number(after[0]) - 1] ?? '';
      consumedArgs = true;
      rest = after.slice(1);
    } else {
      expanded += '$';
      rest = after;
    }
  }
  expanded += rest;
  return !consumedArgs && args ? `${expanded}\n\n${args}` : expanded;
}

/**
 * The prompt to hand the provider, or null when the text is not a command
 * Waku has to translate. Built-in commands are passed through — the provider
 * understands its own — but template commands expand to their body and
 * skills become the provider's native invocation, since neither survives the
 * trip as a slash command.
 */
export function resolvedComposerSubmission(
  provider: ProviderKind,
  prompt: string,
  commands: SlashCommand[],
): string | null {
  if (!prompt.startsWith('/')) return null;
  const invocation = prompt.slice(1);
  const whitespace = invocation.search(/\s/u);
  const name = whitespace < 0 ? invocation : invocation.slice(0, whitespace);
  const args = whitespace < 0 ? '' : invocation.slice(whitespace).trim();
  const skill = commands.find((command) => command.name === name && command.scope === 'Skill');
  if (skill) {
    if (provider === 'codex' || provider === 'fx') return `$${invocation}`;
    if (provider === 'pi' || provider === 'ohMyPi') return `/skill:${invocation}`;
  }
  const command = commands.find((item) => item.name === name && item.template !== null);
  if (!command?.template) return null;
  return expandCommandTemplate(command.template, args);
}

function commandScopeRank(scope: SlashCommand['scope']): number {
  switch (scope) {
    case 'Builtin':
    case 'Waku':
      return 0;
    case 'Project':
      return 1;
    case 'User':
      return 2;
    case 'Skill':
      return 3;
  }
}
