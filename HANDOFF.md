# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

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
- Includes auth.js and utils.js (will be wired in PR 5b)

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
- Create Campaign modal — uses `crypto.randomUUID()` client-side to generate campaign ID before insert (avoids RLS timing issue on chained `.select()`)
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

---

## Known Issues & Fixes Applied

### RLS on campaigns table
- `campaigns_insert` policy: `WITH CHECK (true)` — allows any authenticated user to insert
- `campaigns_select` policy: only returns campaigns the user is a member of
- `campaigns_update` policy: only allows DMs to update
- Do NOT chain `.select('id').single()` after a campaign insert — the membership row doesn't exist yet so the SELECT policy blocks it. Always use `crypto.randomUUID()` to generate the ID client-side instead.

### profiles table
- The `handle_new_user` trigger was dropped — profiles are created manually in login.html after signup
- Profile rows must exist before memberships can be inserted (foreign key constraint)
- If a user exists in auth.users but not profiles, insert manually:
  `INSERT INTO profiles (id, display_name) VALUES ('{user_id}', '{name}');`

### auth.js path fix
- All redirects use relative paths: `login.html` not `/login.html`
- Site lives at `christian0765.github.io/dnd-v2/` — absolute paths cause 404s

### Planned features (not built yet)
- Display name change from within the app (currently must be done via SQL)

---

## Current File Structure
dnd-v2/
├── index.html
├── login.html
├── home.html
├── campaign.html
├── sheet.html                  ← PR 5a-2: + HP, death saves, saving throws, skills
├── supabase-config.js.template
├── HANDOFF.md
├── DND-ARCHITECTURE-SPEC.md
├── AGENT-RULES.md
├── FILE-ORGANIZATION.md
├── .gitignore
├── README.md
│
├── /css/
│   ├── variables.css
│   ├── base.css
│   └── components.css
│
├── /js/
│   ├── supabase-client.js
│   ├── auth.js
│   ├── theme.js
│   └── utils.js
│
└── /data/
    └── /rulesets/
        └── /5e-2014/
            ├── sheet_schema.json
            └── /classes/
                └── fighter.json

---

## What The Next Agent Should Build

**PR 5b — `sheet.html` Supabase wiring**
Wire up all sections to Supabase:
- Read `?c=campaignId`, look up character via membership
- Field-level saves on blur for every input
- Atomic HP adjustments via RPC (`adjust_hp`)
- Real-time subscription so DM edits appear live
- Create Character flow if no character exists yet
- Reads/writes: `characters`, `currency`, `weapons`, `features`, `resources`, `spell_slots`, `character_inventory`
