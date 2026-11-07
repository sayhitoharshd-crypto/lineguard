# LineGuard development status — 8 November 2026

## Implemented in this archive
- Expo SDK 54 app with NGL-inspired purple/pink interface.
- Guest browsing of public pending video reports in the vertical Reels feed.
- Firebase anonymous sign-in and Google sign-in scaffolding.
- Server-side profile initialization, reporting, voting, moderation, appeals, community posts/likes and reputation changes via callable Cloud Functions.
- One vote per Firebase account per report, enforced transactionally by the backend.
- Staff-reviewed repeat-finding Shameboard using an opaque internal subject reference; entries require at least two distinct staff-reviewed guilty reports. Names/photos are not published.
- Appeal requests are treated as unverified claims; staff must attest to identity verification before resolving an appeal.
- Video preview in report submission and video evidence playback controls in staff review.
- Exact GPS coordinates stored in private report records rather than public report documents.
- Storage uploads restricted to uploader-owned folders, 25 MB and allowlisted MIME types.

## Still required before public release
1. Install project and Functions dependencies (`npm install` in app root and `functions/`).
2. Back up the existing Firebase project and run the updated migration script with trusted Admin credentials. The migration removes old public reporter/UPI/voter/coordinate fields and moves coordinates into `privateReports`.
3. Deploy Cloud Functions, Firestore rules/indexes and Storage rules to `lineguard-68bb0`.
4. Configure Google Web and Android OAuth client IDs and verify Android package/SHA-1 fingerprints.
5. Test callable functions, Firestore/Storage rules, auth, Reels playback, upload size/type handling, voting, staff review and appeal decisions against Firebase Emulator Suite or a non-production Firebase project.
6. Complete Android development-build / APK testing on physical devices and verify media codecs/network behavior.
7. The HTML file remains a standalone local demo with sample data. It is not Firebase-integrated and does not sync with the mobile app.
8. Add operational protections before launch: abuse/rate limiting, report-content moderation, deletion/retention policy, privacy notice, legal review and budget alerts.

## Checks performed in this pass
- JavaScript/JSX parse: 18 files passed using the installed TypeScript parser in JSX mode.
- Node syntax: Cloud Functions and migration script passed `node --check`.
- HTML inline JavaScript: extracted script passed `node --check`.
- JSON configuration parse: passed.
- Full dependency install, Expo bundle/build, Firebase deployment, Firestore rules emulator tests and physical-device testing: not performed. Firebase CLI is not installed in the execution environment; Expo dependency installation was unavailable/timed out.

This is a development archive, not a production-ready release.
