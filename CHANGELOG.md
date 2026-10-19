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

## [0.1.82]

### Android

- **The transcript no longer repeats itself under every reply.** Copy and the
  model name used to appear beneath every answer in a task, so a conversation
  with a dozen turns ended in a dozen copy buttons and a dozen copies of the
  same model name. Both now appear once, under the answer that ended the task —
  which is the one you scroll to when you want to copy the result.

- **A turn's thinking and its steps now read as one piece of work.** The
  reasoning row and the tool rows under it were two separate blocks with a gap
  between them, as though they were unrelated. They sit in one bordered card
  now, with a divider between the thought and the steps it produced.

- **The composer's settings are behind one button.** Agent access, reasoning
  effort, service tier and context window each had their own icon, and those
  icons told you a value was set without ever saying which — so the row spent
  its width on glyphs you had to open to read. One square button now holds them
  all, and its sheet names the current value of each. On the new-task screen the
  agent picker moved in with them, which frees the top of the card.

- **Fixed: an attached image could show an error instead of the picture.** Open
  a task where you had sent an image and the app could report a text-rendering
  error the moment the preview loaded.

- **Small alignment fixes.** The message box now starts on the same left edge as
  the button beneath it, and the daemon picker in the sidebar lines up with the
  search field under it.

## [0.1.81]

### Android

- **Fixed: the app closed when you opened a task right after reconnecting.** Come
  back to a task that had been running for a while and the app exited instead of
  showing it — reliably within the first minute or two, never after waiting.
  Reconnecting asks the daemon for everything the task produced while the phone
  was away, and the app was rebuilding its entire transcript once per message to
  catch up. On a long task that was minutes of hidden work, and opening the task
  on top of it was enough for Android to end the app. The catch-up now rebuilds
  the transcript once and spreads the work over a few frames, so opening the task
  straight away is safe; the header reads **Catching up…** while the backlog
  drains.

- **Fixed: a long catch-up could silently lose part of the transcript.** If a
  task produced more messages than the phone had buffered, the oldest were
  dropped while the app still believed it had seen them, so the transcript
  stayed incomplete with no sign anything was missing. A task that loses
  messages this way now reloads its transcript instead.

## [0.1.80]

### Android

- **This build carries no app changes.** It republishes 0.1.79 so the phone
  update manifest and the APK are generated from the current tree. Keep 0.1.79's
  notes in mind — the queued message and project-path fixes are what changed.

## [0.1.79]

### Desktop, web and Android

- **Fixed: adding a project failed for every folder on Windows.** Browsing to a
  directory and tapping Add answered "Enter an absolute path on the daemon
  host", whatever folder you were in, so a project could not be added at all
  this way. The path the app was given is the one it now accepts.

### Android

- **Fixed: a message you queued came back after it had already been sent.**
  Send a follow-up while the agent was working, let the task finish, and the
  message went out correctly — then stayed in the queue above the composer as
  though it had never left. The row is now gone the moment it is sent.

## [0.1.78]

### Desktop

- **Fixed: Stop did not stop an Oh My Pi task that you had nudged mid-turn.**
  If you sent a message while the agent was working and then pressed Stop, the
  task marked itself interrupted and the agent carried on anyway — finishing the
  work you had just cancelled, and paying for it twice. Stop now withdraws the
  message it had queued before halting, so the task actually stops.

## [0.1.77]

### Android

- **Fixed: a question from the agent drew nothing, so the task looked stuck.**
  When an agent asked which option to take — an OpenCode form, or a permission
  request — the task sat there doing nothing and there was no way to answer it.
  The card that asks is now drawn above the message box, whichever composer the
  app is using, so an agent waiting on you can be answered.

- **Reasoning now opens in a panel instead of expanding in place.** A long task
  showed every trace the model wrote inline, whether or not you read it, which
  made long tasks heavy to scroll. A trace is now a row you tap, and it opens in
  a half-height panel over the task.

- **Fixed: code in an answer was drawn in the wrong typeface.** Fenced blocks
  came out in the system font while inline code used the app's own monospace
  face, so the two disagreed inside one answer. They now match.

## [0.1.76]

### Desktop and Android

- **Fixed: Stop did not stop the agent.** Pressing Stop on a running task left
  it working — the turn carried on to the end, and the only way to actually halt
  it was to wait. Stop had been reduced to marking the session as "do not run
  what is queued next" and no longer told the agent to abandon the turn it was
  in, so the queue stopped and the work did not.

