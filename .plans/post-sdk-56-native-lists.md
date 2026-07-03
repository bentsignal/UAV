# Post SDK 56 Native Lists Plan

This document is the follow-up plan for improving create-page media reorder and related list UI after the Expo SDK 56 upgrade lands. Do not start this work until the SDK 56 branch is merged and the mobile app is building cleanly on iOS and Android.

## Current Thread Handoff

As of June 10, 2026, the SDK 56 upgrade is building on iOS simulator and iOS physical device with Xcode beta / iOS 27.

Keep this context in mind before changing list/reorder code:

- Root `pnpm.overrides` currently pins `react` and `react-dom` to `19.2.3`. Keep those pins unless replacing them with an equivalent workspace-wide fix, because they prevent the React / `react-native-renderer` version mismatch seen during Android bundling.
- `patches/expo-modules-jsi@56.0.8.patch` is required for current Xcode 27 beta builds. It fixes an ExpoModulesJSI Swift/C++ interop compiler issue and suppresses warnings only for the nested ExpoModulesJSI xcframework build, which Xcode 27 otherwise treated as a physical-device archive failure.
- `.notes/ios-27-scene-lifecycle-shim.md` is the central removal checklist for temporary iOS 27 / Xcode 27 compatibility patches.
- `react-native-keyboard-controller` was removed during the SDK 56 cleanup. The create page now uses React Native primitives for keyboard avoidance and should keep the current caption keyboard behavior.
- React StrictMode remains enabled. Do not disable StrictMode to hide list/gesture warnings.
- A physical-device `development:client` local build succeeded and was installed on Shawn's iPhone from `apps/mobile/build-1781097541407.ipa`.
- The last runtime issues were caused by native dependencies not being fully ready for React 19 / React Native 0.85 / StrictMode / Xcode 27. Prefer dependency updates, Expo/RN primitives, or scoped native implementation over broad patches.

## Goal

Replace the current working-but-janky reorder UI with a more native-feeling implementation, using SDK 56's stable `@expo/ui` primitives where they actually fit.

The current JavaScript `PanResponder` reorder modal is acceptable as a fallback because it works and persists order. The next step is to improve quality without returning to fragile gesture libraries that fight React StrictMode or the surrounding scroll view.

## Platform Direction

The likely direction is platform-specific:

- iOS: use Expo UI's SwiftUI `List.ForEach` reorder support with `onMove`.
- Android: evaluate Expo UI Jetpack Compose options after the SDK 56 upgrade. The current public `LazyColumn` docs do not show an exposed `onMove` reorder API, so Android may need to keep the JS fallback or use a small native/inline module later.
- Shared UI: keep the existing store contract, especially `replaceItems`, so persistence behavior stays simple and testable.

Do not assume there is one Expo UI component that solves reorder cross-platform. Verify the SDK 56 installed package and docs before implementing.

## iOS Native Reorder Sketch

Use a separate iOS reorder modal/screen rather than trying to make the create-page grid itself reorder. That keeps the main create page simple and avoids scroll gesture competition.

Likely shape:

- Add `reorder-media-button.ios.tsx` or an iOS-specific child component.
- Render an Expo UI SwiftUI `Host` containing a `List`.
- Use `List.ForEach` with `onMove`.
- Enable edit mode so native reorder handles are visible.
- Convert SwiftUI move events into the existing item array order.
- Persist changes through `replaceItems(nextItems)`.

Preserve these existing requirements:

- No visible "Position 1 / Position 2" labels.
- Thumbnails or enough media identity to make the order obvious.
- Releasing the drag must commit the order.
- Reopening the reorder view must show the persisted order.

## Thumbnails And RNHostView

SDK 56 adds `RNHostView`, which can host React Native content inside Expo UI native layouts. After upgrading, test whether it can safely host the existing media thumbnail preview inside native rows.

If `RNHostView` works well:

- Use native list structure for drag/reorder.
- Host the existing React Native thumbnail/preview content inside each row.

If `RNHostView` does not work well:

- Keep the row simpler for the first native pass.
- Prefer a stable native reorder interaction over a visually perfect preview.
- Avoid adding a new dependency just to preserve thumbnails.

## Android Options

After SDK 56 is installed, inspect the actual `@expo/ui` Jetpack Compose exports and docs.

Possible outcomes:

- If Expo UI exposes native reorder for Android, build an Android-specific implementation matching the iOS behavior.
- If it does not, keep the current JS `PanResponder` modal on Android and polish its layout.
- If Android quality still matters enough later, consider a small native/inline module using Jetpack Compose drag reorder patterns, but treat that as a separate decision.

## Implementation Guardrails

- Do not reintroduce `react-native-draggable-flatlist`.
- Do not use `GestureDetector` for the reorder handle unless the StrictMode `findNodeHandle` warnings are proven fixed in the installed SDK/dependency set.
- Keep reorder state local while the modal is open, then persist through `replaceItems`.
- Keep the surrounding create page scroll out of the drag gesture.
- Make the reorder view a focused modal/screen with vertical rows.
- Keep the visual design compact and utilitarian.
- Test with at least 2, 3, and 10 media items.

## Validation

Use the repo-required checks after code changes:

```sh
pnpm run lint
pnpm run typecheck
pnpm run format:fix
```

Manual checks:

- iOS: drag first item to bottom, release, close, reopen, confirm order persists.
- iOS: drag bottom item to top, release, close, reopen, confirm order persists.
- iOS: verify no StrictMode `findNodeHandle` / `findHostInstance_DEPRECATED` warnings.
- Android: verify the fallback or native implementation can reorder and persist.
- Create page: confirm caption keyboard behavior did not regress.
- Create page: confirm media upload/post flow still uses the reordered item array.

## References

- Expo UI docs: `https://docs.expo.dev/versions/latest/sdk/ui/`
- SwiftUI List docs: `https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list/`
- Jetpack Compose LazyColumn docs: `https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/lazycolumn/`
- RNHostView docs: `https://docs.expo.dev/versions/latest/sdk/ui/universal/rnhostview/`
