# Changelog

All notable changes to Kerenzikov. The release workflow extracts the section
whose heading matches the version being released and uses it as the body of the
draft GitHub release, so write these for the people downloading a build.

Format follows [Keep a Changelog](https://keepachangelog.com). Add a new
`## [<version>]` section at the top for each release, matching the `version` in
`Cargo.toml`.

Write release notes for the final product users receive, not the development
history. When a feature is still unreleased, fold its fixes and refinements into
the original feature bullet instead of adding separate entries for them.

## [0.1.32]

- Jcode is a supported agent. It speaks the same protocol Waku already uses for
  Copilot, Cursor, Fx, Grok, and Kimi, so a session, its model picker, its
  approvals, and resuming all work the way they do for the others.
- Codex tasks can choose a role for the session. Waku lists the roles in your
  own `~/.codex/agents` directory alongside Codex's built-ins, and a role you
  wrote yourself takes precedence over the built-in of the same name.
- Model names read as names. Versions render as versions, so `deepseek-v4-1` is
  "DeepSeek V4.1" rather than "V4 1", and a `:free` model is labelled
  "(Free)" instead of having it glued onto the end of its name.
- The model picker says which gateway a model spends against. A model offered
  by a bring-your-own-key provider now shows that provider beside the CLI name,
  so two providers listing the same model are no longer indistinguishable.
- Jcode's model list is scoped to the provider the session actually routes to,
  and to models that are currently usable. The previous list was a union across
  every configured provider, which offered models the session could not use;
  picking one failed with a provider error rather than a clear one.

## [0.1.31]

- Tasks read as their title in the sidebar list. The project name and agent
  logo that sat under every row are gone, so a long task list scans as rows
  of titles instead of repeating the same project fifty times.
- Sidebar groups fold. Tap a group header to collapse it, and project groups
  show a folder instead of a chevron, matching the desktop.
- Tasks can be removed from the list. Long-press a task and choose "Remove
  from list": it disappears from this device only, and the task and its
  transcript stay on the daemon. The task list menu offers them back.
- Messages copy from where you are reading them. Every reply and every
  message you sent gets a copy button, and a fenced code block copies its
  own source from its header.
- Android updates itself. The app checks a published release manifest on
  launch and offers a newer build in Settings, which downloads the APK and
  hands it to Android's installer.
- Code renders in JetBrains Mono, the same face the desktop uses, instead of
  whichever monospace the device happened to ship.
- Fixed: project memory injected for the provider no longer appeared as part
  of your message in the transcript on other connected devices.
- Fixed: spacing on rounded buttons and list rows was silently dropped on
  Android, which ran options and rows together at their edges.
- Fixed: the composer showed a disabled send button beside stop while an
  agent was working. Stop owns the primary slot, and send returns once there
  is something to send.

## [0.1.30]

- Project memory is editable in Settings. The new Memory page lists the
  selected project's facts newest-first, with a field to remember new ones
  and per-fact delete, instead of only the `/remember` and `/forget`
  composer commands.
- Usage opens on token counts instead of cost, so activity on free and
  unpriced models reads correctly instead of flatlining at $0.

## [0.1.29]

- Windows updates itself. The app checks this fork's own update feed on
  launch and offers new versions in place, instead of asking you to download
  every release by hand. First install is still manual; everything after this
  version arrives automatically.

## [0.1.28]

- Sidebar task rows are one line instead of two. The git branch and time
  label that occupied a second line now share the row: the title, the status
  icon, and — once a task has settled — how long ago the agent last replied,
  where the spinner used to sit. More tasks fit on screen without scrolling.
- The agent's plan is visible while it works. When a provider publishes the
  task list it is following, an icon beside the context meter shows how many
  steps are done, and opening it lists them. Cancelled steps count toward the
  total but never toward the done count, so an abandoned plan does not read as
  finished. The icon appears only when a plan exists.

## [0.1.27]

- Provider failures now say what actually went wrong. When a task cannot
  start, the message carries the provider's own explanation — the HTTP status
  and error reference from its server, or the error its CLI printed — instead
  of only the outermost line. A broken OpenCode database that made every task
  fail with "could not open an OpenCode session" now names the missing database
  column.
- The model list warns you when it is stale. If a provider's catalog cannot be
  read, the provider row in Settings says so and shows the reason, rather than
  silently keeping the previous list — which made a newly added model look like
  it had never been configured.

## [0.1.26]

- The app is now called Kerenzikov: the window title, app menu, tray tooltip,
  settings, installers, and every translated string use the new name. Your
  tasks, transcripts, and settings are untouched — they live in the same
  directories as before.
- The accent color is the brand green instead of coral, in both light and dark
  themes, across the desktop, web, and mobile clients.
- Release downloads are named `Kerenzikov-*` (`Kerenzikov-<version>-x86_64-Setup.exe`,
  `Kerenzikov-<version>-universal.apk`, and so on).
- Updates are manual. The app no longer shows a "Check for Updates…" menu item
  or an "Automatic updates" setting, because this build ships no update feed.

## [0.1.19]

- Refresh a resumed session from its provider transcript: a session continued
  in the OpenCode CLI or in another client now shows those turns when it is
  resumed, instead of the stored snapshot
- Read OpenCode's session history from its own server instead of an ACP
  replay, which failed on real sessions

## [0.1.18]

- Fix Codex session forking
- Add OpenCode 2 support, add reasoning effort option for both OpenCode and OpenCode 2
- Fix memory usage for long-running sessions

## [0.1.17]

- Fix the OpenCode Resume list showing only sessions started outside a git checkout; it now lists sessions from every project
- Hold Claude's turn open while it waits on background work

## [0.1.16]

- Import and continue conversations started in agent CLIs with `/resume` or the command palette across every provider, in both Kerenzikov and Kerenzikov Web
- Linux: add signed in-app updates with clean relaunch and automatic rollback
- Copy Kerenzikov task IDs and agent CLI thread IDs from task info or the command palette
- Keep each response's actions and changed-file summary after its final tool activity
- Keep the selected task visible when navigating the sidebar
- Let nested transcript and command-output scrollers hand wheel gestures to the page only at their boundaries
- Keep multiline background-work titles on one line in summaries and panel headers

## [0.1.15]

- Codex thread goals: type /goal to set a persistent objective the task keeps pursuing — before or after the first message — with its autonomous pursuit streaming into the transcript, a status chip showing live budget or elapsed time, and a dialog to edit, pause, resume, or clear the goal (also in Kerenzikov Web)
- Discover provider-native slash commands and skills from installed agent CLIs, including multiline YAML descriptions
- Add reasoning effort selection for Grok
- Reconnect remote daemon sessions automatically after connection interruptions
- Fix Command/Ctrl+Enter steering after a provider response starts streaming
- Fix transcript file links on Windows
- Fix OpenCode dropping the first streamed event and hanging during cancellation on Windows

## [0.1.14]

- Group sidebar tasks by project or update date, order them newest or oldest first, and collapse sections
- Find in page: Search the full transcript by keywords using cmd-f or ctrl-f
- Switch between recent tasks with Ctrl+Tab and Ctrl+Shift+Tab
- Carry the current access mode into new tasks and remember it between launches
- Fix OpenCode access-mode permissions and restore pending permission prompts when resuming sessions
- Show Codex file reads, listings, and searches as file activity instead of raw commands
- Keep long panel and background-work titles on one truncated line
- Increase the minimum UI text size for better legibility

## [0.1.13]

- Add Vercel Fx support
- Support DeepSeek Harness 0.1.1 without opening its web UI
- Collapse earlier activity groups when a running turn moves on to newer transcript output

## [0.1.12]

- Invoke Codex, Pi, and Oh My Pi skills with their native syntax
- Stream live output from Claude background tasks
- Steer the oldest queued follow-up with Command/Ctrl+Enter in an empty composer
- Fix model and reasoning option selection for Cursor
- Fix npm-installed provider detection on Windows
- Fix daemon terminal sessions hanging during shutdown
- Exclude copied history from forked Codex sessions from usage totals
- Keep separate Codex reasoning sections on separate lines

## [0.1.11]

- Highlight Markdown in the file editor, and toggle between source and a rendered preview
- Add UI and code font size settings
- macOS: Add "Open in.." button to open project folder in selected application

## [0.1.10]

- Add Kimi Code support
- Add Oh My Pi support
- Fix markdown table rendering

## [0.1.8]

- Fix `PATH` resolution on Windows

## [0.1.4]

- Fix text selection in diff view

## [0.1.3]

- Pin Codex and Claude commit message generation to cheap models: gpt-5.6-luna and claude-4.5-haiku
- Animate sidebars
- Render provider file edits as inline diffs in the transcript
- Fix claude task title generation

## [0.1.2]

- Fix regression: user bubble should fit its content width

## [0.1.1]

- Give nested Markdown the full message width
- Cap composer height and scroll overflow with an overlay scrollbar
- Keep drag-selecting text past the input bounds
- Fix char boundary panic when sliding the live reasoning window

## [0.1.0]

- Add standalone Kerenzikov daemon and browser client
- Add Linux support (X11 and Wayland, you need to build from source for now)
- Answer agent questions directly in the composer
- Redesign queued follow-ups as composer cards with per-message steering
- Add DeepSeek agent preset selection (Standard, Code, Minimal, and Creator)
- Add Claude context window and ultracode effort options
- Add /fast command to toggle fast mode for Codex
- Show the latest activity in live transcript headers
- Add soft wrapping and keyboard copy feedback
- Add terminal overlay scrollbar and measure cell width from the font
- Restore window position, size, and display across launches
- Contain wheel scrolling in activity and command output viewports
- Smooth streaming markdown and reduce CPU usage while streaming

## [0.0.13]

- Add DeepSeek Harness provider
- Render user message as Markdown and linkify bare URLs
- Share one resident OpenCode serve per workspace across sessions

## [0.0.12]

- Inherit the login-shell environment for provider commands
- Fix model traits across provider switches
- Keep branch change counts current and include untracked files
- Normalize SIGCHLD for provider children
- Fix Grok model discovery

## [0.0.11]

- Fix provider detection for CLIs installed through shell PATH managers such as
  nvm and fnm
- Show models registered by Pi extensions
- Fix the model picker closing when entering a space in search
- Fix duplicate transcript history when resuming ACP sessions

## [0.0.10]

- Fix crash in due to IME composition
- Fix typo

## [0.0.9]

- Add OpenCode Go support in usage popover
- Fix app icon
- Fix Cursor model detection

## [0.0.8]

- Initial release
