# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

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

### BUG — profiles row not always created on signup

**Symptom:** When a new user signs up, they sometimes land in `auth.users` 
but NOT in `profiles`. This causes a foreign key error when they try to join 
or create a campaign:
`insert or update on table "memberships" violates foreign key constraint "memberships_user_id_fkey"`

**Affected accounts found so far:**
- `8b2caacd-647f-4340-add7-6e99848c3339` (crm070506@gmail.com) — profile row 
  was missing, manually inserted with display_name 'Poop'

**Workaround (manual fix):**
```sql
INSERT INTO profiles (id, display_name)
VALUES ('{user_id_from_auth.users}', '{display_name}');
```

**Root cause (unknown — needs investigation):**
The signup flow in `login.html` runs this after `supabase.auth.signUp()`:
```js
if (authData?.user) {
  await supabaseClient.from('profiles').insert({
    id: authData.user.id,
    display_name: displayName
  });
}
```
Possible causes:
1. `authData.user` is null or undefined on some signups — the insert is 
   silently skipped
2. The profiles INSERT is failing silently (no error handling on it)
3. Supabase email confirmation is interfering — if confirmation is required,
   `authData.user` may not be fully formed at signup time

**What the next agent should do:**
1. Add proper error handling and console logging to the profiles insert in 
   `login.html` so failures are visible
2. Check if `authData.user` is ever null after a successful `signUp()` call
3. Consider adding a fallback: on every page load, check if the current user 
   has a profiles row and create one if missing
4. Fix must not break existing working signups

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

- ### Planned Cleanup (do after sheet.html is fully complete)
- Reorganize HTML files into /pages/ subfolder
- This requires updating ALL relative paths in every HTML file:
  - All href="filename.html" → href="pages/filename.html" (from root)
  - All href="../css/..." and href="../js/..." (from inside /pages/)
  - All window.location.href redirects in every JS block and auth.js
  - The redirectTo URL in login.html password recovery
  - index.html stays in root — GitHub Pages requires it there
- Do this as one dedicated PR with no other changes
- Do NOT do this while sheet.html is still being built
