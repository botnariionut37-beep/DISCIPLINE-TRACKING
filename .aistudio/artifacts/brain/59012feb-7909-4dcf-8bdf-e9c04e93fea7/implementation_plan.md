# Integrare Supabase: Autentificare Cloud & Leaderboard în Timp Real

Sincronizarea completă a utilizatorilor și a scorurilor din aplicație prin Supabase, înlocuind stocarea exclusiv locală cu persistență pe server și fluxuri WebSocket în timp real pe orice dispozitiv.

> [!NOTE]
> **Proiect Supabase Configurat & Activ**:
> - **Proiect**: `https://wulenpgjvtezguftdyyx.supabase.co`
> - **Cheie Anon**: Integrată în mediul de producție (`.env`, `supabase.ts`, `.env.example`).
> - **URL Sanitization**: Orice sufix de tip `/rest/v1/` este curățat automat la URL-ul de bază Supabase pentru a permite funcționarea corectă a tuturor rutelor Auth și REST.

---

## 1. Ce a fost implementat

1. **Credențiale Reale Supabase**:
   - URL-ul de bază și cheia publică Anon au fost configurate ca implicite în `src/services/supabase.ts`, în fișierul `.env` și în `.env.example`.
   - Adăugată igienizarea automată a URL-urilor pentru a elimina `/rest/v1` sau `/` la final.
   - Dezactivat mecanismul temporar de purge la pornire, prevenind ștergerea accidentală a datelor reale din baza de date la conectarea primilor vizitatori.

2. **Salvare Directă a Scorurilor în Supabase**:
   - `publishLeaderboardSnapshot` execută un `upsert` direct în tabela `discipline_leaderboard` din Supabase (folosind cheia primară `user_id`).
   - Când Supabase este conectat, tabela din cloud este singura sursă de adevăr pentru clasament (nu se mai folosește `localStorage`).

3. **Interogare Leaderboard Descrescătoare**:
   - `subscribeToLeaderboard` interoghează direct tabela `discipline_leaderboard` cu `.order('discipline_score', { ascending: false }).order('qualifying_weeks', { ascending: false })`.
   - Toți utilizatorii înregistrați în baza de date apar în clasament, ordonați de la cel mai mare scor la cel mai mic.

4. **Sincronizare în Timp Real (Supabase Realtime)**:
   - Aplicația menține un canal deschis WebSocket (`discipline_leaderboard_realtime`) ascultând evenimentele `postgres_changes` pe `discipline_leaderboard`.
   - Oricând un utilizator bifează un obicei de pe telefon sau desktop, scorul său actualizat apare instant pe dispozitivele tuturor celorlalți utilizatori.

5. **Script SQL & Asistent în Aplicație**:
   - Fișierul `supabase_schema.sql` este inclus în proiect și un buton de copiere directă a scriptului este disponibil în fereastra de configurare din aplicație.
