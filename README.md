# LineGuard — Expo app and local web prototype

LineGuard is a civic incident-reporting prototype with a Reels-style video feed, anonymous/Google sign-in, community discussion, staff review, appeals and a repeat-findings Shameboard. The existing purple/pink visual direction is retained.

## Run the Android app

```bash
npm install
npx expo install --fix
npx expo start
```

Use Expo Go for basic development, but video playback and native auth behavior should be tested in a development build / APK on a physical Android device.

## Firebase setup

The app is configured for the Firebase project `lineguard-68bb0` in `asia-south1`. Initial user profiles are now created by the `ensureProfile` callable function; direct client profile creation is denied.

1. In Firebase Console, enable **Anonymous** and (if needed) **Google** sign-in.
2. Create Firestore in `asia-south1` and enable Firebase Storage.
3. Install Firebase CLI and authenticate: `npm install -g firebase-tools` then `firebase login`.
4. From this project folder, install backend dependencies: `cd functions && npm install && cd ..`.
5. Deploy trusted backend functions and security rules:

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

Cloud Functions deployment requires a Firebase project on the Blaze billing plan. Do not enable public launch until billing limits, monitoring and abuse protections are configured.

### Google login

Google login is optional. Set both `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_ANDROID_CLIENT_ID` in `src/firebase/AuthContext.js` using OAuth client IDs created for the same Google Cloud project (Web and Android application/package `com.lineguard.app` with the correct SHA-1 fingerprints). Do not paste a client secret into the app. Google sign-in remains disabled until both IDs are configured. Anonymous Firebase sign-in is available.

### Staff access

After a user signs in, copy their Firebase Auth UID. In Firestore, create a document in the `staff` collection with that UID as its document ID. Add a harmless field such as `role: "moderator"`. Staff membership must be managed only by trusted administrators in the Firebase console; client writes are denied.

## Shameboard and due process

- A report enters the feed as **pending**. Community votes are opinions only and do not change its finding status.
- A staff member reviews the evidence and may mark the report guilty or dismiss it.
- During staff review, the moderator may assign a non-identifying internal subject reference. Reuse the same opaque reference only when staff have independently established that two reports concern the same subject. Never use a person's name, phone number, address or vehicle plate as this key.
- The Shameboard shows a pseudonymous repeat-finding entry only after at least two reports with the same reference are staff-reviewed as guilty.
- Names and photos are intentionally withheld. This build does not implement a verified identity-publication workflow.
- A person can request review of a finding. The claim is explicitly unverified until staff check the claimant's identity outside the app. The claimant may optionally provide an email or phone number for follow-up; staff-only appeal records hold that contact information. Staff cannot decide the appeal in the app until they mark that identity check complete. An approved appeal removes the report from the repeat count.
- A staff decision in this prototype is an internal platform moderation outcome, not a court judgment or criminal conviction.

## Important migration for existing Firestore data

Older prototype versions stored `reporter`, `reporterUpi`, `confirmedBy` and `votedBy` directly on publicly readable report documents, and community posts stored author UIDs and `likedBy` UID arrays. The new rules prevent future client writes but cannot redact old documents by themselves. Before publishing the new rules to an existing populated database, install the backend dependencies (`cd functions && npm install && cd ..`) and run this one-time migration from a trusted environment:

```bash
gcloud auth application-default login
node scripts/migrate-private-report-fields.js
```

Review the migration output and verify the affected documents in Firestore before public launch. Back up the database first.

## Web prototype

`../lineguard-web.html` is a standalone visual/demo prototype with browser-side JavaScript sample data. Its title now clearly marks it as a local demo; it is not connected to Firebase and does not sync with the Expo app. Changes in the demo are not persisted as a shared database. Connecting it safely requires a separate web auth/configuration pass and should use the same callable backend functions, not direct privileged Firestore writes.

## Checks and limitations

- The Expo app uses `expo-video` (`~3.0.14`) for vertical Reels playback, local report previews and staff evidence review.
- Guest users can browse public pending report videos. Voting, reporting, posting and appeals require a signed-in Firebase account.
- Sensitive mutations (profile creation, votes, report creation, staff decisions, appeals, community post/likes and reputation changes) are routed through callable Cloud Functions. The Firestore rules deny direct client mutations to those records. Community post display names are taken from the server-created profile, not a caller-supplied name; profiles default to “Anonymous” even when Google sign-in is used.
- Evidence media remains publicly readable to support guest Reels and is limited by Storage rules to 25 MB and common image/video MIME types. Do not upload footage containing private information or identifiable people without a valid basis; consider face/plate blurring and a consent/legal review process before launch. Exact GPS coordinates are stored in private report records rather than public report documents.
- UPI collection and apology-payment features have been removed; the earlier prototype could not verify transfers. The one-time migration removes any legacy public UPI field rather than retaining it.
- This archive has not been deployed to Firebase or tested on a physical Android device. Cloud Functions must be deployed before the new client mutations work. Native video playback, OAuth, rules and appeals need real-device and emulator testing.

### Security follow-up in this archive

The latest pass denies all direct client writes to `/users/{uid}` and creates the initial profile through `ensureProfile`. Deploy Cloud Functions and Firestore rules together before running the app; otherwise first sign-in will fail to create a profile. The public report document no longer stores exact GPS coordinates. If your Firestore project already contains old reports, run the updated migration script before treating those legacy documents as safe for public reads.

### Verification scope

The source archive was checked with a JavaScript/JSX parser and Node syntax checks. Dependencies were not installed, the Expo Android bundle was not generated, Firestore rules were not deployed or emulator-tested, and no physical device or live Firebase project was available during this pass. Treat this as a development archive, not a release build.
