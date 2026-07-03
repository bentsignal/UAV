# Google Places Location Tagging Plan

This document is the implementation handoff for adding location tagging to the Create Post flow. The settled direction is to use Google Places for global location search, keep the UI fully custom, proxy every Google request through Convex, and store only the selected per-post location data that the app actually needs.

Do not implement an owned global places dataset. Do not import OpenStreetMap, Overture, or any full-planet place index into Convex. The product requirement is worldwide search, and the project should not become responsible for storing or operating millions of place records.

## Goal

Users should be able to tag the location where a post was taken while creating a post.

The first implementation should add this to the Create Post page only. Displaying the location on feed/profile post items and opening the location from existing posts can be handled in a later UI pass, but the data stored now should support that future behavior.

The experience should feel native and integrated with Ruby's UI:

- The user taps an "Add location" row or button in the Create Post page.
- The app shows a custom search UI, not Google's prebuilt widget.
- The user types a place name, address, landmark, city, hotel, restaurant, or other location.
- Suggestions autocomplete from Google Places through Convex.
- The user taps one suggestion.
- The app resolves the selected place once, stores a minimal snapshot in create state, and submits it with the post.
- The selected location appears in the composer as a compact row/chip with the place name, optional address/subtitle, and a remove affordance.

Location tagging is optional metadata. Do not change the current rule that a post needs media and/or caption content. A location-only post should not become publishable unless the product requirement changes separately.

## Provider Direction

Use Google Places API for v1 across mobile and web.

Use Google only for search and resolving a selected result. Do not use a map SDK, map tiles, or embedded map for this Create Post feature.

Use these Google APIs:

- `places:autocomplete` for search suggestions.
- Place Details for the selected `placeId`, but only after the user taps a suggestion.

The client must never call Google directly. All Google requests must go through Convex actions so the API key stays server-side.

## Non-Goals

Do not do these in this implementation:

- Do not add map rendering to the Create page.
- Do not add a native Apple Maps or Google Maps SDK.
- Do not add Places UI Kit or any hosted Google autocomplete UI.
- Do not put a Google API key in `EXPO_PUBLIC_*`, `VITE_*`, app config, mobile bundle code, or web client code.
- Do not store autocomplete result lists in Convex.
- Do not create a reusable `places` table that acts like a copied Google places database.
- Do not request rich Google fields such as photos, ratings, reviews, opening hours, phone numbers, websites, price levels, or editorial summaries.
- Do not implement post item display/open behavior yet unless the user explicitly expands the scope.

## Current Code Surfaces

Mobile create flow:

- `apps/mobile/src/app/(tabs)/create.tsx`
- `apps/mobile/src/features/post/create/store.ts`
- Existing create components live under `apps/mobile/src/features/post/create/components/`

Web create flow:

- `apps/web/src/app/_authed/create.tsx`
- `apps/web/src/features/post/create/store.ts`
- Existing create components live under `apps/web/src/features/post/create/components/`

Convex post creation:

- `services/convex/src/posts/mutations.ts`
- `services/convex/src/posts/validators.ts`
- `services/convex/src/posts/validation.ts`
- `services/convex/src/posts/types.ts`
- `services/convex/src/schema.ts`

Convex env and rate limiting:

- `services/convex/src/convex.env.ts`
- `services/convex/src/limiter.ts`
- `services/convex/src/utils.ts`

Shared utilities/components that may be useful:

- `shared/std/src/use-debounced-input.ts`
- `shared/ui-web/src/button.tsx`
- `shared/ui-web/src/input.tsx`
- `shared/ui-web/src/dialog.tsx`
- `shared/ui-web/src/drawer.tsx`
- `shared/ui-web/src/tooltip.tsx`
- `shared/ui-mobile/src/button.tsx`

## Data Contract

Add an optional `location` object to posts.

The object should represent a single selected location for a post. It should not represent a cached Google response.

Recommended initial shape:

```ts
type PostLocation = {
  provider: "google";
  googlePlaceId: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
};
```

Convex validator sketch:

```ts
export const vPostLocation = v.object({
  provider: v.literal("google"),
  googlePlaceId: v.string(),
  name: v.string(),
  formattedAddress: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
});
```

Then add `location: v.optional(vPostLocation)` to `vPost` and to the create mutation args.

Validation should enforce practical limits:

