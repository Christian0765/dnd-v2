# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### INV-2 complete — `sheet.html` — Edit item core + inventory table redesign

**What was built:**

*Edit item core fields (DM edits shared / players fork):*
- The inventory edit modal now exposes item core fields (name, category, weight, value_gp,
  requires_attunement, description) alongside the existing entry fields (quantity, equipped,
  attuned, notes).
- **DM** sees two buttons: **Save for Everyone** (UPDATE the shared `items` row in place) and
  **Save as Copy** (fork). **Player** sees only **Save as Copy**.
- Fork = new `items` row via `crypto.randomUUID()`, `original_item_id` set to the source item,
  `source: 'player'`; the current `character_inventory` row is re-pointed at the new item_id.
  Never runs the stacking/increment path, so it cannot collide with the `(character_id, item_id)`
  uniqueness added in INV-1.
- Entry fields are saved first in both modes so a combined edit persists fully.
- Role gate is enforced server-side by RLS (`items_update_dm`), not just by hiding the DM button.

*Inventory table redesign:*
- Fixed column alignment with `table-layout: fixed` + a `<colgroup>` of explicit widths
  (previously columns sized per-row from content and did not line up).
- Sortable headers: Item, Type, Qty, Wt, Gold — click to sort, click again to reverse; a ▲/▼
  arrow marks the active column. Default sort: name ascending.
- New Weight and Gold columns (quantity × weight, quantity × value_gp).
- Totals footer sums carried weight and total item gold value. (Delivers the carried-weight
  calculation deferred from INV-1.)
- Checkbox labels in the inventory modal (Equipped / Attuned / Requires Attunement) forced
  readable on the dark background:
  `#inventory-modal label:not(.form-label) { color: rgba(var(--light-text-rgb), 0.9); }`

**New JS functions:** `saveItemCore(mode)`, `setInvSort(key)`, `sortedInventory()`.
**Modified:** `renderInventory` (rewritten), `openEditInventory`, `openInventoryModal`,
`resetInventoryModal`.
**New state:** `invSort = { key, dir }`.

**Files changed:** `sheet.html` only.

**Not touched:** weapons, features, spells, skills, HP, currency, header, the inventory
add/stack/delete paths, campaign.html, home.html, login.html, combat.html, all /css/ and /js/ files.

**SQL run for INV-2 (do NOT re-run — already applied to live DB):**
```sql
-- DM-only UPDATE on shared items (players fork instead of editing in place)
CREATE POLICY "items_update_dm" ON items
  FOR UPDATE USING ( is_dm(campaign_id) );
-- (items INSERT policy for members already existed from INV-1 — not re-added)
```

**Known follow-ups (not built — rule 31):**
- `saveInventoryEntry`'s edit branch is now dead code (edit mode routes through `saveItemCore`);
  safe to remove in a small later PR.
- The Gold column shows item VALUE, distinct from the `currency` coin purse; surfacing the purse
  near inventory is a possible follow-up.
- A category change can move a weapons/armor item without the Weapons-tab/AC flow reacting —
  handled by the two split follow-up branches below.

**Next inventory work (two separate branches, one at a time, rule 21):**
- `weapon-send-to-attacks` — weapon-category items get a "Send to Attacks" option that creates a
  linked `weapons` row (new col `weapons.source_inventory_id`); removing the item soft-deletes the
  linked weapon. Sent weapon starts with default combat stats the player edits.
- `armor-ac-calculation` — auto-calculate AC from equipped armor; store split as
  `characters.ac_calculated` and `characters.ac_override` (display = override ?? calculated).
  DM-approval to change AC is deferred to Phase 3 (`dm_allowances`).

---

### INV-1 complete — `sheet.html` — Structured Inventory (character_inventory + items)

