# Journey to Vaikunta

A devotional Journey to Vaikunta app with a home page and Radha Nila Madhava-inspired mala counter, packaged for iPhone using Capacitor.

## Repo structure

- `www/` is the source of truth for the web app used by Capacitor.
- `ios/` contains the generated native iPhone project.
- `capacitor.config.json` contains the Capacitor app configuration.

## Getting started

```bash
cd /Users/riteshruparel/Documents/Codex/2026-04-30-code-me-a-mala-counter-app
npm install
```

## iPhone workflow

Sync the latest web files into the iOS project:

```bash
npm run sync:ios
```

Open the iOS project in Xcode:

```bash
npm run open:ios
```

If that does not open automatically, use:

`/Users/riteshruparel/Documents/Codex/2026-04-30-code-me-a-mala-counter-app/ios/App/App.xcodeproj`

## Exporting an `.ipa`

You need full Xcode plus Apple code signing set up on the Mac you are building from.

1. Open `ios/App/App.xcodeproj` in Xcode.
2. Select the `App` target.
3. Set your Apple Developer team in `Signing & Capabilities`.
4. Choose `Any iOS Device (arm64)` as the destination.
5. Run `Product` -> `Archive`.
6. In Organizer, use `Distribute App` to export the `.ipa`.

## Notes

- Edit app files inside `www/`.
- After web changes, run `npm run sync:ios` again before building in Xcode.
- This repo is organized for GitHub so generated dependency folders like `node_modules/` stay out of version control.
- GitHub Actions is configured in `.github/workflows/main.yml`.
- Push and pull request runs validate the web app and sync the Capacitor iOS project.
- Push, pull request, and manual runs also build an unsigned device `.ipa` artifact named `journey-to-vaikunta-trollstore-ipa`.

## GitHub Actions TrollStore build

No Apple signing secrets are required for the current workflow.

Open GitHub Actions and run the `iOS CI` workflow, or push a commit. When it completes, download the `journey-to-vaikunta-trollstore-ipa` artifact from the run summary.

## Important limitation

This workflow packages an unsigned device `.ipa`, which fits your TrollStore use case better than a simulator `.app`. I’m inferring from the TrollStore project docs that TrollStore can install IPAs directly and handle its own install-time resigning/preservation flow. For normal iPhone installation outside TrollStore, Apple code signing is still required.
