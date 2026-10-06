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

## [0.1.50]

### Mobile

- **The task list scrolls smoothly again.** Scrolling it stuttered whenever a
  task was running — a settled task was fine. Every streamed chunk of the
  running turn was rebuilding the whole list, so the app was re-grouping and
  re-drawing it many times a second while your finger was on the screen. A
  running turn no longer touches the list at all.
- **The working spinner is lighter.** The little grid that marks a running task
  is now a single pulsing square in the same accent colour and the same
  rhythm. It does the same job with a ninth of the drawing work, which is what
  the list and the streaming tail were paying for on every running row.

## [0.1.49]

### Desktop

- **The agent's task list now works with every provider.** The task-list panel
  above the composer was fed by OpenCode alone; it stayed empty for everyone
  else. Codex, Claude Code, Amp, Cursor, Copilot CLI, Grok Build, Kimi Code,
  Fx, Pi, Oh My Pi and the DeepSeek Harness all publish a plan already — that
  list now reaches the panel, with each provider's own wording for a step
  (`abandoned` reads as cancelled) and an unknown state shown as outstanding
  rather than dropped.

### Mobile

- **The phone shows the same task list.** `TodoStrip` mirrors whatever the agent
  published, so the task list you see on the desktop is the one on your phone.
- **Fixed a crash on launch.** The app exited immediately on start in debug
  builds because `expo-device` had drifted onto a version that did not match
  the rest of the SDK. Every Expo package is now aligned, so the app launches
  and stays up.

## [0.1.48]

### Desktop

- Settings → Daemon now shows **Connected clients** while the daemon is
  exposed: every phone or browser sharing this machine's tasks, by name and
  how long it has been connected. You finally know who is on your daemon.
- Clients introduce themselves when they connect (the desktop as its machine
  name, the phone as its device name), so the list is readable instead of a
  row of opaque ids.

## [0.1.47]

### Mobile

- The task list reads better: tasks group into segmented cards with counts,
  each tinted by its project, and archiving a task offers Undo instead of
  asking for forgiveness.
- The composer's Send and Stop buttons cross-fade in place instead of
  swapping, so the toolbar no longer shifts when an agent starts or finishes.
- Pressing Send, Stop, or long-pressing a task now gives a firmer, immediate
  confirmation tick.
- The filter sheet's selected row carries just its checkmark, without a
  background fill, and the extra "Task list" heading is gone.
- Fixed a Reanimated warning the archive-undo banner produced on every render.

### Development

- `bun scripts/mobile.ts` now runs the Metro dev server in the terminal
  (logs stream, Ctrl+C stops everything) instead of spawning it in the
  background, refuses to run against a release build of the app — whose
  embedded bundle made every change invisible — and no longer crashes
  starting Metro's log file.

## [0.1.46]

### Mobile

- Fixed the task-history drawer hanging for tens of seconds the first time it
  was opened after connecting to a daemon. It now opens immediately and fills
  in as the task list arrives.
- Fixed "Reload transcript" on a task whose stored copy was behind the live
  stream: it now reconciles against what is on screen instead of doing
  nothing, and it re-attaches the agent so controls work afterwards.
- Fixed tasks that stayed stuck on a spinner saying "no live agent runtime"
  after a daemon restart, and "Send now" not working on queued messages.
- Streaming a long task no longer burns seconds of the app's time per minute
  on background bookkeeping nobody sees.
- New dev-loop script (`bun scripts/mobile.ts`) for development setups.

## [0.1.45]

- The app no longer freezes for a few seconds right after it opens and
  connects to the daemon. The task-history drawer was being built in the
  background at launch — every task row and its agent mark — before you opened
  it, which stalled the first frames. It is now built the first time you open
  it, so the app is interactive immediately.

## [0.1.44]

- Tasks can be pinned to the top of the list. Pin or unpin from a task's
  row menu; pinned tasks collect in their own section above Today.
- The task list shows more at a glance: each row carries the provider mark, a
  status badge (Done, Input, Failed, Background), and the project it belongs to.
- Attachments show an upload ring while they send, so a large file no longer
  looks stuck.
- Collapsed sections fade their rows in when opened, instead of popping.
- The daemon picker shows connection details for each host: online state,
  version, session count, and address.
- Sending a message now keeps the newest reply in view. Before, the view could
  land past the reply on blank space, or on your own message, while the answer
  streamed in.
- The app no longer crashes when Android saves its state in the background,
  which was killing the app after you left and returned to it.

## [0.1.43]

