# Integrare Supabase: Autentificare Cloud & Leaderboard în Timp Real

Sincronizarea completă a utilizatorilor și a scorurilor din aplicație prin Supabase, înlocuind stocarea exclusiv locală cu persistență pe server și fluxuri WebSocket în timp real pe orice dispozitiv.

> [!IMPORTANT]
> **Decizii Cheie & Conectare Supabase**:
> 1. **Configurarea Credențialelor Supabase**: Pentru ca aplicația să se conecteze la un proiect Supabase real din cloud, utilizatorul are nevoie de `SUPABASE_URL` și `SUPABASE_ANON_KEY`. Vom include atât suportul pentru variabile de mediu/vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), cât și un panou intuitiv de configurare rapidă cu un singur click + SQL script pregătit pentru crearea automată a tabelelor.
> 2. **Sincronizare în Timp Real (Supabase Realtime)**: Se va asculta canalul de evenimente `postgres_changes` pe tabela `discipline_leaderboard`, astfel încât orice bifă sau progres salvat pe un dispozitiv să actualizeze instant clasamentul pe ecranele tuturor utilizatorilor conectați.
> 3. **Migrare & Fallback Fără Pierderi de Date**: Când utilizatorul se loghează cu Supabase, datele locale sunt sincronizate automat în cloud.

---

## 1. Prezentare Generală & Obiectiv

- **Ce realizează**: Înlocuiește salvarea izolată în `localStorage` cu backend-ul Supabase (PostgreSQL + Auth + Realtime). Orice cont creat, verificare zilnică de rutină sau schimbare de scor devine vizibilă instantaneu pentru toți participanții la leaderboard.
- **Public Țintă**: Luptătorii și practicanții de disciplină care vor să își vadă rangul și progresul reflectat în timp real indiferent dacă accesează aplicația de pe telefon, tabletă sau desktop.
- **Valoare Adăugată**: Competiție reală, securitate sporită a conturilor și certitudinea că progresul nu se pierde la ștergerea memoriei cache a browserului.

---

## 2. Experiență Utilizator & Fluxuri Vizuale

### Fluxuri Principale:
1. **Configurare Inițială / Detectare Supabase**:
   - Dacă Supabase nu este încă asociat, apare o notificare discretă și elegantă în antet care invită la conectarea instanței Supabase (cu posibilitate de copiere a scriptului SQL necesar pentru tabele).
2. **Autentificare Supabase Directă**:
   - Formularul de Sign Up / Sign In folosește direct `supabase.auth.signUp` și `supabase.auth.signInWithPassword`.
   - Recuperarea parolei trimite un email legitim prin `supabase.auth.resetPasswordForEmail`.
   - Profilul utilizatorului (nume afișat, avatar, rang) este stocat în tabela publică `discipline_profiles`.
3. **Leaderboard în Timp Real**:
   - Tab-ul „Arena Leaderboard” ascultă modificările via Supabase Realtime Channels.
   - De îndată ce un utilizator finalizează rutinele săptămânale, scorul său este calculat și actualizat prin `upsert` în tabela `discipline_leaderboard`.
   - Pe toate celelalte dispozitive deschise, pozițiile și scorurile din clasament se reordonează animat fără reîncărcarea paginii.

### Detalii Vizuale & Teme:
- **Aesthetic**: Interfață întunecată de înaltă performanță (tactical dark mode cu accente aurii, smarald și safir pentru ranguri).
- **Feedback & Indicatori**:
  - Indicator de conectivitate cloud: puls verde subtil „Cloud Realtime Active”.
  - Animații fluide la urcarea în clasament când se primesc update-uri de la alți utilizatori.

---

## 3. Decizii de Produs & Compromisuri Tehnice

- **Decizia 1: Utilizarea Supabase Realtime Broadcast / Postgres Changes**
  - *Abordare*: `supabase.channel('public:discipline_leaderboard').on('postgres_changes', { event: '*', schema: 'public', table: 'discipline_leaderboard' }, ...)`
  - *De ce*: Elimină complet polling-ul la 10 secunde și reduce încărcarea pe server, oferind latență sub 100ms între dispozitive.
- **Decizia 2: Schema SQL & Securitate RLS (Row Level Security)**
  - *Abordare*: Tabele create cu politici RLS: oricine poate citi (`SELECT`) clasamentul public, însă fiecare utilizator își poate modifica (`INSERT`/`UPDATE`/`DELETE`) exclusiv propriul rând (`auth.uid() = user_id`).
  - *De ce*: Garantează integritatea scorurilor și previne falsificarea clasamentului de către alți utilizatori.
- **Decizia 3: Script SQL Asistat în Aplicație**
  - *Abordare*: Includerea unui buton „Copiază Script SQL Supabase” în fereastra de configurare, pentru ca utilizatorul să poată rula schema cu un singur copy-paste în Supabase SQL Editor.

---

## 4. Arhitectură Tehnică & Strategie de Date

```
┌────────────────────────────────────────────────────────┐
│                   Aplicație React                      │
│                                                        │
│  ┌────────────────────┐        ┌────────────────────┐  │
│  │   AuthContext      │        │  Leaderboard View  │  │
│  │ (supabase.auth)    │        │  (Realtime Hook)   │  │
│  └─────────┬──────────┘        └─────────▲──────────┘  │
│            │                             │             │
└────────────┼─────────────────────────────┼─────────────┘
             │                             │
             ▼                             │ WebSocket
┌──────────────────────────────────────────┴─────────────┐
│                 Supabase Cloud Backend                 │
│                                                        │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │     Supabase Auth     │   │ discipline_profiles  │  │
│  │ (JWT, Email, Session) │   │ (utilizatori, avatare)│ │
│  └───────────────────────┘   └──────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │              discipline_leaderboard              │  │
│  │   (discipline_score, qualifying_weeks, rang)     │  │
│  │         * Public Read + RLS Owner Write *        │  │
│  │             * Realtime Replication ON *          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Structura Tabelei `discipline_leaderboard`:
- `user_id` (uuid / text, primary key)
- `display_name` (text)
- `custom_alias` (text)
- `photo_url` (text)
- `rank_index` (integer)
- `rank_id` (text)
- `rank_name` (text)
- `tier_category` (text)
- `qualifying_weeks` (integer)
- `discipline_score` (integer)
- `weekly_completed_checks` (integer)
- `weekly_target_checks` (integer)
- `top_habits` (jsonb)
- `is_public` (boolean)
- `updated_at` (timestamptz)

### Pași de Execuție:
1. **Configurare Supabase Client & Realtime Client**:
   - Modernizarea `src/services/supabase.ts` pentru a seta conexiunea activă și persistentă.
   - Adăugarea scriptului SQL pregătit și a asistentului vizual de conectare.
2. **Canal Realtime pe Leaderboard**:
   - Actualizarea `src/services/leaderboard.ts` cu abonament activ la `postgres_changes` pe tabela `discipline_leaderboard`.
   - Propagarea instantanee a evenimentelor către componenta `LeaderboardModal` / Arena Tab.
3. **Sincronizare Automată a Scorurilor**:
   - În `useCloudSync.ts`, la fiecare bifare sau completare de rutină, scorul recalculat se trimite prin `upsert` la Supabase.
4. **Validare & Testare Build**:
   - Verificare cu `compile_applet` și `lint_applet`.
