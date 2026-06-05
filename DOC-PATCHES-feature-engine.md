# DOC PATCHES — Feature Engine Direction
# Apply these edits to your existing files. Each patch shows WHERE and WHAT.
# I did not regenerate the whole files — these are surgical edits so nothing
# else in those documents drifts.

═══════════════════════════════════════════════════════════════════════════════
PATCH 1 — DND-MASTER-PLAN.md
═══════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────
1a. In "THE CORE PHILOSOPHY" → "The Math Philosophy (Combat)" section,
    ADD this line at the END of that paragraph (philosophy itself UNCHANGED —
    the engine conforms to it, it does not replace it):
────────────────────────────────────────────────────────────────────

> The feature engine (see FEATURE-ENGINE-SPEC.md) is the implementation of this
> philosophy: it computes the by-the-book result automatically and completely, then
> presents it to the DM as a proposal to accept, adjust, or override. Computing
> automatically is not enforcing automatically — the resolver never writes state; a
> separate DM-gated commit step does. "Calculator with a DM override button" is
> exactly what the engine builds.

────────────────────────────────────────────────────────────────────
1b. In "PART THREE — CHARACTERS" → the `features` table,
    ADD the `definition` column. Find this block:
────────────────────────────────────────────────────────────────────

  affects_save BOOLEAN DEFAULT FALSE,
  combat_timing TEXT DEFAULT 'none'
    CHECK (combat_timing IN ('none','pre_roll','post_roll','reaction','passive')),
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ

REPLACE WITH:

  affects_save BOOLEAN DEFAULT FALSE,
  combat_timing TEXT DEFAULT 'none'
    CHECK (combat_timing IN ('none','pre_roll','post_roll','reaction','passive')),

  -- Executable rule definition (see FEATURE-ENGINE-SPEC.md).
  -- Holds trigger / cost / targeting / conditions / effects as structured JSON.
  -- Columns above stay for querying/filtering; everything executable lives here.
  definition JSONB DEFAULT '{}',

  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ

────────────────────────────────────────────────────────────────────
1c. In "PART FOURTEEN — SQL TO RUN", ADD a new subsection
    (place it after "Run before PR 5b-4:"):
────────────────────────────────────────────────────────────────────

### Run before Feature Engine Tier 2:
```sql
ALTER TABLE features
  ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}';
```

────────────────────────────────────────────────────────────────────
1d. In "PART SIXTEEN — FULL BUILD ORDER", ADD a new phase block
    (place it after "Phase 3 — Combat System", before "Phase 4 — Tactical Map"):
────────────────────────────────────────────────────────────────────

### Phase 3.5 — Feature Engine (see FEATURE-ENGINE-SPEC.md)
Conforms to the combat philosophy: computes & proposes, never enforces.
Author full `definition` JSON from the start; manual phase only displays it.

| PR | What |
|----|------|
| FE-1 | Freeze the @ namespace (ratify the draft in FEATURE-ENGINE-SPEC.md). No code. |
| FE-2 | `definition` JSONB column + definition→readable-text renderer + raw JSON authoring textarea + schema validator. Formulas displayed, not evaluated. |
| FE-3 | Resolver as a pure function `resolve(definition, context)→proposal`. No UI, no writes. Tested against tier-2 authored data. |
| FE-4 | Wire resolver into the DM decision card. DM Apply/Adjust/Override triggers a SEPARATE commit step that spawns active_effects / applies deltas. |
| FE-5a | Block assembly format + tree↔JSON loader/serializer. No drag-and-drop. |
| FE-5b | Edit-in-place on prebuilt whole-feature templates (slot values only). |
| FE-5c | Structural block editing — add/remove/reorder within typed slots; drag-and-drop. |
| FE-5d | Blank-canvas free composition (end goal). |


═══════════════════════════════════════════════════════════════════════════════
PATCH 2 — DND-ARCHITECTURE-SPEC.md
═══════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────
2a. In the `features` table, ADD the `definition` column. Find:
────────────────────────────────────────────────────────────────────

  formula TEXT,
  recharge TEXT,
  source_class TEXT DEFAULT '',
  source_level INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ

REPLACE WITH:

  formula TEXT,
  recharge TEXT,
  source_class TEXT DEFAULT '',
  source_level INTEGER DEFAULT 1,

  -- Executable rule definition. See FEATURE-ENGINE-SPEC.md for the full shape.
  definition JSONB DEFAULT '{}',

  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ

────────────────────────────────────────────────────────────────────
2b. In "Core Principles", ADD a 7th principle after #6:
────────────────────────────────────────────────────────────────────

7. **The feature engine computes but never enforces** — feature rules are stored as
   structured JSON in `features.definition` and resolved by a pure function that
   produces a *proposal*. A separate DM-gated commit step is the only thing that writes
   state. See FEATURE-ENGINE-SPEC.md. This implements the master plan's "calculator with
   a DM override button" philosophy.
