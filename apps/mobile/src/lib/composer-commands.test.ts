import { describe, expect, test } from 'bun:test';
import type { FileEntry, ReportedCommand, SlashCommand } from '@waku/client';

import {
  detectComposerTrigger,
  expandCommandTemplate,
  filterComposerCommands,
  filterComposerFiles,
  mentionSegments,
  mergeComposerCommands,
  replaceComposerFileTrigger,
  replaceComposerTrigger,
  resolvedComposerSubmission,
} from './composer-commands';

function command(
  name: string,
  scope: SlashCommand['scope'] = 'Builtin',
  template: string | null = null,
): SlashCommand {
  return { name, description: '', scope, argument_hint: null, template };
}

function reported(name: string, description = ''): ReportedCommand {
  return { name, description };
}

describe('composer command triggers', () => {
  test('triggers on a slash at the start of the caret line', () => {
    expect(detectComposerTrigger('/rev', 4))
      .toEqual({ kind: 'command', query: 'rev', start: 0, end: 4 });
    expect(detectComposerTrigger('intro\n/rev', 10))
      .toEqual({ kind: 'command', query: 'rev', start: 6, end: 10 });
  });

  test('stops once an argument is typed', () => {
    expect(detectComposerTrigger('/review this', 12)).toBeNull();
  });

  test('ignores a slash that is not at the line start', () => {
    expect(detectComposerTrigger('look at a/b', 11)).toBeNull();
    expect(detectComposerTrigger('', 0)).toBeNull();
  });

  test('clamps a caret past the end of the text', () => {
    expect(detectComposerTrigger('/rev', 99))
      .toEqual({ kind: 'command', query: 'rev', start: 0, end: 4 });
  });
});

describe('composer file triggers', () => {
  test('triggers on an @ at a whitespace boundary', () => {
    expect(detectComposerTrigger('@src', 4))
      .toEqual({ kind: 'file', query: 'src', start: 0, end: 4 });
    expect(detectComposerTrigger('see @src/ap', 11))
      .toEqual({ kind: 'file', query: 'src/ap', start: 4, end: 11 });
  });

  test('ignores an @ inside a token', () => {
    expect(detectComposerTrigger('mail user@host', 14)).toBeNull();
  });

  test('stops at the first whitespace after the mention', () => {
    expect(detectComposerTrigger('see @src done', 13)).toBeNull();
  });

  test('a bare @ opens the picker on the whole tree', () => {
    expect(detectComposerTrigger('see @', 5))
      .toEqual({ kind: 'file', query: '', start: 4, end: 5 });
  });
});

describe('command filtering', () => {
  const commands = [
    command('review', 'Project'),
    command('release', 'User'),
    command('compact', 'Builtin'),
    command('deploy', 'Skill'),
  ];

  test('ranks prefix hits above interior ones', () => {
    // Both start with "re", so picker order (Project before User) decides.
    expect(filterComposerCommands(commands, 're').map((item) => item.name)).toEqual([
      'review',
      'release',
    ]);
  });

  test('ranks a prefix hit above an interior one', () => {
    const mixed = [command('release', 'User'), command('review', 'Project')];
    expect(filterComposerCommands(mixed, 'rev').map((item) => item.name)).toEqual(['review']);
  });

  test('falls back to interior matches everywhere in the name', () => {
    expect(filterComposerCommands(commands, 'ploy').map((item) => item.name)).toEqual(['deploy']);
  });

  test('offers everything, in picker order, before any query', () => {
    const merged = mergeComposerCommands(commands, []);
    expect(filterComposerCommands(merged, '').map((item) => item.name)).toEqual([
      'compact',
      'review',
      'release',
      'deploy',
    ]);
  });

  test('caps a typed query but not the browse view', () => {
    expect(filterComposerCommands(commands, 'e', 2)).toHaveLength(2);
    expect(filterComposerCommands(commands, '')).toHaveLength(commands.length);
  });
});

describe('merging reported commands', () => {
  test('orders by scope then name', () => {
    const merged = mergeComposerCommands(
      [command('deploy', 'Skill'), command('lint', 'Project'), command('review', 'Builtin')],
      [reported('compact')],
    );
    expect(merged.map((item) => [item.scope, item.name])).toEqual([
      ['Builtin', 'compact'],
      ['Builtin', 'review'],
      ['Project', 'lint'],
      ['Skill', 'deploy'],
    ]);
  });

  test('fills a blank description but never redefines the command', () => {
    const [known] = mergeComposerCommands(
      [{ ...command('compact'), description: '' }],
      [reported('compact', 'Free up context')],
    );
    expect(known?.description).toBe('Free up context');

    // The project owns /deploy, so the report only labels it.
    const project = command('deploy', 'Project', 'ship it');
    const [kept] = mergeComposerCommands([project], [reported('deploy', 'CLI deploy')]);
    expect(kept?.template).toBe('ship it');
    expect(kept?.scope).toBe('Project');
    expect(kept?.description).toBe('CLI deploy');
  });
});

