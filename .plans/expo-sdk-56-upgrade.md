# Expo SDK 56 Upgrade Plan

This document is the handoff plan for upgrading the mobile app from Expo SDK 54 to Expo SDK 56. Keep this work separate from create-page reorder UI changes. The upgrade should land first, then list/reorder improvements can be handled in a follow-up thread.

## Goal

Upgrade `apps/mobile` to Expo SDK 56 and the matching React Native, React, Expo module, and Expo UI versions without mixing in product UI changes.

The main reason to consider this now is that SDK 56 makes `@expo/ui` stable and production-ready, and it gives us a better foundation for native-feeling iOS and Android UI work later. The upgrade also moves the app onto newer React Native and Expo module internals, so treat it as a platform migration, not a small package bump.

## Current Starting Point

At the time this plan was written, the mobile app is on:

- `expo ~54.0.33`
- `@expo/ui ~0.2.0-beta.9`
- `expo-router ~6.0.23`
- `react-native 0.81.x` via the repo catalog
- `react 19.1.x` via the repo catalog

`react-native-draggable-flatlist` was previously tried for create-page media reorder and should not be reintroduced as part of this upgrade. The create-page caption/keyboard work is considered handled and should not be revisited unless the upgrade breaks it.

## Known SDK 56 Changes To Account For

Before changing packages, read the official SDK 55 and SDK 56 changelogs and compare them against the repo.

Important items already identified:

- SDK 56 includes React Native 0.85 and React 19.2.
- React Native 0.85 requires Node.js `20.19.4` or newer.
- SDK 56 requires Xcode `26.4` for native iOS builds.
- SDK 56 bumps the iOS deployment target to `16.4` for Expo modules.
- SDK 55 dropped Legacy Architecture support. If app config still carries `newArchEnabled` assumptions, remove or update them.
- SDK 56 has notable changes around `expo/fetch`, `expo-file-system`, DOM WebView behavior, status/navigation bar APIs, and `@expo/vector-icons` no longer being pulled in by `expo`.
- Expo Router changed in SDK 56 because it no longer depends on React Navigation in the same way. Audit direct `@react-navigation/*` imports before upgrading.
- A new development build is required after upgrading because this app uses `expo-dev-client`.

## Pre-Upgrade Audit

Run these checks before package changes:

- Confirm local Node version satisfies `>=20.19.4`.
- Confirm local Xcode version can build SDK 56 (`26.4`).
- Inspect `apps/mobile/app.json`, `apps/mobile/app.config.*`, and any Expo config plugins for stale SDK 54 or New Architecture settings.
- Search for direct imports/usages of:
  - `@react-navigation/*`
  - `expo/fetch`
  - `expo-file-system`
  - `@expo/vector-icons`
  - status bar or navigation bar APIs
  - DOM WebView APIs
- Check whether generated native directories `apps/mobile/ios` and `apps/mobile/android` are committed or treated as generated. If this repo uses Continuous Native Generation, follow Expo's guidance to regenerate them after dependency changes.
- Check `.notes/ios-27-scene-lifecycle-shim.md` only if the upgrade or native iOS build touches the same lifecycle surface.

## Upgrade Steps

Do this in a dedicated branch or worktree.

1. Run Expo's upgrade/install flow from `apps/mobile` so SDK-matched versions are selected.
2. Update repo catalog entries if React, React DOM, React Native, or shared type packages are pinned centrally.
3. Update `@expo/ui` to the SDK 56 bundled version.
4. Update Expo module packages to their SDK 56-compatible versions.
5. Update `@expo/config-plugins` and any related dev dependencies that need to match SDK 56.
6. Run Expo Doctor and address incompatibilities before touching app behavior.
7. Regenerate native projects if this repo's workflow expects generated `ios`/`android` output.
8. Create a fresh dev client build after dependencies and native project files are settled.

Avoid opportunistic UI rewrites during these steps. The only code changes in this phase should be compatibility fixes required by the SDK upgrade.

## Validation

At minimum, run the repo-required checks:

```sh
pnpm run lint
pnpm run typecheck
pnpm run format:fix
```

Also run mobile-specific checks:

```sh
cd apps/mobile
pnpm expo install --check
pnpm expo-doctor
pnpm ios
pnpm android
```

If `expo-doctor` requires a different command in this repo, use the SDK 56 recommended command and record the output in the upgrade summary.

Manual smoke checks after the new dev build:

- App launches on iOS.
- App launches on Android.
- Sign-in and auth redirect still work.
- Main tab navigation still works.
- Create page opens.
- Caption input still stays keyboard-safe.
- Create-page media selection still works.
- Existing create-page reorder fallback still works well enough to avoid regression before the native list follow-up.

## Do Not Do In This Upgrade

- Do not redesign the create page.
- Do not rewrite reorder media as part of the package upgrade.
- Do not add a new drag/reorder dependency without a separate decision.
- Do not remove the temporary iOS 27 scene lifecycle shim unless the SDK 56 migration makes it obsolete and the app is verified without it.
- Do not mix web/auth/Convex architecture changes into this branch unless the upgrade directly requires them.

## References

- Expo SDK 56 changelog: `https://expo.dev/changelog/sdk-56`
- Expo SDK 55 changelog: `https://expo.dev/changelog/sdk-55`
- Expo UI docs: `https://docs.expo.dev/versions/latest/sdk/ui/`
