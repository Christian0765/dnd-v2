# FEATURE ENGINE SPEC — DND V2
# Read this before writing any feature-definition, resolver, or block-editor code.
# This document defines how features are stored, computed, and authored.
# It conforms to the combat philosophy in DND-MASTER-PLAN.md — it does not replace it.

---

## THE GOVERNING PRINCIPLE

The feature engine is the implementation of the master plan's combat philosophy:

> **A calculator with a DM override button, not a rules enforcer.**
> The app presents what *should* happen. The DM decides what *actually* happens.

The engine computes the by-the-book result automatically and completely — it resolves
formulas, checks conditions, rolls dice, and produces a full outcome ("miss, 7 damage").
But every result is a **proposal to the DM**, never a state change applied on its own.

- A player rolls badly but describes the attack well → DM taps "make it hit."
- An attack that should have missed → DM waves it through anyway.
- The numbers exist so the DM has an accurate baseline to deviate from. You cannot make
  an informed override if you don't know what the rules said in the first place.

This is why the engine computes automatically but never *enforces* automatically.

---

## THE ONE HARD RULE: COMPUTE, PROPOSE, NEVER WRITE

**The resolver is a pure function. It computes and proposes. It never writes state.**

```js
// The resolver — pure, no side effects, no database calls
resolve(definition, context) -> proposedOutcome
```

The resolver does NOT:
- call Supabase
- spawn `active_effects` rows
- adjust HP, currency, resources, or spell slots
- touch the database in any way

A **separate commit step**, triggered explicitly by the DM's decision, does all writing.

```js
// Pure: computes the proposal
const proposal = resolve(feature.definition, context);

// DM sees proposal in the decision card → taps Apply / Adjust / Override
// ONLY THEN does a separate function write to the database:
commitOutcome(proposal);  // this is the only thing that writes
```

This separation enforces the philosophy in code: the thing that computes literally
cannot apply, because applying lives in a different function the DM gates. It is also
good engineering — a pure resolver is testable in isolation (see Build Order, tier 3).

The DM decision card already sketched in DND-MASTER-PLAN.md Part Nine is the gate.
The engine fills the card in automatically; pressing the button is what commits it.

---

## THE @ NAMESPACE  ✅ RATIFIED — FE-1 COMPLETE

This is the frozen vocabulary of variable tokens that every formula resolves against.
The resolver can only bind a token that appears in this list. Changing a token forces
re-authoring of every feature that used it — so this list is now LOCKED.

**STATUS: RATIFIED. Feature data may be authored against this namespace.**
**Adding a new token later is safe (it breaks nothing). Removing or renaming a token is
NOT safe — it silently breaks every feature that referenced it. Treat additions as the
only permitted change, and add only tokens the resolver already handles.**

### Ability modifiers
| Token | Resolves to |
|-------|-------------|
| `@stats.str.mod` | Strength modifier |
| `@stats.dex.mod` | Dexterity modifier |
| `@stats.con.mod` | Constitution modifier |
| `@stats.int.mod` | Intelligence modifier |
| `@stats.wis.mod` | Wisdom modifier |
| `@stats.cha.mod` | Charisma modifier |

### Character tokens
| Token | Resolves to |
|-------|-------------|
| `@char.level` | Total character level |
| `@char.max_hp` | Maximum hit points |
| `@char.ac` | Armor class |
| `@prof_bonus` | Proficiency bonus (top-level — referenced constantly) |
| `@classes.{name}.level` | Level in a specific class — e.g. `@classes.paladin.level` (multiclass-aware; use this, NOT `@char.level`, for class-scaling features like smite) |

### Spellcasting tokens
| Token | Resolves to |
|-------|-------------|
| `@slot_level` | Level of the spell slot spent on this activation (for "scales with slot") |
| `@spellcasting_mod` | The character's spellcasting ability modifier — resolves to whichever ability this character casts with (int/wis/cha). Use this for generic spells, NOT a concrete `@stats.X.mod`, or the spell is wrong for other casting classes. |
| `@spell_save_dc` | 8 + `@prof_bonus` + `@spellcasting_mod` |
| `@spell_attack_bonus` | `@prof_bonus` + `@spellcasting_mod` |

### Context tokens (resolved from the current combat situation, not the sheet)
These have meaning ONLY mid-action. The resolver's `context` therefore has two sources:
the character sheet (stats, levels, spellcasting) and the live combat moment (target,
current roll). A context token cannot be exposed in the block palette until the combat
engine actually tracks the value it reads — `@target.hp` only works once combat tracks
target HP. This is the clearest case of "blocks cannot outrun the engine."
| Token | Resolves to |
|-------|-------------|
| `@target.ac` | AC of the current target |
| `@target.hp` | Current HP of the target |
| `@attack_total` | The full attack roll result for this action |