describe('inserting a command', () => {
  test('replaces the trigger and leaves the caret after it', () => {
    const trigger = detectComposerTrigger('/rev', 4)!;
    expect(replaceComposerTrigger('/rev', trigger, command('review'))).toEqual({
      text: '/review ',
      cursor: 8,
    });
    expect(replaceComposerTrigger(
      'look /rev',
      { kind: 'command', query: 'rev', start: 5, end: 9 },
      command('review'),
    )).toEqual({ text: 'look /review ', cursor: 13 });
  });
});

describe('filtering project files', () => {
  const files: FileEntry[] = [
    { path: 'src/', is_dir: true },
    { path: 'src/app.ts', is_dir: false },
    { path: 'src/api/routes.ts', is_dir: false },
    { path: 'README.md', is_dir: false },
  ];

  test('ranks prefix hits above interior ones', () => {
    expect(filterComposerFiles(files, 'src').map((file) => file.path)).toEqual([
      'src/',
      'src/app.ts',
      'src/api/routes.ts',
    ]);
  });

  test('matches a directory fragment anywhere in the path', () => {
    expect(filterComposerFiles(files, 'api').map((file) => file.path))
      .toEqual(['src/api/routes.ts']);
  });

  test('a bare query offers the shallow entries the daemon returned first', () => {
    expect(filterComposerFiles(files, '').map((file) => file.path))
      .toEqual(['src/', 'src/app.ts', 'src/api/routes.ts', 'README.md']);
  });
});

describe('inserting a file mention', () => {
  test('replaces the @ trigger and keeps a directory slash', () => {
    const trigger = detectComposerTrigger('see @src', 8)!;
    expect(replaceComposerFileTrigger('see @src', trigger, { path: 'src', is_dir: true }))
      .toEqual({ text: 'see @src/ ', cursor: 10 });
    expect(replaceComposerFileTrigger('see @src', trigger, { path: 'src/app.ts', is_dir: false }))
      .toEqual({ text: 'see @src/app.ts ', cursor: 16 });
  });
});

describe('segmenting sent mentions', () => {
  test('marks @path tokens and leaves prose alone', () => {
    expect(mentionSegments('look at @src/app.ts and @README.md')).toEqual([
      { kind: 'text', value: 'look at ' },
      { kind: 'mention', value: '@src/app.ts' },
      { kind: 'text', value: ' and ' },
      { kind: 'mention', value: '@README.md' },
    ]);
  });

  test('an @ inside a token is prose, not a mention', () => {
    expect(mentionSegments('mail user@host')).toEqual([
      { kind: 'text', value: 'mail user@host' },
    ]);
  });

  test('a leading mention still counts', () => {
    expect(mentionSegments('@src/app.ts fix this')).toEqual([
      { kind: 'mention', value: '@src/app.ts' },
      { kind: 'text', value: ' fix this' },
    ]);
  });
});

describe('template expansion', () => {
  test('substitutes ARGUMENTS and positional placeholders', () => {
    expect(expandCommandTemplate('Review $ARGUMENTS now', 'src/api')).toBe('Review src/api now');
    expect(expandCommandTemplate('Compare $1 and $2', 'a b')).toBe('Compare a and b');
    expect(expandCommandTemplate('Fix $@', 'login bug')).toBe('Fix login bug');
  });

  test('appends unconsumed arguments', () => {
    expect(expandCommandTemplate('Review this', 'extra detail')).toBe('Review this\n\nextra detail');
  });

  test('leaves a dollar sign that is not a placeholder alone', () => {
    expect(expandCommandTemplate('Costs $x', '')).toBe('Costs $x');
  });

  test('drops a positional placeholder with no matching argument', () => {
    expect(expandCommandTemplate('Compare $1', '')).toBe('Compare ');
  });
});

describe('resolving a submission', () => {
  test('passes built-in commands through untouched', () => {
    expect(resolvedComposerSubmission('claude', '/compact', [command('compact')])).toBeNull();
  });

  test('expands a template command to its body', () => {
    const commands = [command('review', 'Project', 'Review $ARGUMENTS carefully')];
    expect(resolvedComposerSubmission('claude', '/review src/api', commands))
      .toBe('Review src/api carefully');
  });

  test('turns a skill into the provider native invocation', () => {
    const commands = [command('to-spec', 'Skill')];
    expect(resolvedComposerSubmission('codex', '/to-spec now', commands)).toBe('$to-spec now');
    expect(resolvedComposerSubmission('fx', '/to-spec now', commands)).toBe('$to-spec now');
    expect(resolvedComposerSubmission('pi', '/to-spec now', commands)).toBe('/skill:to-spec now');
    // Claude has no native skill syntax, so the text goes through as typed.
    expect(resolvedComposerSubmission('claude', '/to-spec now', commands)).toBeNull();
  });

  test('ignores text that is not a command', () => {
    expect(resolvedComposerSubmission('codex', 'plain prompt', [])).toBeNull();
    expect(resolvedComposerSubmission('codex', '/unknown', [command('known')])).toBeNull();
  });
});
