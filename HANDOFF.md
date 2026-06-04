# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### PR 5b-1 (+ bugfix) — `sheet.html` — Auth + Character Load + Header (Supabase wiring)
- DOMContentLoaded load sequence: reads `?c=` URL param only; redirects to home.html if missing
- Calls `requireAuth()` → redirects to login.html if unauthenticated
- Verifies membership via `memberships` table (`.maybeSingle()`)
- Loads character via `.eq('membership_id', userMembership.id)` — NOT by URL param
- `characterId` set from DB row if character exists, or `crypto.randomUUID()` for the create flow
- If no character found → shows inline Create Character form (replaces `.sheet-body` innerHTML)
- If character found → calls `populateHeader(character)`
- Loads campaign name and wires up `.back-link` href to `campaign.html?c={campaignId}`
- `populateHeader(char)` sets `.char-name-display` and all 6 `.char-meta-value` elements via `data-field` attributes
- `saveField(field, value)` — field-level UPDATE on blur, drives sync pill
- `setSyncStatus(state)` — drives `.sync-status` pill: saving / saved / error
- `subscribeToCharacter()` — Supabase Realtime channel on `characters` table, calls `populateHeader` on UPDATE
- `showCreateCharacterForm()` / `createCharacter()` — inline create form; inserts into `characters` then `currency`, then reloads
- `data-field` attributes on `.char-name-display` (name) and all `.char-meta-value` elements (class, race, background, alignment, level, xp)
- All header fields are `contenteditable="true"` with `onblur` save handlers
- `level` and `xp` parsed as integers on save (`parseInt(...) || default`)
- No HTML structure or CSS changed from the 5a PRs

**BUG FIXED:** Previous version read `?char=` from the URL (a param that never existed),
causing `characterId` to always be null and every user to be redirected to home.html.
Fixed by querying characters via `membership_id` instead.

### PR 5a-4 — `sheet.html` — Personality, Backstory, Conditions, Spell Slots, Spells (layout only)
- Personality section: 2×2 grid of textareas (Traits, Ideals, Bonds, Flaws), stacks to 1-col on mobile (≤500px)
- Backstory section: single large textarea (6 rows), label "Character Backstory"
- Conditions section: 14 clickable condition pills (Blinded → Unconscious), toggle `.active` on click (red highlight)
- Exhaustion row: − / + buttons clamp 0–6, update `#exhaustion-value` span inline
- Spell Slots section: 3-col grid showing levels 1–3; level 1 has 2 filled pips (`.filled`), clicking any pip toggles `.used`
- Spells section: Cantrips subsection — gold chip pills (Eldritch Blast, Minor Illusion) + ＋ Add Cantrip btn;
  Spells subsection — spell cards with name + level badge (Hex Lvl 1, Armor of Agathys Lvl 1) + ＋ Add Spell btn
- All placeholder values — no Supabase calls
- Nothing from PR 5a-1, 5a-2, or 5a-3 was modified

### PR 5a-2 — `sheet.html` — HP, death saves, saving throws, skills (layout only)
- Hit Points section: Max HP + Current HP boxes, HP bar (green/gold/red fill), Temp HP + Hit Dice boxes
- Death Saves section: Successes (3 checkboxes, green when checked) + Failures (3 checkboxes, red when checked)
- Saving Throws section: 6 rows (STR/DEX/CON/INT/WIS/CHA), each with proficiency circle + bonus + name
- Skills section: 18 alphabetical rows with proficiency circle + bonus + name + ability tag, Passive Perception footer
- JS toggle behavior: `.ds-box` and `.prof-circle` click to add/remove `.checked` class (no saves)
- All placeholder values — no Supabase calls
- Nothing from PR 5a-1 was modified