### Deferred tokens (intentionally NOT in the namespace yet)
Add these only when a concrete feature needs them and the resolver handles them. Listed
so future authors know they were considered and skipped on purpose, not forgotten:
- `@stats.{x}.score` (raw ability scores) — almost everything uses the modifier; no known
  feature reads a raw score.
- `@char.cur_hp` — only bloodied/damage-scaling features need it; rare. When added,
  express "bloodied" as a CONDITION (`@char.cur_hp <= @char.max_hp / 2`), do NOT mint a
  `@bloodied` boolean token — conditions hold comparisons, tokens hold raw values.
- `@char.initiative`, `@char.speed`, hit-dice count — features modify these, they don't
  read them into formulas; modifying is an effect targeting the value, not a token.

### Naming convention (LOCKED)
- Dotted paths, lowercase, snake_case for multi-word leaves (`prof_bonus`, `max_hp`).
- `{name}` placeholders are filled at resolve time from real data (class names, etc.).
- Every token MUST be resolvable by the resolver before it is allowed in a formula or
  a block slot. The palette of authorable tokens is a mirror of engine capability — never
  ahead of it (see "blocks cannot outrun the engine" below).

---

## THE `definition` JSONB SHAPE

Features store their executable rules in a single `features.definition` JSONB column.
Columns stay only for what is queried, filtered, or sorted (`name`, `category`,
`recharge`, `combat_timing`, `sort_order`). Everything executable lives in `definition`.

```json
{
  "trigger": {
    "event": "OnAttackRoll",
    "target": "self",
    "activation": "optional_on_hit"
  },
  "cost": {
    "resource": "spell_slot",
    "quantity": "1",
    "action": "bonus_action"
  },
  "targeting": {
    "mode": "single",
    "range": "self",
    "validators": ["is_creature"]
  },
  "conditions": [
    { "lhs": "@attack_total", "op": ">=", "rhs": "@target.ac" }
  ],
  "effects": [
    { "kind": "damage", "formula": "2d8", "damage_type": "radiant" }
  ]
}
```

### Conditions are structured triples, never strings
A condition is `{ "lhs": ..., "op": ..., "rhs": ... }`, evaluated by a small switch
statement that can ONLY compare. Never store an eval-able string.

This matters doubly because homebrew features are DM-authored and merged at runtime.
A string condition would be a code-injection vector. A triple cannot execute anything —
the engine walks a tree it already understands.

Allowed operators (ratified ✅ FE-3): `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`.

### Success / failure branches nest effect lists (do not flatten)
Saves and other pass/fail mechanics reuse the same effect schema recursively:

```json
{
  "save": { "stat": "dex", "dc": "@spell_save_dc" },
  "on_fail":    [ { "kind": "damage", "formula": "8d6", "damage_type": "fire" } ],
  "on_success": [ { "kind": "damage", "formula": "4d6", "damage_type": "fire" } ]
}
```

### Duration / status belongs to active_effects, not to the payload
A feature's payload describes *what to create*. The runtime instance lives in the
`active_effects` table (already in DND-MASTER-PLAN.md: `timing`, `duration_type`,
`rounds_remaining`, `concentration`). Keep the boundary clean: `definition` says
"spawn a +1d4 attack buff for 1 round"; the committed `active_effects` row IS that
buff. Do not duplicate duration handling inside `definition`.

---

## THE FORMULA LANGUAGE

Formulas are small expression strings combining literals, dice, and `@` tokens:
`2d8`, `+ @stats.cha.mod`, `@classes.paladin.level`, `8 + @prof_bonus + @spellcasting_mod`.

- Start with an explicit `@token` resolver (substitute known tokens, then evaluate the
  remaining arithmetic + dice), NOT a general expression parser. Vanilla JS, no build step.
- Never `eval()` a formula or a condition. Tokens resolve against the frozen namespace; the
  remaining expression is arithmetic + dice only.
- During the manual phase, formulas are authored in real token syntax but only *displayed*,
  not evaluated. See Build Order.

---

## TWO RENDERERS, ONE SCHEMA (PERMANENT)

The `definition` → readable-text renderer is NOT interim scaffolding. It is permanent:
even in full auto, the player must see what a feature does before triggering it, and the
DM must see it to override. So "definition → readable string" ships in the manual phase
and stays forever.

Later the block editor adds two more views over the same schema:
- `definition` → blocks (load a feature for editing)
- blocks → `definition` (save)

---

## BUILD ORDER — STAGED SO NOTHING IS THROWAWAY

