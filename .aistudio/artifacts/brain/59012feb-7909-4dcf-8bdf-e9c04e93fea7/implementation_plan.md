# Implementation Plan - Warrior Community Leaderboard

Create an engaging, real-time Community Leaderboard where warriors can measure their discipline against peers, celebrate tier promotions, inspect competitor habit structures, and build stoic accountability while retaining full privacy controls.

## 1. Architectural Design & Ranking Algorithm

### Leaderboard Standing Hierarchy
Standings are ordered by:
1. **Discipline Rank Tier** (Highest tier first, from Level 12 "Ascended Paragon" down to Level 1 "Grounded Initiate").
2. **Qualifying Weeks Count** (Tiebreaker within the same rank tier).
3. **Current Week Discipline Completion Rate (%)** (Tiebreaker for current execution momentum).

```
   ┌────────────────────────────────────────────────────────┐
   │            Community Leaderboard Ranking               │
   ├────────────────────────────────────────────────────────┤
   │ 1. Primary: Rank Tier Index (0-11)                     │
   │ 2. Secondary: Qualifying Weeks (Discipline Longevity)   │
   │ 3. Tertiary: Weekly Completion Rate (Current Execution)│
   └────────────────────────────────────────────────────────┘
```

### Firestore Schema: `leaderboard/{userId}`
Each registered warrior maintains a public leaderboard document:
- `userId`: string
- `displayName`: string (warrior call-sign or display name)
- `customAlias`: string | null (optional custom handle)
- `photoURL`: string | null
- `rankIndex`: number (0-11)
- `rankName`: string (e.g. "Titan", "Ascended Paragon")
- `qualifyingWeeks`: number
- `disciplineScore`: number (current week execution rate, e.g. 92%)
- `weeklyCompletedChecks`: number
- `weeklyTargetChecks`: number
- `topHabits`: Array of `{ id, name, icon, color, rate }` (user's active habit summaries)
- `isPublic`: boolean (default `true`)
- `updatedAt`: Firestore timestamp

### Security Rules (`firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /leaderboard/{userId} {
      // Anyone can read public entries or their own entry
      allow read: if resource.data.isPublic == true || (request.auth != null && request.auth.uid == userId);
      // Only authenticated users can write their own leaderboard entry
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 2. User Experience & Visual Features
1. **View Toggle in Header:**
   - Seamless switch between **"My Matrix"** (the weekly habit tracker) and **"Leaderboard"** (the warrior arena).
   - Shows total active warriors count and current user's standing.
2. **Top 3 Champions Podium:**
   - High-impact visual podium showcasing 1st (Gold), 2nd (Silver), and 3rd (Bronze) places with glowing discipline tier crowns, avatars, and completion rates.
3. **Ranked Warrior Ladder:**
   - Distinctive table with cyberpunk styling:
     - Rank badge (#1, #2, #3, ...)
     - Warrior name / custom alias + avatar
     - 12-Tier Discipline badge & title with tier-specific glowing colors
     - Weekly discipline progress bar & rate percentage
     - Top habit pills (e.g. "Cold Plunge 100%", "Deep Work 85%", "Gym 100%")
     - Instant highlight of the logged-in user's position
4. **Warrior Detail Inspector Modal:**
   - Clicking any warrior opens a detailed breakdown:
     - Their discipline rank trajectory and qualifying weeks
     - Breakdown of their habit categories and completion rates
     - Motivating stats without exposing sensitive personal notes
5. **Privacy & Alias Customization:**
   - Quick settings drawer / modal:
     - **Visibility Switch:** "Display profile on public leaderboard" (toggled ON by default, can be turned off anytime for full incognito mode).
     - **Warrior Alias:** Set a custom alias (e.g., "VikingDiscipline", "IronMind") instead of Google email or name.
6. **Automatic Sync Pipeline:**
   - `useCloudSync.ts` automatically updates `leaderboard/{userId}` whenever habits, checks, or rank status change.

## 3. Implementation Steps
1. **Update Blueprint & Security Rules:**
   - Add `leaderboard` collection to `firebase-blueprint.json`.
   - Update `firestore.rules` and run `deploy_firebase`.
2. **Leaderboard Data Service & Hook:**
   - Create `src/services/leaderboard.ts` to sync user stats to `leaderboard/{userId}` and fetch real-time leaderboard data.
3. **UI Components:**
   - `src/components/LeaderboardPodium.tsx`: Gold, Silver, Bronze champions display.
   - `src/components/LeaderboardTable.tsx`: Full ranked list with filters (All-Time Rank vs Current Week Rate).
   - `src/components/WarriorInspectorModal.tsx`: Detailed competitor profile inspection.
   - `src/components/LeaderboardSettingsModal.tsx`: Alias and public/private privacy toggle.
4. **Integration in `App.tsx`:**
   - Header navigation tabs ("Habit Matrix" | "Leaderboard").
   - Connect real-time synchronization so changes in habit checks instantly reflect on the leaderboard.
5. **Verification & Linting:**
   - Test leaderboard publishing, privacy toggling, alias changes, and real-time updates.
   - Verify `compile_applet` and `lint_applet`.