- Settings → Daemon now shows the machine's Tailscale address when Tailscale
  is running, with a one-line setup hint. The address it showed before was the
  computer name, which does not resolve from a phone on another network — the
  tailnet address is the one a mobile client can actually save. Copy it from
  the new card instead of the hostname.
- The loading spinner is gone. A small grid of squares that shrink and grow in
  a sweep now marks every working state on desktop and mobile, tinted with the
  brand colour.
- Answering an agent's question no longer makes the question panel vanish. The
  panel could clear itself a moment after it appeared, before you could pick an
  answer, whenever the agent was running its question tool.
- The model picker no longer jumps back to the running task's provider. While a
  task ran, choosing a different agent for a new task could snap back to the
  one already running.

## [0.1.42]

- Transcripts no longer duplicate themselves. With more than one client
  attached — the phone and the desktop watching the same task — each client
  saved its own copy of every streamed message, and old turns could
  reappear in the middle of the transcript after a reconnect. Saving now
  removes message rows a session's save did not write, so copies converge
  and already-duplicated transcripts clean themselves up.
- Codex replies are no longer appended twice. When a reconnect replayed
  only the tail of a reply, the app mistook the missing head for the whole
  message and streamed the reply again on top of itself — visibly, the
  second copy starting inside the first one's code fence. The repair now
  fills in only what the stream actually missed.

## [0.1.41]

- Codex Plan mode now actually plans. Plan previously only enforced a
  read-only sandbox; Codex has its own plan mode on top of that, and the app
  never asked for it, so the model could not write but also never produced a
  plan. Selecting Plan now turns on Codex's planning behaviour, keeping the
  model and reasoning effort you already picked.
- The phone's Usage page now says how much of the cost total no published
  model price could cover — the desktop and web already did, and without it a
  partial total read as a bug rather than a coverage gap.

## [0.1.40]

- Task costs are no longer blank. The Usage page prices a session by looking
  the model up in a public rate table, and models whose version the agent CLI
  writes with dashes (deepseek-v4-1-flash) never matched the table's dotted
  form (deepseek-v4.1-flash) — so most sessions contributed nothing. Those
  sessions are now priced; free and experimental variants with no published
  rate still show as unpriced rather than guessing.
- The app no longer drops its connection to the desktop after sitting idle.
  Neither side of the link used to send any traffic between turns, and home
  routers and Wi-Fi power management quietly forget connections like that; the
  desktop now keeps the link warm, so the "reconnecting" banner after leaving
  the app alone is gone.

## [0.1.39]

- The phone's task list no longer stutters while an agent is working. The list
  and the open transcript were sharing one cache, so every streamed token
  re-sorted the list and rebuilt every row about eight times a second — even
  with the drawer closed. The list now tracks only what it draws.
- Codex replies are no longer printed twice. A reply containing a citation was
  compared against the wrong copy of its own text at the end of the turn, so
  the whole answer was appended a second time.
- Wide tables in a reply now fit the screen. Cells wrap to the column width
  instead of pushing the table into a long sideways scroll; a table with more
  columns than the phone can hold still pans, because squeezing those to
  slivers reads worse than scrolling.
- Choose your theme on the phone. Settings has an Appearance section with
  System, Light and Dark. System follows your phone; an explicit choice applies
  everywhere, including the native menus, which no longer stay white in dark
  mode.
- The composer no longer shows the context ring twice — it stays in the task
  header only.
- The assistant's footer now names the model that wrote the reply, beside the
  copy button.
- Message times are 24-hour, on the phone and in the browser client alike.

## [0.1.38]

- The phone app starts much faster. It used to hold the splash screen until it
  had finished connecting to your desktop, so an unreachable or slow machine
  meant staring at the logo for seconds; it now opens as soon as your saved
  daemons are read, and the connection reports itself in the usual banner.
- Streaming replies no longer stutter. The fade on newly arrived text was being
  drawn by the app's own thread about thirty times a second, competing with the
  text still arriving; that work now happens on the graphics chip, so a long
  reply stays smooth as it streams. Reasoning traces get the same treatment.
- Opening a task no longer flashes a loading spinner before the messages
  appear, and opening Settings no longer blinks while it checks for updates.
  When you are already on the newest version the update row shows no button at
  all; a failed check still offers a retry.
- The task list is easier to reach. Search and New task sit at the top, the
  drawer covers the whole screen instead of leaving a strip of the chat
  showing, and Settings has a permanent button in the bottom-left, available
  whatever the connection is doing.