The full auto-applying engine is the target; the manual option is the interim. They are
ONE data model with the evaluator turned off at first. Author the complete `definition`
JSON from day one; in the manual phase the engine only reads `name`, `recharge`, and a
readable description — the condition/formula objects sit there unused until the resolver
exists. No migration of features later; just switch on code that reads fields already
populated.

### Tier 1 — Freeze the @ namespace  ✅ DONE
The namespace above is RATIFIED. Operator list for conditions still to be confirmed in
the open items below before condition-bearing features are authored. Output: ratified
namespace in this document (see "THE @ NAMESPACE").

### Tier 2 — JSONB column + manual text renderer + raw JSON authoring
- `ALTER TABLE features ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}';`
- Build the `definition` → readable-text renderer (permanent — see above).
- For authoring during the manual phase: a raw JSON textarea + a JSON-schema validator
  (the DM/owner is the only author at this stage). The pretty form comes later.
- Formulas are displayed, not evaluated. Real, shippable PR with zero engine code.

### Tier 3 — Build the resolver in isolation
A pure function `resolve(definition, context) -> proposedOutcome`. No UI, no combat, no
writes. Test it against the `definition` blobs already authored in tier 2 — they are the
test corpus. When it resolves every owned feature correctly against a fake context, only
then wire it in.

### Tier 4 — Wire the resolver into combat
The resolver feeds the DM decision card. The DM's Apply/Adjust/Override decision triggers
the SEPARATE commit step that spawns `active_effects` and applies HP/resource deltas.
Compute and apply stay in different functions. (See "the one hard rule.")

### Tier 5 — Block editor (homebrew authoring) — AFTER the engine works
A visual, typed-slot block system so the DM can author homebrew without touching JSON,
emitting exactly the `definition` schema the engine already executes.

**Blocks cannot outrun the engine.** A block type or slot value exists ONLY if the engine
already handles it. Otherwise the DM composes something that validates, saves, and silently
does nothing in combat — worse than a textarea, because the UI promised it would work. The
palette is a mirror of engine capability, never ahead of it. This is why tier 5 is last.

**Typed slots are mandatory.** Every block has a type and emits a type; every slot accepts
only certain types (a number slot takes a literal, a formula block, or a dice block; a
condition slot takes only condition blocks; a branch is two effect-list slots). When slots
are typed, a malformed feature is unrepresentable — the UI enforces the schema by
construction, and there is no free-text string for homebrew to inject through.

Tier 5 ships as a progression, each step shippable and built ON the previous (not
replacing it). Prebuilt templates ARE saved block assemblies — the same JSON the editor
emits — so the prebuilt library is the free-composition engine with the canvas hidden:

- **5a — Assembly format + loader.** Define the block tree as data; write tree→JSON (save)
  and JSON→tree (load). No drag-and-drop. Validate by round-tripping a hand-written tree.
  Load-bearing; mostly logic, not UI.
- **5b — Edit-in-place on prebuilt templates.** Ship a library of whole-feature assemblies
  (authored in the real schema). The DM opens one and edits *slot values only* — swap
  damage type, bump a die, change cost. No restructuring yet. Covers most real homebrew at
  a fraction of editor cost.
- **5c — Structural editing.** Add/remove/reorder blocks within typed slots (second effect,
  conditional bonus, save branch). Drag-and-drop + typed-slot enforcement land here.
- **5d — Blank canvas.** The structural editor started empty. By now every block type, slot
  rule, and load/save path is hardened by 5b/5c, so the canvas adds almost no new machinery.
  "Complete creative control" is the SMALLEST increment, not the biggest.

The prebuilt library is also a **governor**: only publish templates whose every block the
engine already runs, so authoring stays inside proven engine capability while the engine
catches up. What the DM can compose widens exactly as fast as what the engine can execute.
They meet at 5d.

### Template unit (recorded decision)
Seed **whole-feature templates first** ("Divine Smite," "Sneak Attack," "Rage") — concrete,
recognizable, what the DM clones and tweaks in 5b. **Harvest fragment templates later**
("scale by class level," "once per turn" guard, "DC = 8 + prof + stat" save block) — they
are literally subtrees of the whole features already built, and they make 5c/5d fast.

Full creative control (5d) is the acknowledged end goal, not yet obtainable: it depends on
the resolver covering the full namespace and the combat loop firing every trigger event.
The prebuilt route is the on-ramp.

---

## OPEN ITEMS BEFORE TIER 1 IS DONE
- [x] Ratify the @ namespace. **DONE.**
- [x] Confirm the condition operator list: **RATIFIED in FE-3.** Operators are
      `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`. Implemented in resolver.
- [ ] Confirm the closed vocabulary for `trigger.event`, `cost.resource`,
      `cost.action`, `targeting.mode`, and `effect.kind` (each must map to an engine
      capability before any block exposes it).
