# Mobile-Exclusive Aesthetic Optimization Plan

Refine the application layout, typography, and interaction patterns exclusively for mobile devices (`< 640px` viewport), while maintaining the exact desktop and tablet experience untouched.

---

### Key Requirements & Constraints

> [!IMPORTANT]
> - **Mobile Only**: All layout alterations are scoped to mobile viewports via responsive Tailwind breakpoints (`block sm:hidden`, `flex sm:hidden`, `max-sm:`, or `sm:hidden`). Desktop and tablet layouts remain completely intact.
> - **Touch Accessibility**: Every interactive control on mobile has $\ge 44\text{px}$ touch targets to eliminate accidental taps.
> - **No Horizontal Overflow**: Eradicate horizontal scrolling issues on phones; deliver a tailored mobile card & day-focus interface.
> - **Domain-Native Dark Aesthetic**: Deep obsidian backgrounds (`#0A0D14`), polished glassmorphism, crisp typography, and restrained borders.

---

### 1. Proposed Mobile Experience & Components

#### A. Mobile Bottom Navigation Dock (`block sm:hidden`)
- A glassmorphic navigation bar pinned to the bottom of the viewport with safe-area padding:
  - **Habits**: Switches to the active routine tracker
  - **Arena**: Opens the live Realtime Database leaderboard
  - **Rank Ladder**: Quick drawer/modal trigger to review discipline tier progression
  - **Analytics**: Smooth scroll / tab to discipline breakdown metrics
  - **Profile / Actions**: One-tap access to settings & user profile

#### B. Mobile Habit Check Cards with Day Selector
- In `WeeklyGrid.tsx`:
  - **Mobile Day Selector Pill Strip**: Horizontal scrollable day pill bar (`Mon` through `Sun`) with "Today" highlighted and daily completion rates.
  - **Aesthetic Habit Card Stack**: On mobile, habits render as full-width sleek cards featuring:
    - Habit icon + color accent glow
    - Clean habit title with streak counter
    - Primary 48px check button for the selected day with tactile feedback
    - 7-day mini dot trail showing weekly consistency at a glance
  - **View Toggle**: A quiet control allowing the user to flip between "Day Focus Card" and "Scrollable Grid" view on mobile.

#### C. Streamlined Mobile Rank & Progress Header
- In `App.tsx` and `RankCard.tsx`:
  - Compact mobile hero that displays the rank shield, discipline percentage ring, and week navigator without pushing habits off the initial screen view.
  - Reduced vertical spacing on mobile (`py-3` instead of `py-8`) to maximize viewport utility.

#### D. Mobile Leaderboard Podium & Table
- In `LeaderboardTable.tsx` and `LeaderboardPodium.tsx`:
  - Stacked mobile podium cards with medals (#1, #2, #3) sized appropriately for 360px–420px screens.
  - Leaderboard rows formatted with avatar, name, rank pill, and discipline percentage with zero horizontal scroll clipping.

---

### 2. Implementation Steps

1. **Create Mobile Navigation Component (`src/components/MobileBottomNav.tsx`)**:
   - Pinned bottom bar rendered only on `sm:hidden`.
   - Coordinates with `activeTab` ('matrix' vs 'leaderboard') and modal triggers (`isRankLadderOpen`, `isPortabilityOpen`, settings).
2. **Enhance `WeeklyGrid.tsx` with Mobile Card View**:
   - Add mobile-specific day switcher state (defaults to today's day of week).
   - Render `MobileHabitCard` list for small screens while preserving the existing table for `hidden sm:block`.
3. **Optimize Header & Metric Hero for Mobile**:
   - Adjust `RankCard` and `MetricCircle` padding/sizing for mobile screens using `text-sm sm:text-base` and `w-14 h-14 sm:w-20 sm:h-20`.
4. **Tune Leaderboard for Mobile Screens**:
   - Add responsive card mode for leaderboard rows on mobile.
5. **Verify Compilation & Responsiveness**:
   - Run `lint_applet` and `compile_applet`.
