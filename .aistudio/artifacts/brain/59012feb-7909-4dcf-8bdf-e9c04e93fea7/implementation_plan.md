# Firebase Realtime Database Live Leaderboard Integration

Implement a real-time live community leaderboard using Firebase Realtime Database (`discipline-90780-default-rtdb.firebaseio.com`) and Google Authentication, writing to and reading from `leaderboard/{uid}` using `set` and `onValue`.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your Realtime Database security rules (`auth != null && auth.uid === $uid`):
>
> - **Guest Access**: Guest users must sign in with Google or email to publish their scores to the public Realtime Database leaderboard. Unauthenticated guests can view the live leaderboard in real time without restriction (matching the `.read: true` rule).
> - **Stored Payload Schema**: Each participant document under `leaderboard/{uid}` will store `displayName`, `photoURL`, `score`, `rankName`, and `updatedAt`.
> - **Live Realtime Updates**: We will use Firebase SDK's `onValue` listener on `leaderboard` to sort participants in descending order by score and update the UI in real time without refreshing.

---

### 1. Overview & Core Concept

- **What It Does**:
  - Connects to Firebase Realtime Database at `https://discipline-90780-default-rtdb.firebaseio.com` using the project's initialized Firebase credentials.
  - Exposes `saveUserScoreToLeaderboard(uid, { displayName, photoURL, score, rankName })` which writes or updates `leaderboard/{uid}` via `set(ref(rtdb, 'leaderboard/' + uid), data)`.
  - Exposes `listenToRealtimeLeaderboard(callback)` using `onValue(ref(rtdb, 'leaderboard'), ...)` to receive instantaneous updates whenever any participant's score changes.
  - Displays participants sorted in descending order by score, showing rank, avatar photo, name, rank tier, and points. If the collection is empty, displays *"No participants yet"*.
- **Target Audience**: All warriors and users of the discipline application competing on the global real-time leaderboard.

---

### 2. User Experience & Visual Design

- **Leaderboard View & Real-Time Sync**:
  - The leaderboard table and podium seamlessly subscribe to Firebase Realtime Database `onValue`.
  - Includes standard DOM anchor `id="leaderboard-list"` for complete compliance with your prompt specification.
  - Active visual indicator ("Live Realtime Database Connected") displaying real-time synchronization state.
  - Empty state: When no competitors exist in the database, displays a clean Stoic banner: *"No participants yet. Complete your first habit to claim the #1 spot!"*
- **Sign-in Prompt for Publishing**:
  - When an unauthenticated user views their progress, an unobtrusive banner encourages them: *"Sign in with Gmail to publish your score to the global live leaderboard"*.
  - Clicking opens the Google sign-in popup, which instantly authenticates and pushes their score to `leaderboard/{uid}`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Firebase Realtime Database (`firebase/database`) alongside Auth**
  - *Chosen Approach*: Initialize `getDatabase(app, "https://discipline-90780-default-rtdb.firebaseio.com")`.
  - *Why*: Directly aligns with your database URL and security rules configured in Firebase console.
- **Decision 2: Sorting Strategy**
  - *Chosen Approach*: Client-side descending sort on the received snapshot: `entries.sort((a, b) => b.score - a.score)`.
  - *Why*: Realtime Database stores keys by UID; sorting client-side guarantees instantaneous updates with complete control over tied scores and tie-breaking.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   React Application                    │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │     AuthContext         │  │  LeaderboardTable   │  │
│  │  (Google Auth via RTDB) │  │ (id="leaderboard-   │  │
│  │                         │  │       list")        │  │
│  └───────────┬─────────────┘  └──────────┬──────────┘  │
└──────────────┼───────────────────────────┼─────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│             Firebase Realtime Database                 │
│    (https://discipline-90780-default-rtdb...)          │
│                                                        │
│  • Write: set(ref(db, 'leaderboard/' + uid), entry)    │
│  • Read:  onValue(ref(db, 'leaderboard'), snapshot)   │
└────────────────────────────────────────────────────────┘
```

#### Data Schema (`leaderboard/{uid}`)
```json
{
  "displayName": "Marcus Aurelius",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "score": 85,
  "rankName": "Argint",
  "updatedAt": "2026-10-01T11:18:00.000Z"
}
```

#### Functions to Implement in `src/services/firebase.ts`:
1. `saveUserScoreToLeaderboard(uid, data)`:
   - Uses `set(ref(db, `leaderboard/${uid}`), data)`
2. `listenToRealtimeLeaderboard(onUpdate, onError)`:
   - Uses `onValue(ref(db, 'leaderboard'), callback)`
   - Parses snapshot children, maps to array, sorts `b.score - a.score`
   - Returns unsubscribe function (`off` or return value)
3. Integration in `src/services/leaderboard.ts`:
   - Bridges the Realtime Database listener with the app's existing podium and table components.