### PR 5a-1 — `sheet.html` — shell, header, ability scores, combat stats (layout only)
- `sheet.html` — character sheet page at `sheet.html?c={campaignId}`
- Fixed top bar (48px): back link (← Campaign), sync pill (✓ Saved), Quests + Customise buttons
- Character header dark band (page-flow): large character name, meta row (Class · Race · Background · Alignment · Level · XP) with vertical dividers
- Parchment sheet body centered at max-width 700px with border and shadow
- Ability Scores section: 6 boxes (STR/DEX/CON/INT/WIS/CHA), each showing name / modifier / score
- Combat Stats section: 4 boxes (Armor Class · Initiative · Speed · Prof Bonus)
- All placeholder default values — no Supabase calls
- Mobile responsive: ability grid wraps 3×2 at ≤500px, combat grid wraps 2×2 at ≤500px
- Includes auth.js and utils.js

### PR 4 — `campaign.html` — main campaign page (party overview, DM tools)
- `campaign.html` — campaign landing page at `campaign.html?c={campaignId}`
- Fixed top bar: campaign name (left), Sheet + Combat nav buttons (center), user name + Sign Out (right)
- Two-column desktop layout: party overview (left), DM panel (right, DM only)
- Party Overview (all roles): character cards showing name, class · race, HP bar (green/yellow/red), AC badge, player name; placeholder card for members with no character yet
- Real-time sync: subscribes to `characters` table for this campaign via Supabase Realtime
- DM Panel (role === 'dm' only): campaign ID with Copy button, edit campaign name (field-level save), Add NPC modal, NPC list
- Redirects: no `?c=` → `home.html`; not authenticated → `login.html`; not a member → `home.html`

### PR 3 — `home.html` — campaign lobby (list, create, join campaigns)
- Campaign lobby landing page after login
- Create Campaign modal — uses `crypto.randomUUID()` client-side to generate campaign ID before insert
- Join Campaign modal — looks up campaign by UUID, inserts membership, redirects
- Campaign grid (3-col desktop, 1-col mobile) showing name, role badge, created date
- Empty state when user has no campaigns
- Soft-delete aware — filters out campaigns with `deleted_at` set

### PR 2 — `login.html` — sign in / sign up / password recovery
- Email/password sign in and sign up with Supabase Auth
- Password recovery panel — sends reset email via `supabase.auth.resetPasswordForEmail()`
- Tab-switching UI (Sign In / Sign Up / Forgot Password)
- Client-side validation: empty fields, short password, mismatched passwords
- Redirects to `home.html` on success

### PR 1 — Project structure: /css/, /js/, /data/ folders and all shared files
- `index.html` — redirect entry point (auth check → home.html or login.html)
- `/css/variables.css`, `/css/base.css`, `/css/components.css`
- `/js/supabase-client.js`, `/js/auth.js`, `/js/theme.js`, `/js/utils.js`
- `/data/rulesets/5e-2014/sheet_schema.json`
- `/data/rulesets/5e-2014/classes/fighter.json`

---

## What's Working

- Sign in, sign up, password recovery via Supabase Auth
- Campaign lobby loads after login
- Create Campaign works (uses crypto.randomUUID() client-side)
- Join Campaign by UUID works
- campaign.html loads with party overview and DM panel
- Sign out works
- index.html redirects correctly (no leading slash paths)
- auth.js uses relative paths throughout (no leading slash)
- profiles query uses .maybeSingle() throughout
- sheet.html: auth, membership check, character load by membership_id, header population, field-level saves, sync pill, realtime subscription, create character flow

---

## Known Issues & Fixes Applied

### BUG — profiles row not always created on signup

**Symptom:** When a new user signs up, they sometimes land in `auth.users`
but NOT in `profiles`. This causes a foreign key error when they try to join
or create a campaign:
`insert or update on table "memberships" violates foreign key constraint "memberships_user_id_fkey"`

**Affected accounts found so far:**
- `8b2caacd-647f-4340-add7-6e99848c3339` (crm070506@gmail.com) — profile row
