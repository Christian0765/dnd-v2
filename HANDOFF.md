# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### PR 5b-4 complete — `sheet.html` — Weapons, Features, Proficiencies, Equipment, Currency (Supabase wiring)

**Currency:**
- `populateCurrency()` — loads `cp, sp, ep, gp, pp` from the `currency` table by `character_id`
- Each `.currency-value` span has `data-denomination="cp"` (etc.) and becomes `contenteditable` in edit mode
- Blur handler calls `adjust_currency` RPC with delta (new − old); `currentCurrency` object tracks prior values
- Currency never goes below 0 (GREATEST enforced at DB level by RPC)
- Read-only: spans are not made editable

**Weapons:**
- `populateWeapons()` — loads from `weapons` table (`deleted_at IS NULL`, ordered by `sort_order`), renders rows into existing `<tbody>`
- Columns: name, atk_bonus (+/−), dmg_dice+dmg_bonus, dmg_type, range, notes
- "＋ Add Weapon" modal inputs wired with IDs; save button calls `saveWeapon()`
- `saveWeapon()` inserts with `crypto.randomUUID()`, clears form, closes modal, re-renders table
- Read-only: Add Weapon button hidden

**Features & Traits:**
- `populateFeatures()` — loads from `features` table (`deleted_at IS NULL`, ordered by `sort_order`), renders `.feature-card` elements
- Category pill uses `getCategoryColor()` mapping to `--cat-action`, `--cat-passive`, `--cat-reaction`, `--cat-maneuver`, `--cat-racial`, `--cat-fighting`, `--cat-homebrew`
- "＋ Add Feature" modal wired with IDs; save button calls `saveFeature()`
- `saveFeature()` inserts with `crypto.randomUUID()`, clears form, closes modal, re-renders list
- Read-only: Add Feature button hidden

**Proficiencies & Languages:**
- `populateProficiencies(char)` — sets `#prof-textarea` from `proficiencies_text`, `#lang-textarea` from `languages_text`
- Both save via `saveField()` on blur; disabled in read-only mode

**Equipment:**
- `populateEquipment(char)` — sets `#equip-textarea` from `equipment_text`
- Saves via `saveField()` on blur; disabled in read-only mode

**Personality & Backstory:**
- `populatePersonalityBackstory(char)` — sets `#traits-textarea`, `#ideals-textarea`, `#bonds-textarea`, `#flaws-textarea`, `#backstory-textarea`
- Each saves via `saveField()` on blur using matching column names (`traits`, `ideals`, `bonds`, `flaws`, `backstory`)
- All disabled in read-only mode

**Subscription & Read-Only:**
- `subscribeToCharacter()` callback now re-calls all new populate functions including `populateCurrency()`
- `applyReadOnlyMode()` now also hides Add Weapon and Add Feature buttons

---

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
- **`applyReadOnlyMode()`**: hides `.sync-status` pill, removes `contenteditable` and `onblur` from all header fields, hides Add Weapon + Add Feature buttons
- **`saveField()`** guards with `if (isReadOnly) return` at the top
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
- `subscribeToCharacter()` — Supabase Realtime channel on `characters` table, calls all populate functions on UPDATE
- `showCreateCharacterForm()` / `createCharacter()` — inline create form; inserts into `characters` then `currency`, then reloads
- `data-field` + `contenteditable` + `onblur` save handlers on all header fields (name, class, race, background, alignment, level, xp)
- `level` and `xp` parsed as integers on save
- No HTML structure or CSS changed from the 5a PRs

### PR 5b-2 + 5b-3 complete — `sheet.html` — Ability Scores, Combat Stats, HP, Death Saves, Saving Throws, Skills
- Ability scores (str/dex/con/int/wis/cha): display scores and modifiers; editable, auto-recalculates modifier
- Combat stats (AC, Initiative, Speed, Prof Bonus): display from DB, editable
- Hit Points: max_hp, cur_hp, temp_hp, hit_dice; HP bar with live color; cur_hp uses `adjust_hp` RPC
- Death saves: 3 success + 3 failure checkboxes, saves to DB
- Saving throws: proficiency circle toggles, bonus auto-calculated
- Skills: 18 rows, proficiency circle toggles, passive perception footer

### PR 5a-4 — `sheet.html` — Personality, Backstory, Conditions, Spell Slots, Spells (layout only)
- Personality section: 2×2 grid of textareas (now wired in 5b-4)
- Backstory section: single large textarea (now wired in 5b-4)
- Conditions: 14 clickable condition pills, exhaustion counter
- Spell Slots: 3-col grid, pip toggle (layout only — not yet DB wired)
- Spells section: placeholder data (not yet DB wired)

