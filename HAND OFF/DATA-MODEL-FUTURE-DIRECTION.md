# FUTURE DATA-MODEL DIRECTION — Unifying Item Stats Into `items`
# Status: DECIDED IN PRINCIPLE, NOT YET BUILT.
# This is a recorded design decision, not a build plan. Read before any PR that
# touches how items or weapons store their stats. Per AGENT-RULES rule 32, a PR
# that begins implementing this MUST first flag the conflict with
# DND-ARCHITECTURE-SPEC.md and get explicit owner sign-off, then update the spec.

---

## ONE-LINE SUMMARY

Long term, item type-specific stats (weapon dice, healing dice, magic charges, etc.)
should live ON the `items` table — lean real columns for the universal/searchable
fields, and the existing `properties JSONB` column for everything type-specific — so
that one catalog table serves every item type and scales to thousands of items without
sprawling. Weapons become the first item type to adopt this. This is NOT built yet; the
current split (`items` for bag data, `weapons` for combat stats) still stands.

---

## WHY THIS DIRECTION (the reasoning, preserved)

The question that drove this: "If a weapon is really just an item with combat stats,
why keep them in two tables? And how would one table hold the different fields each
item type needs — weapon dice, healing dice, magic charges — especially at thousands
of items?"

The answer landed on a **hybrid model**, which is the standard professional design and
the one this project's schema was already set up for:

1. **Lean real columns for the universal, searchable fields.**
   `name`, `category`, `weight`, `value_gp` stay as real columns on `items`. Rule of
   thumb: *if you filter or sort by it across all items, it earns a real column.*
   `category` is already a real column — that's the field the whole list filters by.

2. **`properties JSONB` for the type-specific fields.**
   The `items` table ALREADY has `properties JSONB DEFAULT '{}'`. Each item type stores
   its own shape there, with no schema change when a new type is invented:
   - weapon:  `{ "dmg_dice": "1d8", "dmg_type": "slashing", "atk_bonus": 0, "range": "5 ft" }`
   - healing: `{ "healing_dice": "2d4", "uses": 3 }`
   - magic:   `{ "charges": 7, "save_dc": 15, "recharge": "dawn" }`
   Rule of thumb: *if it only matters once you're already viewing that one item, it goes
   in JSONB.*

   This is why a "wide flat table" (a real column for every possible field) was rejected:
   it bloats with empty columns and needs a schema change per new item type. JSONB
   sidesteps both and scales to many item types cleanly.

3. **Characters hold thin REFERENCES, not copies.**
   `character_inventory` already works this way: each row points at an `items` id with a
   quantity. The catalog data is never duplicated onto the character. This is what avoids
   the drift problem (the same item's stats existing in many places, drifting out of
   sync) and keeps a player's sheet fast — a character with 30 items loads 30 rows, not
   the whole 3,000-item catalog.

   NOTE — the trap to avoid: do NOT copy item data into per-character tables. References,
   not copies. Duplication recreates the drift problem at scale.

4. **Heavy catalog loading happens in the DM's add-flow, paginated/searched.**
   Loading the full catalog only happens when the DM is browsing to decide what to add —
   a moment where a small delay is acceptable (they are reading and choosing, not in
   combat). At thousands of items this must be **paginated or search-limited**: the
   add-screen should query the DB with a limit / search filter rather than loading every
   item into the browser and filtering client-side. The current `loadCampaignItems` /
   `filterItemPickList` flow loads everything and filters in-browser; the scale upgrade is
   to push the search to the database with a limit.

---

## HOW THIS RELATES TO WHAT IS ALREADY BUILT

- `weapon-send-to-attacks` (merged) created the link `weapons.source_inventory_id`,
  connecting a weapon attack-row back to the inventory item it came from.
- **That link is the migration bridge.** When this refactor happens, the path is roughly:
  copy each weapon's stats into its linked item's `properties`, then point the Weapons-tab
  rendering at the item's `properties` instead of a separate `weapons` row.
- To keep this door open, every PR built before the refactor MUST:
  - keep `weapons` and its columns intact (additive only — rule 26; never DROP),
  - keep `source_inventory_id` populated on anything it creates.

---

## RULE CONFLICTS A REAL IMPLEMENTATION MUST HANDLE

This refactor touches the three things AGENT-RULES is most protective of. None is a
blocker; each must be handled explicitly:

- **Rule 5 (don't break working features).** Inventory (stacking, forking, pick list,
  rendering) is listed as working in HANDOFF. This refactor deliberately reaches into
  that code, so the prompt must say so explicitly AND regression-test every inventory
  behavior that already works.
- **Rule 3 / Rule 32 (architecture spec is source of truth).** The spec deliberately
  separated combat stats (`weapons`) from bag data (`items`). A PR implementing this must
  FLAG that conflict to the owner, get an explicit "yes, change the documented model,"
  and UPDATE DND-ARCHITECTURE-SPEC.md so docs and code stay honest.
- **Rule 1 (one feature per PR).** This is really two PRs, not one:
  1. the data-model migration (move weapon stats into `items.properties`; repoint the
     Weapons-tab reads), tested on its own;
  2. then any UI built on top of the new foundation.
  Do not bundle them.
- **Rule 26 (additive/reversible schema).** Adding columns/keys is fine. Do NOT drop the
  `weapons` table or its columns as part of this — keep it intact for reversibility and to
  preserve the migration bridge.

---

## SEQUENCING DECISION (recorded)

The decision was to **ship the simple create-weapon-builder first** (reusing the existing
send-to-attacks linking, stats on the weapon row), and adopt this hybrid model later as a
deliberate, dedicated effort — rather than refactoring the foundation before the system
has been felt in practice. Rationale: the foundation will be designed better with concrete
experience of multi-field items, the simple builder stays inside the rules, and the
`source_inventory_id` link keeps this refactor's door open at near-zero cost.

When the time comes, this document is the starting point for that build plan.