- **Fixed: a long task could freeze the task list.** With a long task open, and
  another one running behind it, tapping a task in the sidebar sometimes did
  nothing at all: the list stayed up and the task never opened, however many
  times you tapped. The sidebar closes itself when you pick a task, and that
  close was waiting on the task screen being ready — on a long transcript that
  is the slowest thing the app does, so the list sat over the screen it had
  already opened. It now closes the moment you tap.

### Android

- **A step in a task now looks like a step.** Steps were drawn as plain list
  rows, so a step that was still running looked exactly like one that had
  finished, and the only way to tell was to read the words. Each step now leads
  with its status — a tick when it settled, a magnifier while it runs, a warning
  when it failed — and shimmers while it is working.

- **Reasoning is collapsed until you ask for it.** A long task showed every
  trace the model wrote, whether or not you read it, which made long tasks heavy
  to scroll and slow to open. Traces now start folded, still shimmer while they
  are being written, and open on a tap.

- **The stop button is visible.** It drew a red square on a red button, so the
  control read as a blank chip. It is now a white rounded square on the red
  button, the same size as the send arrow it replaces.

- **The queued follow-up sits above the message box, not inside it.** A message
  waiting its turn is not part of the thing you are typing into, and inside the
  card it read as a second field.

- **A connection problem on the New Task screen is reported at the top.** It was
  shown under the setup rows, which is after you have already tried to use them.

## [0.1.75]

### Desktop and Android

- **Fixed: a task said it failed even though the answer arrived.** Every message
  sent to an OpenCode task came back with "OpenCode rejected the prompt" and
  "could not start the turn", while the reply was sitting right there in the
  transcript. Two fields of the same exchange had been renamed by the service,
  and Waku was reading the old names — so it misread a reply it had already
  received as a rejection.

- **Fixed: attaching a file or photo could spin forever.** Picking a file into a
  task that was pointed at an older daemon left the attachment loading with no
  way out: the app asked for something that daemon did not understand, the
  daemon answered nothing at all, and the request sat until it timed out. The
  spinner is gone either way now — the daemon always answers a request it cannot
  read, so the reason reaches you as an error, and a failed attachment no longer
  leaves its loading row behind. The app also refuses the connection up front
  when it is talking to a daemon too old to work with, instead of failing later
  on the first attachment. Attachments need the daemon from the same release.

## [0.1.74]

### Android

- **Fixed: the app felt slow right after opening.** Opening a task kicked off
  half a dozen background lookups at once — saved tasks, installed agents,
  model lists, a branch inspection — all over one connection, while the screen
  was still drawing its first frame. Those lookups now start only when what
  they serve is actually needed: branch lists wait until you open the branch
  picker, and model lists load in the background just before you'd want them.

## [0.1.73]

### Android

- **Fixed: attaching a large photo dropped the daemon connection.** A photo past
  roughly 12 MB closed the link and the app reported "Kerenzikov daemon
  disconnected" — the attachment was lost and the task went offline until it
  reconnected. The whole file was being sent as one message, and the platform's
  WebSocket refuses a message that big by closing the connection. Attachments
  now stream in chunks, so any size the daemon accepts arrives intact. This
  needs the daemon from the same release: an older daemon does not know the
  chunked upload and the attachment will time out.
- **A disconnected daemon now says so wherever you are.** The home screen
  mounted no banner at all, so a daemon that was connecting, reconnecting or had
  failed looked like an app gone quiet; Settings and Skills showed an empty
  screen with no reason either. Every screen that reads from the daemon now
  explains the link, in the same banner, with the same way to retry.
- **A task whose messages are still arriving shows a loading state**, instead of
  a blank transcript that read as a task with nothing in it.
- **The send, stop and loading controls in the composer are one size.** Send was
  drawn larger than the stop beside it, and the loading ring was bigger than the
  button it blocked. They now share the library's own small size.
- **A queued follow-up is as wide as the composer card.** It used to shrink to
  fit its own text, so a one-word queued message was a narrow chip. Long ones
  now truncate instead of stretching the row.

## [0.1.72]

### Android