### PR 5a-2 — `sheet.html` — HP, death saves, saving throws, skills (layout only)
### PR 5a-1 — `sheet.html` — shell, header, ability scores, combat stats (layout only)
### PR 4 — `campaign.html` — main campaign page
### PR 3 — `home.html` — campaign lobby
### PR 2 — `login.html`
### PR 1 — Project structure

---

## What's Working

- Sign in, sign up, password recovery via Supabase Auth
- Campaign lobby (home.html) — create and join campaigns
- campaign.html — party overview, DM panel, real-time sync
- campaign.html — DM sees "Open Sheet" / Players see "View Sheet" buttons
- sheet.html — full auth, membership check, character load, header saves, sync pill, realtime
- sheet.html — ability scores, combat stats, HP (with adjust_hp RPC), death saves, saving throws, skills
- sheet.html — weapons load from DB + add via modal
- sheet.html — features load from DB with category colors + add via modal
- sheet.html — proficiencies, languages, equipment text load + save on blur
- sheet.html — personality (traits/ideals/bonds/flaws) + backstory load + save on blur
- sheet.html — currency loads from DB + editable on blur via adjust_currency RPC
- sheet.html — read-only mode: no editing, add buttons hidden, sync pill hidden
- sheet.html — DM view, player read-only view, own sheet — all three modes working

---

## Known Issues & Fixes Applied

### BUG — profiles row not always created on signup
**Workaround:**
```sql
INSERT INTO profiles (id, display_name) VALUES ('{user_id}', '{name}');
```

### BUG — repairProfile not defined on home.html and campaign.html
**Fix:** Updated `js/auth.js` on GitHub to include the full `repairProfile` function.

### BUG — new account signup blocked by RLS on profiles table
**Fix:** Added missing INSERT policy:
```sql
CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT
WITH CHECK (id = auth.uid());
```

---

## Database Policies Currently On profiles Table
- `profiles_select_own` — users can read their own row
- `profiles_update_own` — users can update their own row
- `profiles_insert_own` — users can insert their own row

---

## SQL That Must Be Run Before Using PR 5b-4

```sql
-- adjust_currency RPC (run once in Supabase SQL editor)
CREATE OR REPLACE FUNCTION adjust_currency(
  character_id UUID,
  denomination TEXT,
  delta INTEGER
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE currency SET %I = GREATEST(0, %I + $1) WHERE character_id = $2',
    denomination, denomination
  ) USING delta, character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## What's NOT Done Yet — Next: PR 5b-5
## Feature Engine — FE-1 COMPLETE (namespace ratified)

The @ namespace in FEATURE-ENGINE-SPEC.md is RATIFIED and LOCKED. Feature data may now
be authored against it. Final set: 6 ability mods; @char.level / @char.max_hp / @char.ac
/ @prof_bonus / @classes.{name}.level; @slot_level / @spellcasting_mod / @spell_save_dc
/ @spell_attack_bonus; @target.ac / @target.hp / @attack_total. Raw scores cut;
@char.cur_hp + initiative + speed + hit-dice deferred (reasons recorded in spec).

Rule: adding tokens later is safe; removing/renaming is NOT (silently breaks features).

### Still open (not blocking FE-2)
- Condition operator list: proposed ==, !=, >, >=, <, <=, in, not_in. Confirm before
  authoring any feature that carries a condition. Pure-formula features don't need it.

### NEXT TASK — FE-2: definition column + manual renderer + raw JSON authoring
- ALTER TABLE features ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}';
- Build the definition→readable-text renderer (permanent, not interim — player must see
  what a feature does before triggering; DM must see it to override).
- Add a raw JSON authoring textarea + schema validator to the Add Feature modal (owner is
  sole author this phase; pretty form comes much later at tier 5).
- Formulas are DISPLAYED, not evaluated. No resolver yet. Shippable with zero engine code.
- Author features in real token syntax from day one so nothing is re-entered at FE-3.

PR 5b-4 is fully complete. The next task is PR 5b-5.

### PR 5b-5 — Conditions + Spell Slots + Spells (Supabase wiring)
Wire the remaining layout-only sections to the database:
- Conditions (14 pills + exhaustion) — save/load from `characters.conditions` (JSONB array) and `characters.exhaustion`
- Spell slots — load from `spell_slots` table; use `adjust_spell_slot` RPC for pip toggles
- Spells — load cantrips and spells from a `spells` table (or `characters.spells_known` JSONB)
- "Add Cantrip" and "Add Spell" buttons wired to insert

**Before starting PR 5b-5, check DND-MASTER-PLAN.md for the `spell_slots` table schema and any required RPCs.**
