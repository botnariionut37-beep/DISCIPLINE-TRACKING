# Implementation Plan: Google Account Selector UI & Password Requirements for Google/Gmail

## Overview & User Request
1. **Google/Gmail Interface**:
   - The user provided a screenshot of the official Google dark account picker (`Alege un cont` / `Choose an account`) showing:
     - Header: Google logo, app connection notice (`Conectează-te cu Google`, `Accesează Discipline Tracker`).
     - Accounts list: Profile avatars, user full name, and email (e.g., `Ion Botnari - botnariionut37@gmail.com`, `ibotnari589@gmail.com`, etc.).
     - Action to "Use another account" (`Folosește alt cont`).
     - Clean Google dark-mode container styling with footer links (`Ajutor`, `Confidențialitate`, `Termeni și condiții`).
2. **Password Requirements for Gmail/Google**:
   - When a user chooses or enters their Google/Gmail account, require their password with security rules (at least 6 characters simple requirement).
   - If they select an existing/previously signed-in account or type an account, prompt for password verification.
   - For new accounts via Google/Gmail, enforce password creation and email verification.

---

## User Review Required
> [!IMPORTANT]
> - Clicking **"Continue with Google / Gmail"** will open the Google Account Chooser screen matching the design in the user's screenshot.
> - Users can pick from recent/preset Google accounts or click **"Use another account"** to enter an email.
> - To satisfy the user's explicit requirement (**"add password requirements for gmail/google"**), selecting or entering a Google account will prompt for their password (minimum 6 characters) before finalizing login.

---

## Proposed Changes

### 1. Update `src/services/supabase.ts` & `src/context/AuthContext.tsx`
- Update `appSignInWithGoogle` or add support for Google/Gmail password authentication:
  - Allow `appSignInWithGoogle(email, password, displayName)` to check password and enforce the minimum 6-character requirement.
  - Store known Google accounts in localStorage (`discipline_google_accounts_cache`) so previously used accounts appear in the account chooser just like on Google's account picker.
  - Prepopulate default Google warrior accounts for convenience (including the user's admin accounts `botnariionut37@gmail.com` and `ibotnari589@gmail.com`).

### 2. Design the Google Account Chooser in `src/components/AuthModal.tsx`
- When the user clicks **"Continue with Google / Gmail"**, transition to the dedicated `google_account_picker` interface:
  - Top bar with Google G icon and "Sign in with Google" / "Access Discipline Tracker".
  - Large title: **"Choose an account"** (or localized bilingual indicator) with subtitle **"to continue to Discipline Tracker"**.
  - List of Google accounts with circular avatar, user name, email, and hover selection states.
  - **"Use another account"** button with a user icon to type any Google/Gmail address.
  - Once an account is selected (or entered), present a Google-styled password screen with:
    - User chip showing the selected email and avatar.
    - Password input (minimum 6 characters enforced).
    - Password visibility toggle or clear error feedback.
  - Footer bar with language indicator (`English / Română`), and clean Help / Privacy / Terms links matching Google's UI in the screenshot.

---

## Verification Plan
1. **Google Account Picker UI**:
   - Click "Continue with Google / Gmail".
   - Confirm it opens the Google dark account chooser modal matching the screenshot.
2. **Password Requirement on Google Sign-In**:
   - Choose an account or use "Use another account".
   - Attempt to proceed with password shorter than 6 characters; verify that validation requires at least 6 characters.
   - Enter valid credentials; verify seamless login with Google provider badge and user session.
3. **Build & Lint Verification**:
   - Run `lint_applet` and `compile_applet` to confirm error-free execution.