- **A task's tool calls no longer crowd the conversation.** Every command an
  agent ran used to unfold inside the transcript, so a busy task was a wall of
  command output between you and the answer — and on a long one it could take
  about eleven seconds to open and then close the app. Each group of tool calls
  is now a single line — "Ran 14 commands · 2 file reads · 1 failed" — and
  tapping it opens the commands and their output in a sheet, where the detail
  belongs. A step that failed opens itself, so a problem is still the first
  thing you see.

- **Fixed: attaching a photo could drop the daemon connection.** A large photo
  — anything past roughly 12 MB — closed the link and the app reported
  "Kerenzikov daemon disconnected", so the attachment was lost and the task
  went offline until it reconnected. The whole file was being sent as one
  message, and the platform's WebSocket refuses a message that big by closing
  the connection. Attachments now stream in chunks, so any size the daemon
  accepts arrives intact. This needs the daemon from the same release: an older
  daemon does not know the chunked upload and the attachment will time out.

- **A disconnected daemon now says so wherever you are.** The connection's
  state was only reported on a task, the task list and a few settings screens;
  starting a new task on a home screen showed nothing at all, so a daemon that
  was still connecting — or had failed to connect — looked like an app that had
  simply gone quiet. Every screen that reads from the daemon now explains the
  link, in the same banner, with the same way to retry.

- **Fixed: opening a task could show an empty conversation.** A task whose
  messages were still being fetched rendered a blank transcript, which read as
  a task with nothing in it. It shows a loading indicator until the messages
  land.

- **The send, stop and loading controls in the composer are one size.** Send
  was drawn larger than the stop beside it, so the two did not line up and the
  send arrow overflowed its own button.

- **A queued follow-up is as wide as the composer.** It used to shrink to fit
  its own text, so a one-word queued message was a narrow chip. Long ones now
  truncate instead of stretching the row.

## [0.1.71]

### Desktop

- **Fixed: some agents were reported as "not detected" even though they were
  installed and on your PATH.** Codex and Copilot showed up, but OpenCode, Oh
  My Pi and others never did — and picking their program by hand in the
  Providers page changed nothing, so the row kept saying nothing runnable was
  found at that path. The app and its background service disagreed on how an
  agent's name is spelled, so the app could not read the answers it was given.
  Every agent you have installed now appears, and a path you choose by hand
  takes effect.

- **Fixed: opening the Skills page could hang for two minutes and then fail.**
  The library sat on a loading state and eventually reported only "timed out
  after 120s", naming no cause. It was the same spelling mismatch: the app
  discarded the reply it could not read and waited out the timeout. The page
  now loads normally, and a reply the app cannot read reports what was
  unreadable instead of appearing to hang.

## [0.1.70]

### Desktop

- **You can now pick an agent's program with a file dialog instead of typing
  its path.** The path box asked for an exact location, including the extension
  — which is easy to get wrong, because the same agent ships as `.exe` for one
  install and `.cmd` for another. A **Browse…** button now opens the usual file
  picker and fills the box for you. This is also the way back when the app
  cannot find an agent you know is installed.

- **Fixed: a slow or stuck agent program could freeze the Providers page.** The
  app asked each agent for its version without a time limit, so one that never
  answered left the page waiting indefinitely and the list half-filled. Asking
  is now capped, so an unresponsive program costs that one row instead of the
  whole page.

- **The "timed out" message now says what it was waiting for.** It read only
  "timed out waiting for Kerenzikov daemon", which named neither the operation
  nor how long it waited — so there was no way to tell what had gone wrong. It
  now names the operation and the time.

## [0.1.69]

### Desktop

- **Fixed: the Providers page could get stuck on "Checking…" forever.** Once
  that happened the refresh button did nothing when you clicked it, and typing
  an agent's path into a provider row appeared to do nothing as well — the row
  kept reporting that nothing runnable was found at that path, however many
  times you tried it. The page now always finishes checking, so the button
  works and a path you enter is actually applied.

- **Fixed: some installed agents were missing from the Providers page.** Amp,
  Claude, Codex and Copilot showed up, but other agents you had installed did
  not appear at all, with no way to add them. Checking could stop partway
  through, and the agents it had not reached yet stayed hidden.

## [0.1.68]

### Desktop and Android