- `googlePlaceId` must be non-empty and trimmed.
- `name` must be non-empty and trimmed.
- `name` should have a max length, for example 160 characters.
- `formattedAddress` should have a max length, for example 280 characters.
- `latitude`, if present, must be between `-90` and `90`.
- `longitude`, if present, must be between `-180` and `180`.
- Unknown provider values must be rejected.

Do not let malformed client input write arbitrary objects into posts.

## Google Content Storage Guardrail

This matters. Google Maps Platform has caching/storage rules. The implementation must not accidentally turn Convex into a permanent mirror of Google Places data.

The safe baseline is:

- `googlePlaceId` can be stored indefinitely.
- Store only one selected location snapshot per post.
- Do not store autocomplete result arrays.
- Do not store unused fields.
- Do not store rich place data.
- Do not use stored location data to power search, recommendations, analytics, or a competing places index.

Before launch, verify the current Google Maps Platform terms for permanent storage of non-place-id fields such as name, formatted address, latitude, and longitude. If the terms do not allow storing any of those fields permanently from Places API responses, adjust before launch rather than ignoring the restriction.

Acceptable fallback if storage policy is too restrictive:

- Store `provider` and `googlePlaceId` permanently.
- Store a minimal user-confirmed display label only if it is allowed for this product use.
- Resolve details on demand for display/open flows later, with caching limits respected.

The implementer should call this out explicitly in their summary if they cannot confirm the storage policy. Do not bury this as an implementation detail.

## Convex Google Proxy

Add a new Convex module for places, likely:

- `services/convex/src/places/actions.ts`
- `services/convex/src/places/google.ts`
- `services/convex/src/places/validators.ts`
- `services/convex/src/places/types.ts`

The public actions should be authenticated. Actions do not currently have the same `authedQuery` / `authedMutation` helper shape, so either add a small `authedAction` helper that follows the existing pattern or manually require `ctx.auth.getUserIdentity()` at the start of each action.

Minimum actions:

```ts
autocomplete({
  input: string;
  sessionToken: string;
  languageCode?: string;
  regionCode?: string;
}): Promise<LocationPrediction[]>
```

```ts
resolve({
  placeId: string;
  sessionToken: string;
  selectedName: string;
  selectedSubtitle?: string;
}): Promise<ResolvedLocation>
```

Provider-neutral return types:

```ts
type LocationPrediction = {
  id: string;
  provider: "google";
  placeId: string;
  title: string;
  subtitle?: string;
};
```

```ts
type ResolvedLocation = {
  provider: "google";
  googlePlaceId: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
};
```

`selectedName` and `selectedSubtitle` are included in `resolve` so the client can preserve the exact suggestion label the user tapped without needing to request expensive display-name fields from Place Details.

## Google API Details

Use the Places API (New) web service from Convex.

Autocomplete endpoint:

```txt
POST https://places.googleapis.com/v1/places:autocomplete
```

Place Details endpoint:

```txt
GET https://places.googleapis.com/v1/places/{placeId}
```

Use headers:

```txt
X-Goog-Api-Key: <server side key from Convex env>
X-Goog-FieldMask: <minimal fields>
```

For Place Details, keep the field mask as small as possible. Start with fields that support the product need and avoid higher-cost fields:

```txt
id,formattedAddress,location
```

Only add `addressComponents` if the UI or future storage shape truly needs structured city/region/country.

Avoid requesting these unless the user explicitly accepts the cost:

- `displayName`
- `googleMapsUri`
- `photos`
- `rating`
- `userRatingCount`
- `regularOpeningHours`
- `currentOpeningHours`
- `internationalPhoneNumber`
- `nationalPhoneNumber`
- `websiteUri`
- `reviews`
- any Atmosphere/Enterprise-style fields

Important cost note: use the autocomplete suggestion text for the display name. Do not request Place Details `displayName` just to show the place name, because the field can move the Details request into a more expensive SKU tier.

## Session Tokens

Use Google session tokens correctly.

Generate one token when the user starts a location search session:

- Opening the mobile location sheet creates a new token.
- Opening the web location dialog/popover creates a new token.
- All autocomplete calls during that search use the same token.
- The resolve/details call after selection uses the same token.
- Closing/canceling the search discards the token.
- Selecting a result completes the token and the next search starts a new token.

Do not generate a new session token for every keystroke. That defeats the billing model and can increase cost.

Generate the token on the client with a UUID. The token is not secret. It exists to group billing for a single user search session.

## Cost Controls

Cost control is a hard requirement. Implement these from the beginning, not as a cleanup task.

Client-side controls:

