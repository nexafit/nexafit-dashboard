# NexaFit Owner Dashboard

React + Vite + Tailwind web dashboard for managing the NexaFit Firebase Spark/free architecture.

## Features

- Google Sign-In owner login.
- Owner-only access check using `users/{uid}.role == "owner"`.
- User management:
  - search users
  - filter owner / premium / free / adblock users
  - give/remove Premium
  - add rewarded tokens
  - reset tokens to the configured welcome token amount
  - promote users to owner
- Remote app config editor for `app_config/main`:
  - interstitial full-screen ad unit ID
  - rewarded full-screen ad unit ID
  - full-screen ads enabled flag
  - after-save interstitial probability
  - random interstitial probability
  - welcome free tokens
  - OpenRouter model
  - emergency kill switch
- Daily scan activity from `daily_stats`.
- Recent scan log viewer from `scan_logs`.

## Setup

1. Open Firebase Console → Project settings → Your apps.
2. Add a Web App for the same Firebase project.
3. Copy the Web App config values.
4. Copy `.env.example` to `.env.local`.
5. Fill the `VITE_FIREBASE_*` values.

Example:

```env
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=nexafit-7ccd4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexafit-7ccd4
VITE_FIREBASE_STORAGE_BUCKET=nexafit-7ccd4.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
```

## Run locally

```bash
cd owner-dashboard
npm install
npm run dev
```

Open the local URL shown by Vite.

## First owner access

The dashboard only opens for a user whose Firestore profile contains:

```text
users/{uid}.role = "owner"
```

For the first owner, set this manually in Firebase Console. After that, the dashboard can promote other users.

## Build

```bash
npm run build
```

The output is generated in:

```text
owner-dashboard/dist
```

## Firebase Hosting deploy

From the project root:

```bash
firebase login
firebase use nexafit-7ccd4
firebase deploy --only hosting
```

The root `firebase.json` already points hosting to `owner-dashboard/dist`.

## Required Firestore collections

The Android app and dashboard use these collections:

```text
users/{uid}
app_config/main
daily_stats/{yyyyMMdd}
scan_logs/{scanId}
premium_purchase_receipts/{receiptId}
```

## Responsive UI

The dashboard is responsive:

- Mobile phones use stacked management cards for users and scan logs.
- Tablets and desktop screens use wider grid/table layouts.
- The top bar, auth cards, forms, buttons, and toast notifications are optimized for narrow screens.
- The logo path uses the Vite base URL so it works on GitHub Pages subfolder URLs.