- **Fixed: OpenCode stopped working after upgrading OpenCode.** The provider
  list offered two OpenCode entries, and after the upgrade neither one worked:
  the first failed to start at all, and the second connected but offered a
  model list frozen at whatever it was before you upgraded. Both entries were
  always the same program — the upgrade only changed the way it is spoken to —
  so there is now a single **OpenCode** provider that talks to the version you
  have installed. Tasks you had on the old entry keep working and keep their
  history.

- **OpenCode now offers the models, commands and skills you actually have.** The
  provider was reading a copy it saved before the upgrade, which is why a model
  you had added or removed never showed up. It now asks your running OpenCode
  service directly, so the picker tracks your providers and the composer lists
  the skills and commands OpenCode reports.

## [0.1.67]

### Android

- **Fixed: one long task took about eleven seconds to open, then closed the
  app.** A task whose steps had produced a lot of output — command output,
  reasoning, arguments — built every step's whole body as a nested disclosure,
  three deep, whether or not it was shown. The screen now builds a step's body
  only when it is opened, and a step's sections are headings rather than
  disclosures of their own. On the task that reported this, opening goes from
  11.2s to 3.8s, the worst frame from 6.4s to none, and the views it has to
  create from 743 to 85.

## [0.1.66]

### Desktop, web and Android

- **A failed task now offers a way forward instead of a dead end.** When a
  provider stopped before it could run a turn, the error was all you got: the
  only recovery was to retype the prompt. The composer now shows **Reload**,
  which rebuilds the connection to the agent while leaving the conversation
  where it is, and **Try again**, which runs your last message once more.

- **Fixed: a follow-up queued on one device could be lost by another.** Queue a
  message from your phone and then save from the desktop, and the phone's
  message disappeared — the two devices each kept their own view of the queue
  and the later one won. Queued messages now merge, so a follow-up survives
  whichever device wrote last.

- **Fixed: Stop did not stop the next queued message.** Pressing Stop during a
  turn halted the turn but still ran the message waiting behind it, which is
  the opposite of what Stop means. Stopping now holds the queue until you send
  something yourself.

- **Fixed: a follow-up could be stranded when the device that queued it went
  away.** The agent decided whether it was busy by asking the app, so a device
  that disconnected mid-turn left the queue waiting on a reply that never came.
  The agent now tracks its own state and starts the queued message the moment
  the turn ends, whether or not any device is still watching.

- **Fixed: Oh My Pi rejected a message sent while it was working.** Sending
  mid-turn surfaced "Agent is already processing" instead of delivering the
  message. It is now handed to the running turn as a follow-up, the way Oh My
  Pi expects.

- **Fixed: Codex could report "did not finish opening its thread".** Starting a
  task while Codex was still shutting down its previous session failed with
  that message and left the task stuck. The retry now happens where it can
  actually take effect.

- **Fixed: OpenCode stopped starting after upgrading to OpenCode 2.** The
  failure read "failed to start `opencode serve`: The system cannot find the
  file specified", which named neither the cause nor the fix. OpenCode 2 serves
  a different API, so the error now says so and tells you which provider to use
  or which build to install.

## [0.1.65]

### Android

- **Fixed: the app stayed busy the whole time a long task was open.** A session
  with more than a screenful of history kept redrawing at full rate with
  nothing happening — the mark above the oldest message was a spinner, and it
  spun for as long as the screen was open. It is a position rather than
  progress, so it no longer animates. On a 541-message session this takes the
  screen from a permanent 61 fps and a pegged render thread to idle, which is
  what makes a long task feel stuck.

## [0.1.64]

### Android

- **The model's thinking now has its own panel, above the steps it produced.**
  Reasoning used to render inside the same row as the tool group, so the row
  ran two animations at once — the group's title shimmering while the trace
  grew underneath it. That is why the header could read as blank for the whole
  run and only correct itself once the turn finished. The trace is now a
  `Reasoning` panel of its own, which opens while the thinking arrives and
  folds away a beat after it stops, and the steps stay in the task group below
  it. The header also names what is happening instead of drawing nothing when a
  step has not reported its title yet.
- **Fixed: a screen that could fail while a response was streaming.** A
  transcript row that gained its fade-in mid-stream could abort the screen with
  "Rendered fewer hooks than expected". Every row now animates the same way on
  every render.

## [0.1.63]

### Android