- Do not call autocomplete for empty input.
- Do not call autocomplete until the trimmed input has at least 3 characters.
- Debounce input, likely 300 to 400ms.
- Cancel or ignore stale requests when the user keeps typing.
- Limit rendered suggestions, likely 5.
- Do not call Place Details while typing.
- Call Place Details only after the user taps a suggestion.
- Keep any repeated-query cache memory-only and scoped to the currently open search UI.
- Do not persist provider responses in local storage, AsyncStorage, or Convex.

Server-side controls:

- Require auth for autocomplete and resolve.
- Trim and length-limit the input server-side.
- Reject autocomplete input shorter than 3 characters.
- Cap autocomplete input length, for example 120 characters.
- Cap returned predictions, for example 5.
- Add rate limiter buckets in `services/convex/src/limiter.ts`.
- Rate limit separately for autocomplete and resolve.
- Key rate limits by authenticated user id.
- Consider a stricter unauthenticated rejection before any Google call.
- Never retry Google requests in a tight loop.
- Use short request timeouts if supported by the runtime.

Suggested starting rate limits:

- Autocomplete: enough for normal typing, but not abuse, for example 30 to 60 requests per minute per user.
- Resolve/details: lower, for example 10 to 20 requests per minute per user.

Google Cloud controls:

- Use a separate API key for server-side Places access.
- Restrict the key to only the required Places APIs.
- Do not reuse OAuth client credentials.
- Set Google Cloud quota limits for the Places APIs.
- Set billing budget alerts.
- Use separate keys/projects or quotas for development and production if practical.

## Convex Env

Add a required env var in `services/convex/src/convex.env.ts`, for example:

```ts
GOOGLE_PLACES_API_KEY: v.string(),
```

Then set it in each Convex deployment that should support location search.

The app should fail gracefully if the key is missing in local development. For example, the Convex action can throw a clear configuration error and the client can show a generic "Location search is unavailable" message. Do not expose the missing env var name or server details to end users.

## Mobile UI Plan

Add a location selector to the mobile Create page.

Likely component structure:

- `apps/mobile/src/features/post/create/components/location-field.tsx`
- `apps/mobile/src/features/post/create/components/location-search-sheet.tsx`
- Optional small row components under the same create components directory.

Place the location field near the caption field in `apps/mobile/src/app/(tabs)/create.tsx`, probably under `CaptionField` and above `ComposerError`, unless the surrounding UI suggests a better location.

The selected state should live in `apps/mobile/src/features/post/create/store.ts`:

- `location`
- `setLocation`
- `clearLocation`

When publishing, include `location` in `api.posts.mutations.create`.

UX requirements:

- The UI must be custom and styled like the rest of the app.
- Use native-feeling React Native primitives.
- Use existing color hooks and component patterns.
- Use `lucide-react-native` icons where appropriate, such as `MapPin`, `Search`, and `X`.
- Use a bottom sheet, modal, or focused full-screen search surface that feels appropriate on mobile.
- The search input should autofocus when the sheet opens if that works reliably.
- Search results should be tappable rows with title and subtitle.
- Show loading and empty states without adding explanatory marketing copy.
- Include required Google attribution in or near the suggestions UI.
- The selected location row should show the name first and the address/subtitle second if present.
- Provide a clear remove button.

Do not request device location permission for this v1. The user is searching manually. Adding "near me" or current-location bias can be a separate feature later.

## Web UI Plan

Add matching location tagging to the web Create page.

Likely component structure:

- `apps/web/src/features/post/create/components/location-field.tsx`
- `apps/web/src/features/post/create/components/location-search-dialog.tsx`
- Optional row/list components under the same create components directory.

Place the field near the caption in `apps/web/src/app/_authed/create.tsx`, probably below `CaptionField` and above `ComposerError`.

The selected state should live in `apps/web/src/features/post/create/store.ts`:

- `location`
- `setLocation`
- `clearLocation`

When publishing, include `location` in `api.posts.mutations.create`.

UX requirements:

- Build the UI with project components from `shared/ui-web` where they fit.
- Use a dialog, popover, drawer, or inline command-style surface that matches the existing Create page.
- Use `lucide-react` icons where appropriate.
- Keep it compact and utilitarian.
- Do not use the Google JavaScript widget.
- Do not put a Google browser key in the web app.
- Include required Google attribution in or near the suggestions UI.

## Create Store Behavior

Both mobile and web stores should follow the same behavior:

