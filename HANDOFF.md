# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### PR 5b-1 + bugfixes — `sheet.html` — Auth + Character Load + Header (Supabase wiring)
- DOMContentLoaded load sequence: reads `?c=` URL param only; redirects to `home.html` if missing
- Calls `requireAuth()` → redirects to `login.html` if unauthenticated
- Verifies membership via `memberships` table (`.maybeSingle()`)
- **DM redirect**: if `userMembership.role === 'dm'` → redirect to `campaign.html?c={campaignId}` immediately
- Loads character via `.eq('membership_id', userMembership.id)` — NOT by URL param
- `characterId` set from DB row if character exists, or `crypto.randomUUID()` for the create flow
- If no character found → shows inline Create Character form (replaces `.sheet-body` innerHTML)
- If character found → calls `populateHeader(character)`
- Loads campaign name and wires up `.back-link` href to `campaign.html?c={campaignId}`
- `populateHeader(char)` sets `.char-name-display` and all 6 `.char-meta-value` elements via `data-field` attributes
- `saveField(field, value)` — field-level UPDATE on blur, drives sync pill
- `setSyncStatus(state)` — drives `.sync-status` pill: saving / saved / error
- `subscribeToCharacter()` — Supabase Realtime channel on `characters` table, calls `populateHeader` on UPDATE
- `showCreateCharacterForm()` / `createCharacter()` — inline create form with light-background-safe styles; inserts into `characters` then `currency`, then reloads
- `data-field` + `contenteditable` + `onblur` save handlers on all header fields (name, class, race, background, alignment, level, xp)
- `level` and `xp` parsed as integers on save
- No HTML structure or CSS changed from the 5a PRs

**Bugs fixed in this PR series:**
- Character load previously used `?char=` URL param (never set by the app) → fixed to query by `membership_id`
- Create Character form text was invisible on parchment background → fixed with `var(--ink)` inline styles
- DMs visiting `sheet.html` were not redirected → added role check after membership load

### campaign.html bugfixes (applied alongside 5b-1)
- **"My Sheet" button** is now hidden by default (`style="display:none;"`), shown only when `userMembership.role === 'player'`
- **Party grid** filters out DM memberships — only `role === 'player'` memberships render cards
- **`renderParty()`** has a two-pass character match: primary by `membership_id`, fallback for orphaned characters with `null` membership_id

### PR 5a-4 — `sheet.html` — Personality, Backstory, Conditions, Spell Slots, Spells (layout only)
- Personality section: 2×2 grid of textareas (Traits, Ideals, Bonds, Flaws), stacks to 1-col on mobile (≤500px)
- Backstory section: single large textarea (6 rows), label "Character Backstory"
- Conditions section: 14 clickable condition pills (Blinded → Unconscious), toggle `.active` on click (red highlight)
- Exhaustion row: − / + buttons clamp 0–6, update `#exhaustion-value` span inline
- Spell Slots section: 3-col grid showing levels 1–3; level 1 has 2 filled pips (`.filled`), clicking any pip toggles `.used`
- Spells section: Cantrips subsection + Spells subsection with placeholder data
- All placeholder values — no Supabase calls

### PR 5a-2 — `sheet.html` — HP, death saves, saving throws, skills (layout only)
- Hit Points section: Max HP + Current HP boxes, HP bar (green/gold/red fill), Temp HP + Hit Dice boxes
- Death Saves section: 3 success + 3 failure checkboxes, toggle `.checked`
- Saving Throws section: 6 rows with proficiency circle + bonus + name
- Skills section: 18 alphabetical rows with proficiency circle + bonus + name + ability tag, Passive Perception footer
- All placeholder values — no Supabase calls

### PR 5a-1 — `sheet.html` — shell, header, ability scores, combat stats (layout only)
- Fixed top bar (48px): back link (← Campaign), sync pill (✓ Saved), Quests + Customise buttons
- Character header dark band: large character name, meta row (Class · Race · Background · Alignment · Level · XP)
- Parchment sheet body centered at max-width 700px
- Ability Scores section: 6 boxes (STR/DEX/CON/INT/WIS/CHA)
- Combat Stats section: 4 boxes (Armor Class · Initiative · Speed · Prof Bonus)
- Mobile responsive, includes auth.js and utils.js

### PR 4 — `campaign.html` — main campaign page (party overview, DM tools)
- `campaign.html` — campaign landing page at `campaign.html?c={campaignId}`
- Fixed top bar: campaign name (left), Sheet + Combat nav buttons (center), user name + Sign Out (right)
- "⚔ My Sheet" button hidden by default, shown only for players
- Party Overview: only player memberships render; character cards with name, class · race, HP bar, AC badge, player name; "No character yet" placeholder for players without a character
- Real-time sync: subscribes to `characters` table for this campaign
- DM Panel (role === 'dm' only): campaign ID with Copy button, edit campaign name, Add NPC modal, NPC list
- Redirects: no `?c=` → `home.html`; not authenticated → `login.html`; not a member → `home.html`

### PR 3 — `home.html` — campaign lobby
- Create Campaign modal (uses `crypto.randomUUID()` client-side)
- Join Campaign modal
- Campaign grid, empty state, soft-delete aware

### PR 2 — `login.html` — sign in / sign up / password recovery

### PR 1 — Project structure: /css/, /js/, /data/ folders and all shared files

---

## What's Working

- Sign in, sign up, password recovery via Supabase Auth
- Campaign lobby (home.html) — create and join campaigns
- campaign.html — party overview (players only), DM panel, real-time sync
- sheet.html — auth, membership check, DM redirect, character load by membership_id, header population, field-level saves, sync pill, realtime subscription, create character flow
- "My Sheet" button only visible to players
- DM visiting sheet.html is redirected to campaign.html immediately
- Sign out works
- All paths are relative (no leading slash)

---

## Known Issues & Fixes Applied

### BUG — profiles row not always created on signup
**Symptom:** FK error on memberships insert: `memberships_user_id_fkey`
**Affected:** `8b2caacd-647f-4340-add7-6e99848c3339` (crm070506@gmail.com) — manually fixed
**Workaround:**
```sql
INSERT INTO profiles (id, display_name) VALUES ('{user_id}', '{name}');
