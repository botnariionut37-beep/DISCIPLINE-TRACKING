# Account Deletion: "JUST" Account Permanently Purged

- **Remote Realtime Database Purge**:
  - Implemented `purgeRealtimeLeaderboardByNameOrId('JUST')` which iterates through all entries in `leaderboard/` on Firebase Realtime Database and deletes any entry matching UID, `displayName`, or `customAlias` equal to "JUST".
  - Updated `listenToRealtimeLeaderboard` so that if any incoming snapshot node contains "JUST", it immediately executes a remote deletion and drops it from the stream.

- **Remote Firestore Purge**:
  - Implemented `purgeFirestoreLeaderboardByNameOrId('JUST')` which scans documents in `discipline_leaderboard` and deletes any document matching ID, `displayName`, or `customAlias` equal to "JUST".
  - Updated `subscribeFirestoreLeaderboard` to immediately delete and exclude any document with the name or alias "JUST".

- **Local Storage & State Sanitization**:
  - Removed "JUST" from local community storage (`discipline_community_leaderboard`).
  - Cleared `discipline_user_alias`, `discipline_local_user_id`, and `leaderboardSettings.customAlias` if set to "JUST".
  - Sanitized `publishLeaderboardSnapshot` to prevent re-publishing under the name "JUST".
  - Filtered out any entries matching "JUST" across all leaderboard views, podiums, and rankings.