- **Fixed: the app closed itself while a response was streaming.** Since the
  PanelUI reskin, a turn that streamed text could kill the app outright — no
  error, no log, just a return to the home screen and a fresh launch. The
  streaming fade was handing React Native's easing function to the animation
  runtime, which runs on the UI thread, where a plain JavaScript function
  cannot be called; the runtime aborted the process instead of throwing. It is
  the same failure 0.1.61 and 0.1.62 were trying to catch. The fade now uses
  Reanimated's own easing, and a streamed response runs to the end.

## [0.1.62]

### Android

- **The task screen records what it was doing before it disappears.** When the
  screen closes itself with nothing to report, the app now leaves a trail of
  the moments that led up to it — the turn starting or finishing, and the app
  being backgrounded — so the cause can be found and fixed. Send the log from
  Settings → Diagnostics as before.

## [0.1.61]

### Android

- **A screen that fails now says so instead of vanishing.** When a turn was
  running or a response was streaming, the task screen could close itself and
  take the reason with it. The screen now stays, shows what went wrong, and
  offers to try again — and the error is written to a file, so it survives a
  restart and can be sent on.
- **Settings → Diagnostics** sends that error log, or clears it.

## [0.1.60]

### Android

- **Dark mode reaches every surface.** Choosing Dark while the phone was set to
  Light repainted the transcript and left the task panel, background work, and
  both composers on their light colours — so some text was dark and some light.
  The app's theme choice now reaches the whole interface.
- **Code in a response reads the same everywhere.** A code span in a paragraph
  was drawn in a different face and colour from one in a list, and the two
  drifted further apart in dark mode. Every span is now the same brand-tinted
  code.
- **The task list and background work fold away.** Both sat open above the
  composer, and a long plan or a busy task pushed the conversation off screen.
  Each now starts collapsed behind its own header, which still carries the
  progress and status.
- **Background work reads as a list of jobs.** A running command, an agent and
  a monitor were nested inside one another with a fold control each. They are
  now one row per job — kind, name, what it is doing, and the command — with
  `Stop` where the provider allows it.
- **The agent picker is a button.** On New Task it was a labelled chip; it is
  now the same round control as the rest of the composer, with the agent's name
  on the menu behind it.
- **Stop and Send are one size.** Stop was drawn larger than Send in the same
  slot, and heavier than it.
- **Mentioning a file by name works.** Typing `@` with a fragment ignored what
  you typed and listed the first few entries whatever you asked for. It now
  matches what you type, and the list scrolls.
- **The message field is legible in dark mode.** Text typed into the composer
  was drawn in the light theme's colour on a dark card.
- **Loaders** are a single rotating ring rather than a pulsing square.
- **The task drawer opens on a swipe from the edge**, not from anywhere on the
  screen — a stray sideways drag on the composer no longer slid it out, and
  opening it no longer crashed the screen.

## [0.1.59]

### Desktop

- **Live session cost.** The usage panel now shows what the running task
  costs as it works, priced from the provider's own token split — including
  cache savings on Claude. Providers that report only context occupancy have
  no cost row rather than a wrong one.
- **Helper model per provider.** Point Settings → Providers at a cheaper
  model for Waku's own background steps — commit subjects and memory
  extraction — while the task itself keeps running on the strong one.
- **Fallback models per provider.** List backup models to try in order when
  a turn fails because the provider is overloaded or rate-limited; the task
  retries itself instead of stopping. Queue order is preserved across the
  retry.
- Protocol bindings and mobile settings fixtures updated for the new
  settings surface.

## [0.1.58]

### Android

- **Markdown tables in transcripts read like tables again.** A wide table used
  to squeeze every column to a few characters, wrapping words mid-syllable.
  Columns now keep a readable width; a table that genuinely cannot fit pans
  sideways instead of scrambling.
- **Text you can actually read.** The dimmest text tier — timestamps, model
  names, footers — was far too faint on both themes. The whole text ramp now
  passes contrast checks in light and dark, and the green accent darkens to
  stay legible in daylight (dark theme keeps its vivid green).
- Smaller fixes: loading spinners announce themselves to screen readers,
  failed task and transcript loads offer a Try-again button, selection
  checkmarks match the rest of the app, and attachment remove buttons no
  longer overlap each other.

## [0.1.57]

### Desktop

