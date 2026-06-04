# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### PR 5b-1 complete — `campaign.html` + `sheet.html` — DM/Player Sheet Views + Read-Only Mode

**campaign.html:**
- `renderParty()` now adds an **"Open Sheet"** button to every player card when `userMembership.role === 'dm'`
- `renderParty()` now adds a **"View Sheet"** button to other players' cards when viewer is `role === 'player'`; own card gets no button
- Both buttons call `openPlayerSheet(char.id)` → navigates to `sheet.html?c={campaignId}&p={characterId}`
- Cards with no character (placeholder state) receive no button in either case

**sheet.html:**
- New state variables: `viewingCharId` (the `?p=` URL param) and `isReadOnly` (boolean, default false)
- **DM redirect** now only fires when `role === 'dm' AND !viewingCharId` — DM with `?p=` proceeds to load the sheet
- **`?p=` present path**: loads character by `characters.id`, scoped to `campaign_id` for safety
  - If viewer is player and `character.membership_id !== userMembership.id` → `isReadOnly = true`
  - If viewer is DM → header remains editable, `saveField()` targets the viewed character's ID
  - Accent fallback chain: `character.accent_hex → owner_membership.accent_hex → '#c4920a'`
  - Applied via new `applyAccentFromDb(hex)` — applies sheet owner's accent, never viewer's
- **`?p=` absent path**: player loads their own sheet as before; accent applied from own character/membership
- **`applyReadOnlyMode()`**: hides `.sync-status` pill, removes `contenteditable` and `onblur` from all header fields
- **`saveField()`** guards with `if (isReadOnly) return` at the top (belt-and-suspenders)
- Membership query now selects `accent_hex` for the own-sheet accent fallback
- Back link always wires to `campaign.html?c={campaignId}` regardless of mode
- Realtime subscription only started in editable modes; skipped for read-only

### PR 5b-1 part 1 + bugfixes — `sheet.html` — Auth + Character Load + Header (Supabase wiring)
- DOMContentLoaded load sequence: reads `?c=` URL param only; redirects to `home.html` if missing
- Calls `requireAuth()` → redirects to `login.html` if unauthenticated
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
- campaign.html — DM sees "Open Sheet" button on every player card with a character
- campaign.html — Players see "View Sheet" button on other players' cards; no button on their own card
- sheet.html — auth, membership check, DM redirect, character load by membership_id, header population, field-level saves, sync pill, realtime subscription, create character flow
- sheet.html — DM navigates to `?c=X&p=Y`, sees correct player's character with editable header and working saves
- sheet.html — DM visiting `?c=X` with no `?p=` still redirects to campaign.html
- sheet.html — Player navigates to `?c=X&p=Y` (another player's character), gets full read-only sheet
- sheet.html — Read-only mode: no contenteditable, no onblur handlers, sync pill hidden
- sheet.html — Accent color fallback chain applied in all three modes (own sheet, DM view, read-only)
- "My Sheet" button only visible to players
- Sign out works
- All paths are relative (no leading slash)
- New account signup creates profile row correctly
- repairProfile runs on every page load as a safety net

---

## Known Issues & Fixes Applied

### BUG — profiles row not always created on signup
**Symptom:** FK error on memberships insert: `memberships_user_id_fkey`
**Affected:** `8b2caacd-647f-4340-add7-6e99848c3339` (crm070506@gmail.com) — manually fixed
**Workaround:**
```sql
INSERT INTO profiles (id, display_name) VALUES ('{user_id}', '{name}');
```

### BUG — repairProfile not defined on home.html and campaign.html
**Symptom:** `Uncaught (in promise) ReferenceError: repairProfile is not defined`
**Root cause:** The `repairProfile` function existed in the local version of `auth.js`
but had never been pushed to GitHub. The live site was serving the old cached
version of the file which did not contain the function at all.
**Fix:** Updated `js/auth.js` on GitHub to include the full `repairProfile` function
at the bottom of the file. GitHub Pages was serving a 304 cached response so the
fix only took effect after a hard refresh (Ctrl+Shift+R).

### BUG — new account signup blocked by RLS on profiles table
**Symptom:** `POST /rest/v1/profiles 403 (Forbidden)` — `new row violates
row-level security policy for table "profiles"`
**Root cause:** When the `profiles` table was created, RLS policies were added
for SELECT and UPDATE but the INSERT policy was never created. This meant any
attempt to insert a new profile row — including during signup and via
`repairProfile` — was blocked by Supabase at the database level.
**Fix:** Added the missing INSERT policy in Supabase SQL editor:
```sql
CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT
WITH CHECK (id = auth.uid());
```
This policy is permanent — all future signups are unaffected.

---

## Database Policies Currently On profiles Table
- `profiles_select_own` — users can read their own row
- `profiles_update_own` — users can update their own row
- `profiles_insert_own` — users can insert their own row ← added this session

---

## What's NOT Done Yet — Next: PR 5b-2

PR 5b-1 is fully complete. The next task is PR 5b-2.

### PR 5b-2 — Ability Scores + Combat Stats + HP (Supabase wiring)
Wire the existing layout-only sections to the database:
- Ability scores (str/dex/con/int/wis/cha) — display scores and modifiers from DB
- Combat stats (AC, Initiative, Speed, Prof Bonus) — display from DB
- Hit Points section — display max_hp, cur_hp, temp_hp, hit_dice from DB
- HP bar — live color based on cur_hp/max_hp ratio
- All values editable via field-level saves (saveField), except cur_hp which must use adjust_hp RPC

**Before starting PR 5b-2, run this SQL in Supabase:**
```sql
CREATE OR REPLACE FUNCTION adjust_hp(character_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE characters
  SET cur_hp = GREATEST(0, LEAST(max_hp, cur_hp + delta))
  WHERE id = character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
