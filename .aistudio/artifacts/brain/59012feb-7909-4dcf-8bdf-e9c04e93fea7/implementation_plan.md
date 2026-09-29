# Implementation Plan: Official Firebase Google Authentication (accounts.google.com)

## Context & Goal
The user specified:
> *"no, i want it when I clisk on google to send me to an other site where i chose my account, just like firebase does"*

The app already has:
- `firebase` package installed (`^12.19.0`)
- `firebase-applet-config.json` configured with:
  - `projectId`: `mystical-citron-hjhcx`
  - `authDomain`: `mystical-citron-hjhcx.firebaseapp.com`
  - `apiKey`: `AIzaSyBlutSks75WFFTz207ZSGQCEFiRcTqK7L8`
  - `oAuthClientId`: `1033647696427-r4resbdq78pe0dqsafd76qi5kbo5dm66.apps.googleusercontent.com`
  - `firestoreDatabaseId`: `ai-studio-disciplinetracke-59012feb-7909-4dcf-8bdf-e9c04e93fea7`

When users click **"Continue with Google / Gmail"**, instead of rendering an in-app simulated screen, the app will open the official Google OAuth flow (`signInWithPopup` via Firebase Auth to `accounts.google.com`), directing them to select their real Google account on Google's external site.

---

## Proposed Changes

### 1. Create `src/services/firebase.ts`
- Initialize the Firebase App using `firebase-applet-config.json`.
- Export Firebase `auth`, `GoogleAuthProvider`, and `db` (Firestore).
- Export `signInWithFirebaseGooglePopup()`:
  - Configures `GoogleAuthProvider` with `prompt: 'select_account'` so it always opens Google's account selection page.
  - Calls `signInWithPopup(auth, provider)`.
  - Maps the resulting Firebase `User` to `AppAuthUser` (with `provider: 'google'`, `emailVerified: true`, `isAdmin`, etc.).
  - Saves the session into active universal session for seamless continuity across the app.

### 2. Update `src/context/AuthContext.tsx`
- In `signInWithGoogle`:
  - Invoke `signInWithFirebaseGooglePopup()`.
  - Fall back gracefully to the direct prompt or redirect if popups are blocked by browser settings.
  - Set the authenticated user into React state.

### 3. Update `src/components/AuthModal.tsx`
- When the user clicks **"Continue with Google / Gmail"**:
  - Run `handleGoogleSignIn()`, which triggers the real Firebase Google OAuth popup (`accounts.google.com`).
  - Automatically close the modal upon successful account selection on Google.
  - If a popup is blocked by the browser or user cancels, show a clear message with a "Try again" or fallback option.

---

## Verification Plan
1. **Compilation & Linting**:
   - Run `lint_applet` and `compile_applet` to confirm clean builds.
2. **Behavioral Test**:
   - Click "Continue with Google / Gmail".
   - Confirm Firebase `signInWithPopup(auth, provider)` triggers Google's external authentication window (`accounts.google.com` / `authDomain`).
   - Confirm user is logged in upon completion.
