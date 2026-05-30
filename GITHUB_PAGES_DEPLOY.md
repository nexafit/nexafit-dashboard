# NexaFit Owner Dashboard — GitHub Pages Deploy

This project is prepared for free static deployment with GitHub Pages.

## What is included

- `owner-dashboard/` — React + Vite + Tailwind owner dashboard.
- `.github/workflows/deploy-dashboard.yml` — automatic GitHub Pages deployment.
- `owner-dashboard/vite.config.ts` — dynamic GitHub Pages `base` path support.
- `.gitignore` — excludes `local.properties`, `.env.local`, build outputs, and keystore files.

## 1. Create GitHub repository

Create a new public GitHub repository, for example:

```text
nexafit-dashboard
```

GitHub Pages URL will be:

```text
https://YOUR_USERNAME.github.io/nexafit-dashboard/
```

## 2. Push the project

From the project root:

```bash
git init
git add .
git commit -m "Add NexaFit owner dashboard GitHub Pages deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexafit-dashboard.git
git push -u origin main
```

## 3. Enable GitHub Pages

Open your repository:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

## 4. Add Firebase web config as GitHub secrets

Open:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Get the values from:

```text
Firebase Console → Project settings → Your apps → Add app → Web
```

## 5. Add GitHub Pages domain to Firebase Auth

Open:

```text
Firebase Console → Authentication → Settings → Authorized domains
```

Add:

```text
YOUR_USERNAME.github.io
```

Do not include `https://`.

## 6. Deploy

Push to `main`, then open:

```text
GitHub repository → Actions
```

Wait for `Deploy NexaFit Owner Dashboard to GitHub Pages` to finish.

Your dashboard will be live at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

## 7. Owner access requirement

The logged-in account must have this Firestore field:

```text
users/{uid}.role = "owner"
```

Otherwise the dashboard will show access denied.

## Notes

- Do not commit `owner-dashboard/.env.local`.
- Do not commit Android signing keystores.
- The dashboard is static hosting only. It reads/writes Firebase directly using Firebase Auth and Firestore Rules.
- This setup does not use Firebase Cloud Functions and does not require Firebase Blaze.

## Responsive dashboard check

This version includes responsive layouts for:

- 320px+ phone screens
- standard Android/iPhone widths
- tablets
- laptops
- desktop monitors

After GitHub Pages deploy, test these widths in your browser dev tools:

```text
360 x 800
390 x 844
768 x 1024
1024 x 768
1366 x 768
1920 x 1080
```

Expected behavior:

- User Management changes from a wide table to mobile cards on small screens.
- Recent Scan Logs changes from a table to mobile cards on small screens.
- Top bar wraps cleanly and does not overflow.
- Forms and buttons stay touch-friendly.
- No horizontal page overflow except intentional chart/table scroll areas.
