# Security Policy

## Supported Versions

Only the latest release of Kerenzikov receives security fixes.

Updates are **manual**: this fork ships no auto-updater and no update feed, so
install a newer release from the
[releases page](https://github.com/yaffalhakim1/Kerenzikov-app/releases/latest) when one is
available.

## Reporting a Vulnerability

This fork does not yet have a private reporting channel configured: GitHub
private vulnerability reporting is disabled on this repository, and so is the
issue tracker.

Until that changes, please report security problems to the upstream project
that this fork is based on, which has a working private channel:

https://github.com/egoist/waku/security/advisories/new

If the problem is specific to this fork's changes (the Windows or Android
build, the daemon, or anything under `apps/`), say so in the report so it can be
routed correctly.

Please don't open a public issue for anything you believe is exploitable before
it has been fixed. Include reproduction steps and the Kerenzikov version you
tested — the version is in the release tag of the build you downloaded.