**What was built:**
- New **Inventory section** on the character sheet (`#section-inventory`), added to the `SECTIONS` array so it appears in the Customise panel and can be reordered/hidden.
- Each `character_inventory` row is joined to its `items` row via `.select('*, items(*)')` and rendered as a table: name, category pill (color-coded), qty, equipped dot (green), attuned dot (purple), per-item notes, and a ✕ delete button.
- **"Add Item" modal** with two modes, switchable via a mode bar:
  - **Pick Existing** — searches all non-deleted items scoped to the campaign (`campaign_id`), renders a scrollable pick list; selecting a row stores `selectedItemId`.
  - **Create New** — name (required), category (7-value enum: weapons/armor/magical/resources/healing/food/misc), weight_lb, value_gp, requires_attunement checkbox, description.
  - Both modes share inventory-entry fields: quantity, equipped checkbox, attuned checkbox, notes.
- **Edit** — clicking any inventory row opens the same modal pre-filled in edit mode; save issues a field-level UPDATE on `character_inventory`. Item core fields (name, category, weight) are not re-editable from this modal (deferred to INV-2).
- **Stacking** — "Pick Existing" re-adding an item the character already has increments the existing row's `quantity` instead of inserting a second row. "Create New" always inserts (brand-new item, no existing row to stack onto).
- **Delete** — soft delete only: sets `deleted_at = new Date().toISOString()` on `character_inventory`. Never `.delete()` (rule 11).
- **Read-only mode** — "Add Item" button hidden by `applyReadOnlyMode()`; delete buttons and row clicks are not rendered for read-only viewers.
- All patterns follow the existing weapon/feature implementation: `crypto.randomUUID()` for all inserts (rule 15), `.maybeSingle()` never `.single()` (rule 14), error-checked Supabase calls (rule 12), `escHtml()` on user strings.

**New JS functions (13 total):**
`invCategoryColor`, `populateInventory`, `renderInventory`, `openInventoryModal`, `setInventoryMode`, `loadCampaignItems`, `filterItemPickList`, `renderItemPickList`, `selectPickItem`, `saveInventoryEntry`, `openEditInventory`, `deleteInventoryEntry`, `resetInventoryModal`

**New state variables:** `cachedInventory`, `inventoryEditId`, `selectedItemId`, `inventoryMode`, `cachedCampaignItems`

**Files changed:** `sheet.html` only.

**Not touched:** weapons, features, spells, skills, HP, currency, header, campaign.html, home.html, login.html, combat.html, any CSS/JS files outside sheet.html.

**Deferred to INV-2:** (status after INV-2 — see INV-2 section above)
- ~~Carried-weight calculation~~ — DONE in INV-2 (totals footer)
- ~~Editing item core fields from the inventory modal~~ — DONE in INV-2
- Weapons/armor auto-flow into the Weapons tab / AC calculation — STILL DEFERRED, split into
  two follow-up branches: `weapon-send-to-attacks` and `armor-ac-calculation`.

---

**Bug fix — INV-1 stacking (this PR):**
- `saveInventoryEntry` insert path now checks for an existing non-deleted `character_inventory` row with the same `character_id` + `item_id`. If found, increments `quantity` via UPDATE; if not found, inserts as before. Scoped to current character only — never merges across characters. Edit and delete paths are unchanged.

**Schema changes applied to live DB during INV-1 session (do NOT re-run):**
- `character_inventory` table: `deleted_at TIMESTAMPTZ` and `created_at TIMESTAMPTZ DEFAULT NOW()` columns added
- `items` table: `requires_attunement BOOLEAN DEFAULT false`, `is_public BOOLEAN DEFAULT false`, `original_item_id UUID` columns added
- RLS policy `character_inventory_select` added on `character_inventory`
- RLS policy `character_inventory_write` added on `character_inventory`

**Schema changes applied to live DB in previous sessions (do NOT re-run):**
- `characters` table: `conditions JSONB DEFAULT '[]'` and `exhaustion INT DEFAULT 0` columns added
- `features` constraint `features_category_check` widened to include all category values
- `adjust_spell_slot` RPC created
- `spell_slots_write_dm` RLS policy added

**Undocumented RLS helpers in live DB (discovered during 5b-5 testing):**
- `in_campaign(campaign_id UUID)` — returns true if the calling user has a membership row for that campaign
- `is_dm(campaign_id UUID)` — returns true if the calling user has `role = 'dm'` in that campaign
- These are referenced by RLS policies on several tables. If you add a new table and get 403 errors, add policies using these helpers.

