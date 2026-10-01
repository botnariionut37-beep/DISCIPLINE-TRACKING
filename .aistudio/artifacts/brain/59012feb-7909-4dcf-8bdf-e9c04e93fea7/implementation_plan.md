# Email-Verified Account Deletion & Complete Purge Plan

Implement a secure, multi-tier account deletion workflow that requires confirmation via the user's Gmail before permanently purging their data from Firebase Realtime Database (`leaderboard/{uid}`), Firestore, Firebase Auth, and local cache.

---

### User Review & Confirmed Requirements

> [!IMPORTANT]
> The following specifications were confirmed:
> - **Recipient**: Confirmation email notification is sent to the user's registered Gmail address.
> - **Confirmation Step**: Account deletion requires email verification (via a 6-digit code or direct confirmation link) before the purge executes.
> - **Purge Scope**: Complete deletion across all stores:
>   1. **Firebase Realtime Database**: `leaderboard/{uid}`
>   2. **Firebase Firestore**: `discipline_leaderboard/{uid}` and `discipline_user_data/{uid}`
>   3. **Firebase Auth**: User account removal / revocation
>   4. **Local Cache & Storage**: Active session, local community cache, and personal habit history

---

### 1. User Experience & Flow

1. **Initiate Deletion in Settings/Profile**:
   - In the Profile/Account settings modal, an "Account Actions" section provides a red button: *"Delete Account & Purge Data"*.
   - A warning dialog explains: *"To protect your account, we will send a 6-digit confirmation code and a verification link to your Gmail."*
2. **Gmail Notification & Verification Code**:
   - The system generates a cryptographic 6-digit verification code with an expiration timer (15 minutes).
   - An Express backend route `/api/send-deletion-verification` dispatches the email notification to the user's Gmail.
   - For rapid preview testing, a high-fidelity in-app notification prompt appears with an *"Open in Gmail / Preview Email"* drawer displaying the formatted deletion email, the 6-digit code, and a one-click confirmation link.
3. **Confirmation & Real-Time Purge**:
   - The user enters the 6-digit code or clicks the email link.
   - Upon confirmation, a background sequence executes:
     - `remove(ref(rtdb, 'leaderboard/' + uid))` removes the competitor from the live Realtime Database leaderboard instantly. All open screens see them disappear immediately via `onValue`.
     - `deleteDoc(doc(db, 'discipline_leaderboard', uid))` and `deleteDoc(doc(db, 'discipline_user_data', uid))` remove all Firestore records.
     - `deleteUser(auth.currentUser)` removes the authentication credentials.
     - Local storage keys (`discipline_community_leaderboard`, `discipline_user_auth`, habit checks) are wiped.
   - A farewell screen confirms: *"Your account and leaderboard records have been permanently erased."*

---

### 2. Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                      User Interface                    │
│                                                        │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │ DeleteAccountModal    │   │  LeaderboardTable    │  │
│  │ (Code Input & Status) │   │  (Instant Real-Time  │  │
│  │                       │   │   Removal via RTDB)  │  │
│  └───────────┬───────────┘   └──────────▲───────────┘  │
└──────────────┼──────────────────────────┼──────────────┘
               │                          │
               ▼                          │
┌─────────────────────────────────────────┴──────────────┐
│                  Deletion Controller                   │
│                                                        │
│  1. RTDB: remove(ref(rtdb, 'leaderboard/' + uid))      │
│  2. Firestore: deleteDoc(leaderboard & user_data)      │
│  3. Auth: deleteUser(auth.currentUser)                 │
│  4. Local: localStorage.clearKeys()                    │
└────────────────────────────────────────────────────────┘
```

---

### 3. Implementation Steps

1. **Deletion Verification Service (`src/services/accountDeletion.ts`)**:
   - Manage pending deletion tokens and 6-digit codes.
   - Method `requestDeletionCode(email, uid)` to generate and store code with timestamp.
   - Method `verifyDeletionCode(uid, code)` to validate the input.
   - Method `executeCompleteAccountPurge(uid)` to run the atomic deletion sequence across RTDB, Firestore, Auth, and local cache.
2. **Firebase Service Enhancements (`src/services/firebase.ts`)**:
   - Export `purgeUserEntirely(uid)` combining `removeUserFromRealtimeLeaderboard`, `deleteFirestoreLeaderboardEntry`, and Firebase Auth `deleteUser`.
3. **Interactive Delete Account Modal (`src/components/DeleteAccountModal.tsx`)**:
   - Step 1: Warning, explanation, and "Send Confirmation Code to Gmail" button.
   - Step 2: 6-digit code input field, email delivery confirmation badge, resend button, and "Permanently Delete Everything" button.
   - Step 3: Success state with logout and redirect.
4. **Settings & Profile Integration**:
   - Mount "Delete Account" button in `LeaderboardSettingsModal.tsx` and user profile banner.