- Default `location` is `null` or `undefined`.
- Selecting a suggestion sets `location` to the resolved location.
- Removing the selected location clears it.
- Successful publish clears the draft location along with other composer state.
- Failed publish keeps the selected location so the user does not need to search again.
- Location does not make `canPost` true by itself.
- Existing media upload and caption behavior should not regress.

If any module currently maintains drafts outside React state, mirror the existing pattern only where needed. Mobile currently has caption draft helpers; location does not need a persistent draft unless the UI loses state during normal usage.

## Post Mutation Behavior

Update `services/convex/src/posts/mutations.ts`:

- Accept optional `location`.
- Validate location before insert.
- Insert `location` only when present.
- Keep permission checks and file validation intact.
- Keep `imagesIds: []` behavior unchanged.

Update `services/convex/src/posts/validation.ts`:

- Add `validatePostLocation`.
- Keep `validatePostInput` focused on caption/file content unless the implementation naturally extends it.
- Do not treat location as content for publish eligibility.

Update `services/convex/src/posts/read.ts` only if needed to expose `location` in UI post results. Since actual post item display is not part of this first pass, avoid broad feed UI changes unless the API currently strips unknown fields.

## Future Open-Map Behavior

This first implementation does not need to add click-to-open behavior on post items, but the data should support it.

When that later work happens, do not use Google Places API for viewing/opening the map. Use stored location data and platform URL handling:

- iOS mobile: open Apple Maps using a maps URL, for example `http://maps.apple.com/?ll=<lat>,<lng>&q=<name>`.
- Android mobile: open a generic `geo:` URI when coordinates exist, for example `geo:<lat>,<lng>?q=<lat>,<lng>(<name>)`, so Android can use the user's default maps app.
- Web: open Google Maps in a browser tab, preferably with place id when available, for example `https://www.google.com/maps/search/?api=1&query=<encoded name>&query_place_id=<placeId>`.

Do not force a native Google Maps app on iOS. Do not add a native map SDK just for opening a selected place.

## Error Handling

Client-facing errors should be simple:

- Search unavailable.
- Could not load locations.
- Could not select location.

Do not show raw Google error messages to users.

Server logs can include sanitized status/code information, but must not log:

- API keys.
- Full request headers.
- Excessive user query data.
- Full Google response bodies.

When Google returns no suggestions, show an empty state. Do not fall back to an owned dataset.

When resolve fails after a user taps a suggestion, keep the search UI open and let the user try another result.

## Testing And Validation

Required repo validation after code changes:

```sh
pnpm run lint
pnpm run typecheck
pnpm run format:fix
```

Also run Convex code generation or `convex dev` as needed if adding new public functions changes `services/convex/src/_generated/api.*`.

Manual checks:

- Mobile Create page opens with no selected location.
- Web Create page opens with no selected location.
- Typing fewer than 3 characters does not call Convex/Google.
- Typing 3 or more characters triggers debounced search.
- Search suggestions render with title and subtitle.
- Required Google attribution appears in the search UI.
- Selecting a suggestion resolves exactly once.
- Selected location displays in the composer.
- Removing selected location works.
- Publishing with media and location stores the location.
- Publishing with caption and location stores the location.
- Publishing with only location remains blocked.
- Failed publish keeps the selected location in the composer.
- API key is not present in mobile bundle code, web bundle code, or client env.
- Convex actions reject unauthenticated requests before calling Google.
- Rate limits are applied before calling Google.
- Network/Google failure shows a graceful client error.
- No rich/expensive Place Details fields are requested.

Cost verification checks:

- Confirm autocomplete uses one session token for a whole search session.
- Confirm resolve/details uses that same token after selection.
- Confirm no details calls happen during typing.
- Confirm the Details field mask is minimal.
- Confirm autocomplete and resolve quotas/budget alerts are configured in Google Cloud before production rollout.

## References

- Google Places API pricing: `https://developers.google.com/maps/billing-and-pricing/pricing`
- Google Places session pricing: `https://developers.google.com/maps/documentation/places/web-service/session-pricing`
- Google Place Details docs: `https://developers.google.com/maps/documentation/places/web-service/place-details`
- Google place data fields and SKU tiers: `https://developers.google.com/maps/documentation/places/web-service/data-fields`
- Google Places policies: `https://developers.google.com/maps/documentation/places/web-service/policies`
- Google Maps Platform terms: `https://cloud.google.com/maps-platform/terms/maps-service-terms`