---

### fix-weapon-delete-hitbox complete — `sheet.html` — Weapon delete button no longer opens edit modal

**Bug fixed:**
- Clicking the ✕ delete button on a weapon row was also triggering the row's edit-modal click handler.
- Root cause: the row used `setAttribute('onclick', ...)` (inline handler) and the delete button's inline handler called `deleteWeapon(...);event.stopPropagation()` — propagation was stopped too late, after the row's onclick had already fired.

**Fix — weapon row now matches the feature-card pattern exactly:**
- Row click wired via `tr.addEventListener('click', ...)` with a guard: `if (e.target.classList.contains('delete-btn')) return;`
- Delete button created via DOM (`document.createElement('button')`), NOT via innerHTML; its `addEventListener('click', ...)` calls `e.stopPropagation()` FIRST, then `deleteWeapon(weaponId)`.
- Inline `onclick` attribute on the `<tr>` is gone.
- Inline `onclick` attribute on the delete `<button>` is gone.

**Not touched:** feature/spell/cantrip handling (already worked correctly), CSS, schema, all other sections.

---

### edit-delete-weapons-features complete — `sheet.html` — Edit + Delete for weapons, features, cantrips, spells

**Edit (modal reuse):**
- Clicking a weapon row / feature card / cantrip chip / spell card opens the existing modal pre-filled in edit mode.
- Modals operate in two modes: "add" (insert, as before) and "edit" (UPDATE by id). `weaponEditId` / `featureEditId` track which mode. Both are `null` by default (add mode).
- Modal title, subtitle, and save button text change dynamically (`"Add Weapon"` / `"Edit Weapon"`, etc.) and reset when the modal closes.
- `openEditWeapon(id)` / `openEditFeature(id)` — look up by id in `cachedWeapons` / `cachedFeatures` / `cachedSpells`, pre-fill all readable fields, open modal.
- `resetWeaponModal()` / `resetFeatureModal()` — restore modal to add mode (called by ✕ button, overlay click, and after successful save).
- Edit covers: name, atk_bonus, dmg_dice, dmg_bonus, dmg_type, range, notes for weapons; name, category, recharge, description, spell level for features/cantrips/spells.
- **Definition JSON editing is intentionally NOT exposed** in edit mode — deferred to the combat-phase PR (see Deferred Items below).

**Delete (soft delete):**
- Each weapon row has a ✕ button; each feature card / cantrip chip / spell card has a ✕ control.
- Delete prompts `confirm("Delete this weapon?")` / `confirm("Delete this spell?")` etc. before acting.
- On confirm: sets `deleted_at = new Date().toISOString()` — never `.delete()` (rule 11).
- After delete, the relevant section re-renders.

**Read-only / lock state:**
- All edit and delete controls check `isReadOnly` — not rendered at all in read-only mode.
- `applyReadOnlyMode()` also runs `querySelectorAll('.delete-btn, .chip-delete')` and hides any that were rendered (belt-and-suspenders per rule requirements).
- DM viewing a player's sheet today gets read-only correctly. A future "lock" toggle will work with zero rework on edit/delete controls.

**Other implementation notes:**
- `cachedWeapons`, `cachedFeatures`, `cachedSpells` arrays populated by their respective `populate*()` functions; `openEditWeapon/Feature` looks up by id (no extra DB call).
- Overlay click on weapon/feature modal calls `resetWeaponModal/FeatureModal()` before closing so edit state is always cleared.
- Field-level UPDATE (rule 9), `.maybeSingle()` never `.single()` (rule 14), `crypto.randomUUID()` for new inserts (rule 15), error-checked Supabase calls (rule 12).
- `subscribeToCharacter()` calls all populate functions — live sync continues to work after edit/delete.

**No SQL needed:** Both tables already have `deleted_at`. Edits are field-level UPDATEs. No schema changes in this PR.

---

### FE-2 complete — `sheet.html` — Definition renderer + raw JSON authoring

