# Firebase Authentication & Real-Time Firestore Leaderboard Integration

Integrate Google/Gmail authentication using Firebase Auth and enable real-time Firestore synchronization for `discipline_leaderboard` and personal warrior habit data using the user's configured Firebase project (`discipline-90780`).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions were confirmed during clarification:
>
> - **Google / Gmail Authentication Placement**: An official "Continue with Google" / "Log in with Gmail" button will be placed inside the warrior authentication modal, prominently positioned above email/password fields with clean separator typography.
> - **Leaderboard Data Migration & Sync**: Existing local community records will be gracefully migrated and synced to the Firestore `discipline_leaderboard` collection on initial connection, ensuring zero historical rank progress is lost.
> - **Habit Progress Synchronization**: In addition to public leaderboard entries, personal habit categories, check-ins, and user settings will be synchronized in real-time under a dedicated user document (`discipline_user_data/{userId}`) in Firestore.

---

### 1. Overview & Core Concept

- **What It Does**: Enables users to sign in with their Google/Gmail accounts using Firebase Auth popup flow, automatically populating their avatar, display name, and verified email. In addition, all leaderboard scores, rank tiers, and personal habit completions are read and written to Cloud Firestore in real time using reactive listeners (`onSnapshot`).
- **Target Audience / Persona**: Warriors and habit builders tracking daily discipline, seeking real-time competition on the community leaderboard with cross-device synchronization and effortless Gmail authentication.
- **Key Value**: Instant, zero-friction authentication; real-time competitive presence without manual refreshes; persistent cross-device progress.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Authentication Flow*: User clicks "Sign In" in the navigation bar -> Modal displays a prominent "Continue with Google" button alongside existing credentials -> Clicking opens the Firebase Google popup -> On success, user profile (Google photo, display name, email) is immediately synced, and the modal closes with a congratulatory toast.
  2. *Real-Time Leaderboard Flow*: The leaderboard table and podium subscribe to Firestore's `discipline_leaderboard` collection in real time. Whenever any user logs progress or changes rank, the leaderboard updates instantly with zero page reloads.
  3. *Snapshot Publishing Flow*: When a warrior marks a daily check-in or rank changes, a debounced snapshot is written to `discipline_leaderboard/{userId}`, immediately propagating to all peers.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark Stoic Warrior theme (`#0C0E12` deep neutral canvas, emerald `#10B981` discipline accent, slate structural borders).
  - *Google Sign-In Button*: Crisp white/neutral elevated surface with authentic Google quad-color 'G' icon, clear font hierarchy (`font-sans font-semibold`), 44px touch target, and smooth active press state (`active:scale-[0.99]`).
  - *Zero-Pill Compliance*: Metadata (ranks, scores, percentages) displayed as clean unboxed typographic elements with `·` separators and tabular figures (`tabular-nums`).
- **Interactive Feedback & Motion**:
  - Loading spinner indicator on Google auth initiation.
  - Animated live indicators on leaderboard entries when updated via Firestore snapshot.
  - Graceful offline fallback to local storage cache if network drops.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Firebase Auth Popup Flow (`signInWithPopup`)**
  - *Chosen Approach*: `signInWithPopup(auth, googleProvider)` with graceful error catching.
  - *Why*: Provides the best UX inside modern web applications and avoids redirect URL mismatches that can break inside iframe or sandbox environments.
  - *Alternatives Considered*: `signInWithRedirect` (often blocked or loses state in sandboxed environments).
- **Decision 2: Firestore Document ID Scheme**
  - *Chosen Approach*: Document ID in `discipline_leaderboard` matches the user's Auth `uid` (`discipline_leaderboard/${userId}`).
  - *Why*: Guarantees idempotency (one entry per warrior), prevents duplicate entries, and enables strict attribute-based security rules where `request.auth.uid == userId`.
- **Decision 3: Dual-Layer Persistence (Firestore Realtime + Local Fallback)**
  - *Chosen Approach*: Primary reads/writes go through Firestore reactive subscriptions (`onSnapshot`), with local storage maintained as an immediate synchronous cache.
  - *Why*: Ensures instant UI responsiveness and allows uninterrupted habit tracking even during brief offline moments.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   React Application                    │
│                                                        │
│  ┌────────────────────┐      ┌──────────────────────┐  │
│  │    AuthContext     │      │   Leaderboard Hook   │  │
│  │  (Firebase Auth)   │      │ (onSnapshot Listener)│  │
│  └─────────┬──────────┘      └──────────┬───────────┘  │
└────────────┼────────────────────────────┼──────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────────────────────────────────────┐
│                   Firebase SDK 11.x                    │
│                                                        │
│   • initializeApp(firebaseConfig: discipline-90780)    │
│   • GoogleAuthProvider + signInWithPopup               │
│   • onAuthStateChanged observer                        │
│   • getFirestore(app)                                  │
└────────────┬────────────────────────────┬──────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌──────────────────────────┐
│     Firebase Auth      │    │     Cloud Firestore      │
│  (Google / Gmail SSO)  │    │                          │
│                        │    │  discipline_leaderboard/ │
│  • UID, Email, Photo   │    │    └── {userId} (Entry)  │
│  • Token & Session     │    │                          │
│                        │    │  discipline_user_data/   │
│                        │    │    └── {userId} (Habits) │
└────────────────────────┘    └──────────────────────────┘
```

#### Data Model

1. **Collection `discipline_leaderboard`**:
   - Document ID: `userId` (string)
   - Fields:
     - `userId`: `string`
     - `displayName`: `string`
     - `customAlias`: `string | null`
     - `photoURL`: `string | null`
     - `rankIndex`: `number` (1..6)
     - `rankId`: `string` ('bronz', 'argint', etc.)
     - `rankName`: `string`
     - `tierCategory`: `string`
     - `qualifyingWeeks`: `number`
     - `disciplineScore`: `number` (0..100)
     - `weeklyCompletedChecks`: `number`
     - `weeklyTargetChecks`: `number`
     - `topHabits`: `Array<{ id, name, icon, color, completed, total, rate }>`
     - `isPublic`: `boolean`
     - `updatedAt`: `string` (ISO timestamp)

2. **Collection `discipline_user_data`**:
   - Document ID: `userId` (string)
   - Fields:
     - `categories`: `Category[]`
     - `checkIns`: `Record<string, boolean>`
     - `settings`: `LeaderboardSettings`
     - `lastSyncedAt`: `string`

#### Security Blueprint & Rules (`firestore.rules`)
- Read access to `discipline_leaderboard`: Public for documents where `isPublic == true`, or owner where `request.auth.uid == userId`.
- Write/Update access to `discipline_leaderboard`: Only authenticated owner where `request.auth.uid == userId` and fields match the validated schema.
- Read/Write to `discipline_user_data/{userId}`: Restricted to the authenticated owner (`request.auth.uid == userId`).
