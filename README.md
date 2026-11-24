# 🎪 Spectrum Tracker — Inter-School Fest Live Event & Leaderboard Tracker

A lightweight, mobile-first, real-time event schedule, live stage tracker, and championship leaderboard built with clean **HTML5, CSS3, and Vanilla JavaScript (ES Modules)**, backed by **Firebase Firestore REST API** and optimized for instantaneous loading on mobile networks (Jio 5G / Airtel) and continuous deployment on **GitHub + Netlify**.

---

## ⚡ Key Highlights & Architecture

- **No Heavy Firebase Web SDKs:** Uses a lightweight Firestore REST API v1 wrapper using native `fetch()` and `AbortController` (strict 5s timeout) to avoid mobile connection hangs caused by WebChannel streams.
- **0ms Instant First Paint:** Renders the complete event schedule and leaderboard instantaneously from `localStorage` cached state before any network request completes.
- **Safe Cloud Sync:** Schedule metadata updates strictly preserve live round progress, active status, and declared winners.
- **Role-Based Organizer Mode:** Master Admin PIN (full event, school, point rule CRUD) + Category Coordinator PINs (category-scoped progress, status, timing, and winner declarations).
- **Dynamic Leaderboard & Winners Podium:** Automated points calculation (Gold = 10, Silver = 7, Bronze = 5 + bonus/penalties) and 1-click Winners CSV export.
- **4 Built-in Themes:** Midnight Stage (cyber dark), Crimson Spotlight (warm dark), Daylight / Projector Light (high-contrast light), and Emerald Arena (sports green).

---

## 🚀 3 Steps to Deploy (GitHub + Netlify)

### Step 1: Initialize Git and Push to GitHub
Open your terminal in the `Spectrum_Tracker` project root:
```bash
git init
git add .
git commit -m "Initial commit: Spectrum Tracker live fest app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Connect to Netlify
1. Log in to [Netlify](https://app.netlify.com).
2. Click **"Add new site"** → **"Import an existing project"** → Choose **GitHub**.
3. Select your repository `YOUR_REPO_NAME`.
4. Netlify will automatically detect the settings from `netlify.toml`:
   - **Publish directory:** `.` (current root)
   - **Build command:** *(leave empty)*
5. Click **"Deploy site"**. Your site is now live! Every new `git push` to `main` will automatically build and publish instantly.

### Step 3: CRITICAL Netlify Setting (Make Site Public)
> ⚠️ **Important:** Netlify sometimes defaults imported projects to "Private / Team Login Required".
> 1. In your Netlify Site Dashboard, navigate to **Site configuration** → **Access management** → **Visitor access**.
> 2. Ensure it is set to **Public** (no password/login required) so visiting schools, students, and judges can access the tracker without a Netlify login wall.

---

## ☁️ Firebase Firestore Setup (5 Minutes)

1. Open [Firebase Console](https://console.firebase.google.com/) and click **"Add project"** (e.g., `spectrum-tracker-2026`).
2. Go to **Build** → **Firestore Database** → Click **"Create database"**.
3. Select any nearby region (e.g., `asia-south1` for Mumbai, India).
4. Go to the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /fest_events/{eventId} { allow read, write: if true; }
       match /fest_schools/{schoolId} { allow read, write: if true; }
       match /fest_categories/{categoryId} { allow read, write: if true; }
       match /fest_settings/{settingId} { allow read, write: if true; }
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
5. Go to **Project Settings** (gear icon) → copy your **Project ID** (e.g., `spectrum-fest-12345`).
6. Open `js/firebase-config.js` and set:
   ```javascript
   export const FIREBASE_CONFIG = {
     projectId: "YOUR_PROJECT_ID_HERE", // Paste your project ID here
     enabled: true
   };
   ```
   *Note: If left empty or disabled, the application automatically runs in standalone offline/local demo mode with full functionality using `localStorage`!*

---

## 🔒 Default Organizer PINs
- **Master Admin PIN:** `2026` (Full access: Add/Delete events, schools, point rules, cloud sync & reset)
- **Tech Coordinator PIN:** `1001` (Edit Tech events only)
- **Cultural Coordinator PIN:** `1002` (Edit Cultural events only)
- **Literary Coordinator PIN:** `1003` (Edit Literary events only)
- **Gaming Coordinator PIN:** `1004` (Edit Gaming events only)

*(All PINs and categories can be customized in `js/schema.js` or via the Master Admin settings modal).*
