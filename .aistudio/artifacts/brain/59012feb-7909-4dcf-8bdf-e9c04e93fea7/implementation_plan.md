# Implementation Plan: Auth Email Verification, Admin-Only Wipe Week & Dual Leaderboards (All-Time vs Weekly)

## User Requirements
1. **Sign-up Flow with Password Creation & Email Verification Link**:
   - Require users to create a secure password on registration.
   - Send/generate a verification link sent via email (Supabase confirmation email if configured, with an interactive in-app verification link modal dialog fallback).
   - Require email verification before logging in or completing registration.
2. **Restrict "Wipe Week" Button to Admins Only**:
   - Delete/hide the "Wipe Week" button for all regular users. Only show it if `isAdmin` is true.
3. **Dual Leaderboards: All-Time vs Weekly**:
   - Add a tab toggle between **All-Time** and **Weekly** in the leaderboard view.
   - **All-Time Leaderboard**: Ranked primarily by **Rank Tier** (Rank Index), then qualifying weeks, then all-time execution.
   - **Weekly Leaderboard**: Ranked primarily by **Discipline Rate %** for the active week, then completed check counts, then tier.

---

## User Review Required
> [!IMPORTANT]
> - Regular users will no longer see or have access to the "Wipe Week" button; only verified admins can wipe week check marks.
> - New account signups will require email link verification. If using custom Supabase, it triggers Supabase confirmation; otherwise, an interactive email dispatch preview & one-click verification link will be shown in the UI.

---

## Proposed Changes

### 1. Hide "Wipe Week" Button for Non-Admins (`src/App.tsx`)
- In `src/App.tsx`, wrap the "Wipe Week" button in an `{isAdmin && ...}` guard so regular users cannot see or trigger wiping habit data.

### 2. Email Verification Flow (`src/services/supabase.ts`, `src/context/AuthContext.tsx`, `src/components/AuthModal.tsx`)
- Update `StoredAccount` in `supabase.ts` to include `emailVerified: boolean` and `verificationToken: string`.
- Update `appSignUp` to require email verification:
  - If Supabase is connected, Supabase handles email verification links via its configured SMTP.
  - For universal accounts, dispatch/generate a simulated email verification link and store the verification token.
  - Add `appVerifyEmail(token: string)` and email verification check during `appSignIn` preventing unverified users from logging in until verified.
- Update `AuthModal.tsx` to display the "Verify your email" state with:
  - Clear notification that a verification email with a link was sent.
  - Interactive "Simulate clicking verification link" button / input to verify immediately or open link.
  - Password strength and confirmation check during registration.

### 3. Dual Leaderboards: All-Time vs Weekly (`src/types/leaderboard.ts`, `src/components/LeaderboardTable.tsx`, `src/components/LeaderboardPodium.tsx`)
- Add `leaderboardMode: 'all-time' | 'weekly'` state to `LeaderboardTable.tsx`.
- Implement distinct sorting logic:
  - **All-Time Mode**:
    1. `rankIndex` (Rank Tier: Elite Max > Elite 4 > ... > Bronz)
    2. `qualifyingWeeks` (Seniority / consistency)
    3. `disciplineScore`
  - **Weekly Mode**:
    1. `disciplineScore` (Weekly rate %: 100% > 98% > ...)
    2. `weeklyCompletedChecks` (Volume of completed tasks)
    3. `rankIndex`
- Add a segmented toggle control in the Leaderboard header:
  - **All-Time (By Rank)**
  - **Weekly (By Discipline Rate)**
- Update the Podium and Table column highlights to reflect the active ranking criterion (e.g., highlighting Rank in All-Time and Discipline % in Weekly).

---

## Verification Plan
1. **Compilation & Linting**:
   - Run `lint_applet` and `compile_applet` to confirm zero TypeScript or build errors.
2. **Wipe Week Button**:
   - Confirm non-admin accounts do not see the "Wipe Week" button.
   - Confirm admin accounts still have access to it.
3. **Email Verification**:
   - Register a new warrior account with email and password.
   - Verify that the user is prompted to verify their email before access is granted.
   - Click the verification link to confirm and successfully sign in.
4. **Leaderboard Switching**:
   - Toggle between **All-Time** and **Weekly**.
   - Verify that All-Time orders warriors strictly by Rank Tier and Qualifying Weeks.
   - Verify that Weekly orders warriors strictly by Discipline Rate %.
