# LineGuard development changelog

## Shameboard and trust model
- Replaced the old mixed pending/verified report list with a repeat-findings board.
- A public board entry requires at least two distinct reports marked guilty by staff and linked by a staff-assigned opaque subject reference.
- The subject reference is stored in private report metadata; the public board receives only a hashed board ID, pseudonymous label, count and report locations.
- Real names and photos remain withheld. Community votes never create a finding or a Shameboard entry.
- Added a review request for every staff-reviewed finding, including single findings outside the repeat-offender board.
- Appeal claimants may optionally provide contact details in a staff-only record. Staff must explicitly verify claimant identity before the backend allows an appeal decision.

## Firebase and privacy
- Moved report creation, voting, staff decisions, appeals, community posting/likes and reputation updates to callable Cloud Functions.
- Firestore rules deny direct client writes to sensitive records and reputation counters.
- Moved reporter UIDs and vote/like markers out of public documents; added a one-time migration script for existing data.
- Removed UPI collection because the old prototype could not verify payments.
- Restricted evidence uploads to the signed-in user's own storage folder and set a 50 MB limit.

## App experience
- Kept guest browsing for public pending video reports.
- Added per-account vote lookup so a user cannot vote again after reopening a Reel.
- Kept the vertical `expo-video` Reels implementation and existing purple/pink visual theme.
- Marked the standalone HTML prototype as a local demo; it still does not sync with Firebase.

## 2026-11-08 — security and evidence-review pass
- Moved initial profile creation to the trusted `ensureProfile` callable function; Firestore no longer allows clients to create or mutate profile documents.
- Community post names now come from the server-created profile instead of a caller-supplied display name; topic values are allowlisted.
- Exact GPS coordinates are now stored in `privateReports`, not public report documents. The migration script also moves existing public coordinates into private records and removes them from public documents.
- Added in-app video previews when reporters review a clip and native video controls for staff evidence review.
- Tightened evidence upload rules to 25 MB and an explicit allowlist of image/video MIME types.
- Google OAuth setup now distinguishes Web and Android client IDs and stays disabled until both are configured.
- Kept the HTML file as a clearly documented local demo; it is not yet connected to the shared Firebase backend.