**Definition renderer (`renderDefinition`):**
- Pure display function — formulas shown as text, nothing evaluated.
- Renders `features.definition` JSONB into human-readable rows on each feature card.
- Covered fields: `trigger` (event, activation, target), `cost` (action, resource × quantity),
  `targeting` (mode, range), `conditions` (lhs op rhs triples), `effects` (kind, formula,
  damage_type), `save` (stat + DC) with `on_fail` / `on_success` branches.
- Returns `''` for empty or missing definitions — no visual noise on old features.
- Appended inside `.feature-definition` block below the description on each card.

**Raw JSON authoring in Add Feature modal:**
- Collapsible "Definition JSON (optional)" section — toggle button expands textarea.
- `textarea#feature-definition-json` — monospace, 6 rows, resizable.
- Inline `.form-error#definition-json-error` — shown when JSON is invalid or root is not `{}`.
- `toggleDefinitionField()` — opens/closes the panel and flips the button label.
- `saveFeature()` — validates JSON before insert; rejects with readable error and focuses
  the textarea. On success: inserts `definition` field, resets textarea + toggle to collapsed.

**SQL run before this PR (column already exists per prompt):**
```sql
ALTER TABLE features ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}';
```
(The prompt confirmed the column already exists. No SQL to run before testing.)

---

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
- sheet.html — definition→readable-text renderer on every feature card (FE-2)
- sheet.html — Add Feature modal: raw JSON textarea + validator + definition saves to DB (FE-2)
- sheet.html — proficiencies, languages, equipment text load + save on blur
- sheet.html — personality (traits/ideals/bonds/flaws) + backstory load + save on blur
- sheet.html — currency loads from DB + editable on blur via adjust_currency RPC
- sheet.html — read-only mode: no editing, add buttons hidden, sync pill hidden
- sheet.html — DM view, player read-only view, own sheet — all three modes working
- sheet.html — conditions load/save from `characters.conditions` JSONB + exhaustion from `characters.exhaustion`
- sheet.html — spell slots load from `spell_slots` table; pip toggles via `adjust_spell_slot` RPC; totals editable inline
- sheet.html — spells/cantrips are features filtered by category; Add Cantrip + Add Spell reuse the feature modal
- sheet.html — weapons: click row to edit, ✕ to soft-delete (confirm step)
- sheet.html — features/cantrips/spells: click card/chip to edit, ✕ to soft-delete (confirm step)
- sheet.html — edit/delete controls hidden in all read-only modes; future lock toggle will work with zero rework
- sheet.html — inventory: loads from `character_inventory` joined to `items`; add via modal (Pick Existing or Create New); edit; soft-delete; read-only mode respected
- sheet.html — inventory stacking: Pick Existing re-adding an existing item_id increments quantity on the existing row instead of inserting a duplicate

---

## Deferred Items (from edit-delete-weapons-features PR)

### Deferred: Definition JSON editing in edit mode (rule 31)
The edit modal does NOT expose the `definition` JSONB field. When a user edits a feature that has a definition, the definition is preserved as-is in the database — it is never overwritten. Editing the definition is deferred to the combat-phase PR where the full block-editor UI belongs. Record in that PR's plan.

### Open design question: Character lock toggle (rule 31)
The prompt requires that edit/delete obey a future "lock character after creation" toggle. The controls already respect `isReadOnly` with zero extra code needed. The open design question — whether the lock reuses `characters.locked` or adds a separate `creation_complete` flag — is **undecided and not resolved in this PR**. Do not implement the toggle or the column until the DM and owner agree on the flag design.

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

## PR 5b-5 complete — `sheet.html` — Conditions + Spell Slots + Spells (Supabase wiring)

**Conditions:**
- `populateConditions(char)` — reads `char.conditions` (JSONB array) and `char.exhaustion`; sets `.active` on matching pills, sets `#exhaustion-value`
- `toggleCondition(name)` — async; optimistically toggles pill active state, then writes updated `conditions` array to `characters` table field-level
- `changeExhaustion(delta)` — async; replaces local-only version; clamps 0–6, writes `exhaustion` to `characters` table field-level
- `subscribeToCharacter()` callback now calls `populateConditions(payload.new)`
- Read-only: condition pill onclicks removed, exhaustion buttons disabled