- **Queued follow-ups actually run now.** A message queued while an agent was
  working could silently never start: the queue was handed over at the exact
  moment the agent finished, before the task's status had caught up, and the
  handoff gave up instead of waiting. Queued messages from every harness
  (Codex, OpenCode, Oh My Pi, …) now start on the agent reliably, whether the
  device that queued them is still around or not.
- **Codex tasks no longer strand on "already has an active writer".** Starting
  or resuming a Codex task could fail with that error when the task's previous
  agent process was still shutting down, leaving the task unable to run until
  you retried by hand. The app now waits out the shutdown and retries on its
  own.

## [0.1.56]

### Desktop and Android

- **A queued follow-up now shows up everywhere.** If you queued a message from
  your phone while an agent was working, the desktop never showed it waiting —
  and a queued message from the desktop did appear on the phone, so the two
  disagreed about the same task. The queue is now shared the same way the rest
  of the task is: queue on one device and every other device shows it, and when
  the agent finishes and picks the follow-up up, the row leaves the queue on
  every device instead of lingering as though it were still waiting.

## [0.1.55]

### Desktop

- **The task list is no longer drawn twice.** While an agent worked, its plan
  could appear in two places at once: the list above the composer and the small
  count beside the context circle. The count is now hidden while the list is
  open and comes back when you fold the list away, so the two never show the
  same plan together. The list also now lines up with the composer below it
  instead of running the full width of the window.

## [0.1.54]

### Desktop and Android

- **Tasks waiting on you lead the list.** A task blocked on a permission or a
  question is the one thing you have to act on, and it was buried in whatever
  project or date group it belonged to. Every waiting task is now collected into
  a **Needs you** section at the top of the sidebar, above your pinned tasks and
  every group. Answer the prompt and the task drops back into its place. Failed
  tasks stay where they are: a failure is an outcome, not something to answer.

### Android

- **The task list folds away.** The plan an agent keeps sat above the composer at
  full height for the whole task, so a long one kept pushing the composer down
  after it had stopped being useful. Tapping its header now collapses it to a
  single line with the count, and tapping again brings the steps back. It works
  the same way as the desktop tray.

## [0.1.53]

### Android

- **Notifications when a task finishes while the app is closed.** The phone
  keeps a direct connection to your desktop daemon, and the system suspends that
  connection whenever the app goes to the background — so a turn that finished
  while you were away was invisible until you opened the app again. Kerenzikov
  now sends a notification through Expo's push service when a turn finishes, a
  permission is requested, or the agent needs an answer, and only while the app
  is backgrounded. Tapping it opens the task. The notification names the task
  and, when the agent gives one, summarises what happened.
- **A long task list stays smooth while a task streams.** A project with many
  tasks stuttered when scrolled during a running turn. Each group now shows its
  first few tasks with a "See more" row, and folding a group resets it back to
  that first page.

## [0.1.52]

### Desktop

- **The task list shows up for more agents.** The plan an agent keeps while it
  works was only appearing for some harnesses, and Claude Code was the one
  people noticed: recent versions of it replaced the single `TodoWrite` tool
  with four smaller ones that create, update, and list tasks one at a time.
  Kerenzikov did not recognise any of them, so the list stayed empty. It now
  understands both shapes — the whole-list form every other harness sends, and
  the incremental one, which is reassembled across calls as the agent makes
  them.
- **The task list sits above the composer while a task runs.** It used to be a
  small chip you had to click. Now the current step is visible without asking:
  the tray shows the step in progress and the ones around it, with a count of
  what came before and after, and collapses back to the chip if you would
  rather not see it. It renders nothing at all when there is no plan.

## [0.1.51]

### Android

- **Updates can reach you again.** Every Android build from 0.1.48 onward
  reported the same internal build number, and the app only offers an update
  when the release's number is higher — so 0.1.49 and 0.1.50 were published,
  downloadable, and never offered to anyone already running 0.1.48 or later.
  The build number is now derived from the version instead of being maintained
  by hand, so it cannot repeat. **If you are on 0.1.48 or newer, install this
  one manually from the release page; from 0.1.52 onward the app will tell you
  about new versions itself.**
- **The version in Settings is the version you are running.** It was stuck at
  whatever number was last typed into the app's configuration file, which was
  three releases behind.

### Under the hood

- The release workflow builds only what changed: a release that touches just
  the Android app no longer spends two Windows runners producing installers
  identical to the previous release's.

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
