# INV-2 — Edit item core + inventory table redesign (sort, weight, gold)

## What was built
Two related pieces of inventory work, both in `sheet.html`.

### 1. Edit item core fields (DM edits shared / players fork)
The inventory edit modal now exposes an item's core fields (name, category, weight, value,
requires-attunement, description) alongside the per-character entry fields it already edited
(quantity, equipped, attuned, notes). How a core edit saves depends on role:

- **DM** sees two buttons: **Save for Everyone** (UPDATE the shared `items` row in place,
  changing it for every character in the campaign that holds it) and **Save as Copy** (fork).
- **Player** sees only **Save as Copy** — a fork. They never edit the shared item.

A fork inserts a new `items` row (`crypto.randomUUID()`, `original_item_id` = the source item,
`source: 'player'`), copies the edited core fields onto it, then re-points the current
`character_inventory` row's `item_id` at the new item. It never runs the stacking/increment
path, so it cannot collide with the `(character_id, item_id)` uniqueness fixed in INV-1.
The entry-field save (qty/equipped/attuned/notes) runs first in both modes so a combined edit
persists fully.

### 2. Inventory table redesign — alignment, sorting, weight + gold
- **Column alignment fixed.** The table now uses `table-layout: fixed` with a `<colgroup>` of
  explicit column widths. Previously each row sized its own columns from content, so columns did
  not line up down the page. Numeric columns are right-aligned.
- **Sortable headers.** Item, Type, Qty, Wt, and Gold are clickable; click to sort, click again
  to reverse. A up/down arrow marks the active column and direction. Default: name, ascending.
- **Weight + Gold columns.** Each row shows quantity x weight and quantity x value_gp.
- **Totals footer.** Sums total carried weight and total item gold value across the inventory.
  (This delivers the carried-weight calculation that INV-1 deferred to INV-2.)

> Scope note: this branch intentionally bundles the item-core edit with the table
> display/sort/totals work. Future inventory PRs will stay split per rule 1.

## Files changed
- `sheet.html` only.

## What was NOT touched
Weapons, features, spells, skills, HP, currency, header, the inventory add/stack/delete paths,
weapons/armor auto-flow (still deferred), `campaign.html`, `home.html`, `login.html`,
`combat.html`, all `/css/` and `/js/` files.

## RUN BEFORE TESTING
Run in the Supabase SQL editor before checking out and testing this branch. These enforce the
role rule at the database level - the UI hiding the DM button is not a security boundary.

    -- Only the campaign DM may UPDATE shared item rows.
    CREATE POLICY "items_update_dm" ON items
      FOR UPDATE USING ( is_dm(campaign_id) );

    -- Members may INSERT items into their own campaign (covers forking + INV-1 "Create New").
    -- SKIP this statement if an items INSERT policy already exists (INV-1 added one for the
    -- "Create New" flow - check the items policies first; a duplicate name will error).
    CREATE POLICY "items_insert_member" ON items
      FOR INSERT WITH CHECK ( in_campaign(campaign_id) );

Additive and reversible (rule 26). Uses the is_dm / in_campaign helpers already in the DB.

## Test plan
**Edit item core**
1. **DM edit-in-place propagates.** As DM, give two characters the same campaign item. Edit it on
   one, rename it, **Save for Everyone**. The second character shows the new name too.
2. **Player fork is private.** As a player, edit a held item, rename it, **Save as Copy**. Your
   sheet shows the new name; another character holding the original still shows the old name.
   Confirm a new items row exists with source = 'player' and original_item_id set.
3. **Player cannot edit in place.** As a player, only **Save as Copy** shows. Confirm
   items_update_dm blocks a player UPDATE on a shared item.
4. **No accidental stacking on fork.** Fork an item you already hold elsewhere - distinct new row,
   not a quantity merge, no "multiple rows returned" error.

**Table display / sort / totals**
5. **Columns line up** down the page regardless of item-name length; numbers are right-aligned.
6. **Sorting.** Click Item / Type / Qty / Wt / Gold - sorts correctly; clicking again reverses;
   the arrow tracks the active column.
7. **Weight + gold.** A row with quantity 3 and weight 2 shows 6.0 Wt; value 5 gp shows 15.00 Gold.
8. **Totals footer** equals the sum of the rows above it for both weight and gold.

**Shared**
9. **Add flow still works.** Close the edit modal, open "Add Item" - mode bar and single
   "Add to Inventory" button are back; Pick Existing and Create New both still stack correctly.
10. **Read-only viewer.** As a player viewing another player's sheet, rows are not clickable and
    the edit modal cannot be reached.

## Notes / suggestions (not built - rule 31)
- The **Gold column is item value** (quantity x value_gp), which is distinct from the
  character's coin purse in the currency table. The purse is not shown near inventory; surfacing
  it there is a possible follow-up.
- saveInventoryEntry's edit branch is now effectively dead code (edit mode routes through
  saveItemCore). Left in place to keep the diff focused; worth removing in a small follow-up.
- A category change here can move a weapons/armor item without the Weapons-tab/AC flow reacting -
  that interaction is the separate deferred inv-2-weapon-flow PR.

## HANDOFF.md
Final commit on this branch updates HANDOFF.md (rule 28): record the edit-core behavior, the
table redesign, the SQL policies run, and that carried-weight is now delivered (remove it from the
INV-2 deferred list; leave weapons/armor auto-flow deferred).
