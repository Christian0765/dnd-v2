# INV-2 — Edit item core fields (DM edits shared / players fork)

## What was built
The inventory edit modal now exposes an item's core fields (name, category, weight, value,
requires-attunement, description) in addition to the per-character entry fields it already
edited (quantity, equipped, attuned, notes). How a core edit is saved depends on role:

- **DM** sees two buttons: **Save for Everyone** (UPDATE the shared `items` row in place,
  changing it for every character in the campaign that holds it) and **Save as Copy** (fork).
- **Player** sees only **Save as Copy** — a fork. They never edit the shared item.

A fork inserts a new `items` row (`crypto.randomUUID()`, `original_item_id` = the source item,
`source: 'player'`), copies the edited core fields onto it, then re-points the current
`character_inventory` row's `item_id` at the new item. It never runs the stacking/increment
path, so it cannot collide with the `(character_id, item_id)` uniqueness fixed in INV-1.

The add/stack flow (`saveInventoryEntry`) is unchanged; in edit mode its button is hidden and
the two new buttons take over. The entry-field save (qty/equipped/attuned/notes) runs first in
both save modes so a core edit and an entry edit committed together both persist.

## Files changed
- `sheet.html` only.

## What was NOT touched
Weapons, features, spells, skills, HP, currency, header, the inventory *add*/stack/delete paths,
carried-weight (still deferred), weapons/armor auto-flow (still deferred), `campaign.html`,
`home.html`, `login.html`, `combat.html`, all `/css/` and `/js/` files.

## RUN BEFORE TESTING
Run in the Supabase SQL editor before checking out and testing this branch. These enforce
the role rule at the database level — the UI hiding the DM button is not a security boundary.

```sql
-- Only the campaign DM may UPDATE shared item rows.
CREATE POLICY "items_update_dm" ON items
  FOR UPDATE USING ( is_dm(campaign_id) );

-- Members may INSERT items into their own campaign (covers forking + INV-1 "Create New").
-- SKIP this statement if an items INSERT policy already exists (INV-1 added one for the
-- "Create New" flow — check the items policies first; a duplicate name will error).
CREATE POLICY "items_insert_member" ON items
  FOR INSERT WITH CHECK ( in_campaign(campaign_id) );
```

Additive and reversible (rule 26). Uses the `is_dm` / `in_campaign` helpers already in the DB.

## Test plan
1. **DM edit-in-place propagates.** As DM, give two characters the same campaign item. Open one
   character's inventory, edit the item, rename it, **Save for Everyone**. Open the second
   character — the name changed there too.
2. **Player fork is private.** As a player, edit an item you hold, change the name, **Save as
   Copy**. Your sheet shows the new name; a different character holding the original still shows
   the old name. Confirm a new `items` row exists with `source = 'player'` and
   `original_item_id` set to the original.
3. **Player cannot edit in place.** As a player, confirm only **Save as Copy** is shown. In the
   Supabase SQL editor, attempt an UPDATE on a shared item row as that user (or reason about the
   policy) — `items_update_dm` should block it.
4. **No accidental stacking on fork.** Fork an item you already hold elsewhere; confirm you get a
   distinct new row, not a quantity merge, and no "multiple rows returned" error.
5. **Add flow still works.** Close the edit modal, open "Add Item" — the mode bar and the single
   "Add to Inventory" button are back; Pick Existing and Create New both still work and still stack.
6. **Read-only viewer.** As a player viewing another player's sheet (read-only), confirm rows
   are not clickable and the edit modal cannot be reached.

## Notes / suggestions (not built — rule 31)
- `saveInventoryEntry`'s edit branch (the old entry-only UPDATE) is now effectively dead code,
  since edit mode routes through `saveItemCore`. Left in place to keep this diff to one behavior;
  worth removing in a small follow-up.
- Category change here can move a `weapons`/`armor` item without the Weapons-tab/AC flow reacting —
  that interaction is the separate deferred `inv-2-weapon-flow` PR.