- New tasks can start from a template. Eight ready-made openings — "Explore the
  codebase", "Catch me up", "Debug an issue" and more — fill the composer so the
  wording stays yours to edit before it is sent.
- The composer says what it will run: the model and the agent, named above the
  input, with a ring beside them that opens the context window in the same
  numbers the desktop shows.
- Corners across the sidebar and composer are tighter and now match the desktop,
  and the connecting indicator uses the app's own green rather than a warning
  colour.

## [0.1.37]

- Removing a task is no longer permanent. Removal now archives: the task, its
  full conversation and its Git checkpoints all stay on disk, it simply leaves
  the list, and the notification that appears offers an Undo that puts it
  straight back. A "Show archived" entry in the sidebar menu reveals what has
  been archived, and a task can be unarchived from its own menu at any time.
  Nothing is destroyed unless you delete an archived task explicitly.
- Plan before you build. A new **Plan** access mode sits ahead of the others:
  the agent investigates and proposes without changing a single file, so you can
  read the approach first and then switch to a mode that writes. It is available
  from the access control in the composer on desktop, and from both access
  sheets on the phone.
- A first launch with no coding agent installed now says so. Instead of
  inviting you to open a project and then failing the moment you try to send,
  the welcome screen names the agents Kerenzikov drives, links each one's
  install page, and offers a refresh once you have installed one.
- Long operations no longer look like nothing happened. The Skills library, the
  session resume list and the changes view all draw their own shape while the
  first result is still being read, so a wait reads as a wait rather than as an
  empty screen.
- When the connection to the background service drops, the app says so and
  keeps saying so. Previously a lost connection was silent unless you happened
  to notice the task list had stopped updating; a bar now reports it and clears
  itself as soon as the service is reachable again.
- Finding an old task is quicker. The sidebar has its own filter field, so a
  long history can be narrowed to one task without leaving the sidebar, and a
  search that matches nothing says so instead of showing an empty list.
- Selected text can be sent with your next message. Select part of a reply and
  choose **Add Selection to Composer** to quote it into the prompt, with
  whatever you had already typed left untouched.
- Hovering a control now tells you its shortcut. The sidebar and right panel
  toggles, the stop button and the model picker all name the key that does the
  same thing, instead of leaving the shortcut discoverable only in the command
  palette.
- Pairing a phone is one paste. Settings → Daemon can copy a single pairing
  link containing both the address and the token; pasting it into the mobile
  app fills in both fields at once, rather than copying two values and hoping
  they land in the right boxes.

## [0.1.36]

- Code on the phone finally looks like code. Every mono surface rendered in the
  system font — code spans kept their grey wash but lost the monospace face, and
  code blocks, diffs, and file paths were all set in the wrong type, because the
  bundled JetBrains Mono was never registered with Android. The transcript also
  reads at a comfortable size now, with body text, headings, and code all scaled
  up for a phone.
- Markdown tables are legible. Cells used to size themselves, so columns never
  lined up and a table read as loose text; a wide table now keeps its column
  widths and pans sideways instead of squashing into unreadable slivers. Tables
  are drawn as a bordered grid with a tinted header row.
- Your reply to an agent question no longer gets lost. Answering on the desktop
  while the phone had the same question open left the phone stuck showing a
  question that had already been answered, and sending it did nothing.
- A message typed while the agent was busy is queued instead of rejected. It
  could be sent as a mid-turn steer before the provider had actually started its
  turn, which the provider refused — you saw an error and the message landed in
  the queue rather than simply waiting its turn.
- The composer keeps its settings together: the model chooser now sits beside
  the access control instead of across the row, and the agent-profile picker is
  hidden.
- The task sidebar slides over the chat instead of shoving it aside, and the
  native menus are flat, white, and free of separator lines.
- Starting a new task no longer reopens on the wrong agent. A task started
  without an explicit model left the remembered agent frozen at whichever one
  was last used with a model, so a Codex task could come back as OpenCode.

## [0.1.33]

- Returning to the window no longer stutters. Bringing Kerenzikov back from the
  taskbar or the Dock used to play the entrance unevenly: the app kept animating
  and accumulating work while it was hidden, then presented all of it at once.
  It now rests while hidden and settles in smoothly, and the spinners pick up
  from the start of their cycle instead of snapping mid-rotation.
- The window no longer costs anything while it is minimized or in the
  background, instead of quietly re-rendering frames nobody could see.
- A long transcript reflows at its new width without a visible hitch when the
  window is restored or resized.

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
