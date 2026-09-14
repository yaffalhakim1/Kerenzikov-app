# Learning by implementing: how to use the agent on this project

A note on the working agreement for feature work, so it is not re-litigated
every time.

## The two modes

**Guide mode (default for features you want to learn from).** The agent scouts
the codebase, works out the change, writes a tutorial-style guide with the real
code in it, and then **reverts its own implementation**. You read the guide and
type the code yourself. The agent reviews your diff, cleans up the leftovers,
and adjusts the tests.

**Direct mode (for tooling and chores).** The agent just makes the change.
Suitable for things you are not trying to learn: CI config, scripts, dependency
bumps, mechanical renames.

Say which one you want. "Give me the guide" means guide mode.

## Why the agent implements it first

The implementation is not wasted work — it is how the guide gets written
accurately. Scouting a plan on paper produces confident-sounding instructions
that do not survive contact with the compiler: a type that turns out to be
`Stateful<Div>` instead of `Div`, an initializer that breaks in three places, a
`match` that is exhaustive in a second file you had not read. Every one of those
was found by actually building the thing.

So the sequence is: implement → verify it compiles and the tests pass → write the
guide from what was learned → **delete the implementation**. The guide is the
deliverable; the code was the research.

## What "revert" means precisely

Delete only the files the change added or modified, and leave the tree exactly as
it was before the work started:

```bash
git status --short          # see what the work touched
git checkout -- <files>     # revert modified tracked files
rm <new files>              # remove added files
```

Two things to be careful about:

- **Do not revert unrelated changes** that were already in the working tree. Read
  `git status` first and separate your work from what was there.
- **Regenerated artifacts revert with their source.** A guide that adds a
  protocol field regenerates `packages/waku-client/src/generated/`. When the
  implementation is reverted, those generated files go back too — otherwise the
  TypeScript clients reference types that no longer exist and the tree does not
  build.

The guide stays. It lives in `docs/` and describes what to build, not what was
built.

## What the guide should contain

Written as a walkthrough someone follows in order, not a spec:

- **The mental model first.** What kind of change is this — a pipe, a new
  surface, a data-shape change? The single framing that makes the rest obvious.
- **Every file, in the order you touch them**, with the actual code to type.
- **The reasoning for each non-obvious decision.** Why `snake_case` and not
  `camelCase`. Why this field is `Option`. Why the status is carried by an icon
  and not a colour. The reasoning is the part you cannot get from the diff.
- **The traps**, called out before you hit them: the type that changes on
  `.id()`, the constant that must move with a layout change, the generated file
  that silently breaks a wire format.
- **What to verify**, including which tests are expected to fail and why that
  failure is the useful signal.

## What the agent still does in guide mode

- Scout the codebase and find the real insertion points.
- Answer questions about your diff.
- Review your implementation and point out what is missing or wrong.
- **Clean up**: remove commented-out code, dead helpers, unused imports.
- **Adjust the tests**: update assertions your change invalidates, and add tests
  for new behaviour.
- Run the suite and report what fails.

You do not need to write tests or clean up after yourself. Type the code, run it,
and hand it back.

## Things worth knowing before you start

- **Read the compiler as instructions.** When a change adds a field to a shared
  struct, `cargo check` lists every place that must move with it. That is the
  fastest way to find the full blast radius.
- **Generated bindings are the silent failure.** `bun run protocol:generate`
  output is the one place a wire-format break shows up without any Rust test
  noticing. Always `git diff` that folder after regenerating.
- **Tests that fail are usually correct.** If a test asserts the old behaviour
  and your change alters it, the test is telling you the contract moved. Decide
  whether that is what you meant, then update it deliberately.
- **Do not trust "it compiles" as "it works".** Layout, spacing, and visual
  behaviour are verified by looking at the app, not by the test suite.