**Spell Slots:**
- `populateSpellSlots()` — loads from `spell_slots` table (`.maybeSingle()`); renders all 9 levels dynamically into `#slots-grid`
- Pips show filled (remaining) / used (spent); filled pip click → `adjust_spell_slot(delta=+1)`, used pip click → `adjust_spell_slot(delta=-1)`
- `toggleSlotPip(pipEl)` — calls `adjust_spell_slot` RPC, then re-renders
- Slot total is editable inline (`contenteditable` span with dashed underline); blur saves via `saveSlotTotal(level, newTotal)`
- `saveSlotTotal(level, newTotal)` — inserts with `crypto.randomUUID()` if no row exists; updates `slots_total` JSONB field-level otherwise
- Read-only: pips not wired, `contenteditable` stripped by `applyReadOnlyMode()`

**Spells (resolved open question):**
- Spells are features, NOT a separate table. Stored in `features` where `category IN ('spell','cantrip')`.
- `populateSpells()` — filtered read from `features`; cantrips → `.cantrip-chip` spans in `#cantrip-chips`; leveled spells → `.spell-card` rows in `#spells-list`
- `openAddCantrip()` / `openAddSpell()` — reuse the feature modal, pre-selecting `cantrip` or `spell` and showing/hiding the Spell Level field
- `onFeatureCategoryChange(val)` — shows/hides the `#spell-level-wrap` field based on selected category
- `saveFeature()` updated: reads `source_level` (spell level 1–9 for spells, 0 for cantrips); calls `populateSpells()` after insert; resets category select and hides spell-level field
- `populateFeatures()` updated: now filters to non-spell categories (`in ['maneuver','action','passive','reaction','racial','fighting-style','homebrew']`) so spells don't double-render
- Read-only: Add Cantrip and Add Spell buttons hidden by `applyReadOnlyMode()`

**Feature modal updates:**
- Added `Spell` and `Cantrip` options to `#feature-category` select
- Added `#spell-level-wrap` div with a level 1–9 select (hidden until category = `spell`)
- `onchange="onFeatureCategoryChange(this.value)"` on category select

**State:**
- `currentSlots = { total, used, rowExists }` — tracks spell slot state between renders

**SQL run for this PR:**
```sql
CREATE OR REPLACE FUNCTION adjust_spell_slot(p_character_id UUID, p_level TEXT, p_delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE spell_slots
  SET slots_used = jsonb_set(
    slots_used, ARRAY[p_level],
    to_jsonb(GREATEST(0, LEAST(
      (slots_total->>p_level)::int,
      (slots_used->>p_level)::int + p_delta
    )))
  )
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

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

## Feature Engine Status

### FE-1 COMPLETE — @ namespace ratified
The @ namespace in FEATURE-ENGINE-SPEC.md is RATIFIED and LOCKED. Final set: 6 ability
mods; @char.level / @char.max_hp / @char.ac / @prof_bonus / @classes.{name}.level;
@slot_level / @spellcasting_mod / @spell_save_dc / @spell_attack_bonus;
@target.ac / @target.hp / @attack_total.
Rule: adding tokens later is safe; removing/renaming is NOT.

### FE-2 COMPLETE — definition renderer + raw JSON authoring
- `renderDefinition()` — definition JSONB → human-readable rows on feature card (permanent).
- Add Feature modal: collapsible JSON textarea + inline validator; saves `definition` to DB.
- `definition` column already existed. No SQL was run for this PR.

### FE-3 COMPLETE — Pure resolver `js/feature-resolver.js`
New file: `js/feature-resolver.js` — pure function, no DOM, no Supabase, no side effects.

**`window.FeatureResolver.resolve(definition, context) → ProposedOutcome`**

What it does:
- Resolves all `@namespace` tokens from the ratified spec against the context object.
- Evaluates conditions as structured triples `{ lhs, op, rhs }` using a switch over
  the eight ratified operators: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`.
  Never eval(). Condition operator list is now RATIFIED in FEATURE-ENGINE-SPEC.md.
- Evaluates formulas (`2d8 + @stats.cha.mod`) in three safe steps: token substitution →
  dice rolling (with individual result recording) → arithmetic evaluation (recursive
  descent parser, no eval()).
- Handles save branches `{ save, on_fail, on_success }` recursively — BOTH branches
  are always resolved so the DM card can display both outcomes before any state is written.
- Returns a `ProposedOutcome` with: `ok`, `conditions_met`, `conditions[]`, `effects[]`,
  `cost`. Every resolved effect carries a full audit trail: `formula_raw`,
  `formula_token_substituted`, `formula_dice_rolled`, `rolls[]`, `total`.

Context object shape (both sources):
- **Sheet values**: `stats.{stat}.mod`, `char.{field}`, `prof_bonus`, `classes.{name}.level`,
  `spellcasting_mod`, `spell_save_dc`, `spell_attack_bonus`
- **Combat values**: `slot_level`, `target.ac`, `target.hp`, `attack_total`
- **Test helper**: `_rollFn` — inject a deterministic `Math.random` replacement

Inline tests: `FeatureResolver.runTests()` — runnable in the browser console.
Covers: Divine Smite (2d8 + conditional), Fireball (save branch), Healing Word
(slot-scaling formula), negative modifiers, missing tokens, `in`/`not_in` operators.

No SQL was run for this PR. No UI changes. No existing files touched.

---

### NEXT TASK — PR 6: Layout persistence via ui_preferences
Phase 1 complete. PR 6 wires the Customise panel's section order and hidden-section
toggles to the `ui_preferences` table so layout state persists across sessions.
The `ui_preferences` table is already in DND-MASTER-PLAN.md Part Two.

### FE-4 — Wire resolver into combat (parallel track, after PR 6)
Feed `resolve(definition, context)` into the DM decision card in `combat.html`.
The DM's Apply/Adjust/Override decision triggers the SEPARATE commit step
(`commitOutcome`) that spawns `active_effects` and writes HP/resource deltas.
Compute and apply stay in different functions (the hard rule from the spec).

### PR 5b-5 COMPLETE — Conditions + Spell Slots + Spells (Supabase wiring)
See "PR 5b-5 complete" section above.

**OPEN QUESTION (now resolved):** Spells are features, NOT a separate table or
`characters.spells_known` column. The `features` table stores them with
`category IN ('spell','cantrip')`. `source_level` stores the spell level (0 for
cantrips, 1–9 for spells). No `spells` table was created. No `spells_known` column
was added to `characters`. The Spells section is a filtered view of `features`.

---

## Out-of-Band SQL Applied During PR 5b-5 Testing (rule 29)

The following SQL was run **manually in the Supabase SQL editor** during 5b-5 testing.
It is NOT in the migration history but IS now in the live database. Record here so
documented schema matches the live database. **Do NOT re-run — already applied.**

```sql
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS exhaustion INTEGER DEFAULT 0;

ALTER TABLE features DROP CONSTRAINT IF EXISTS features_category_check;
ALTER TABLE features ADD CONSTRAINT features_category_check
  CHECK (category IN ('maneuver','action','passive','reaction','racial',
                      'fighting-style','homebrew','spell','cantrip'));

CREATE OR REPLACE FUNCTION adjust_spell_slot(p_character_id UUID, p_level TEXT, p_delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE spell_slots
  SET slots_used = jsonb_set(slots_used, ARRAY[p_level],
    to_jsonb(GREATEST(0, LEAST((slots_total->>p_level)::int,
      (slots_used->>p_level)::int + p_delta))))
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "spell_slots_write_dm" ON spell_slots
  FOR ALL USING (
    character_id IN (
      SELECT c.id FROM characters c
      JOIN memberships m ON m.campaign_id = c.campaign_id
      WHERE m.user_id = auth.uid() AND m.role = 'dm'
    )
  );
```
