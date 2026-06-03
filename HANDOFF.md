# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

### PR 3 — `home.html` — campaign lobby (list, create, join campaigns)
- `home.html` — campaign lobby landing page after login
- Fixed top bar with site title and signed-in user's display name
- "Create Campaign" modal — inserts into `campaigns` and `memberships` (role: dm), redirects to `campaign.html?c={id}`
- "Join Campaign" modal — looks up campaign by UUID, inserts into `memberships` (role: player), redirects to `campaign.html?c={id}`
- Campaign grid (3-col desktop, 1-col mobile) showing name, role badge, created date
- Empty state when user has no campaigns
- Soft-delete aware — filters out campaigns with `deleted_at` set
- All Supabase calls have error handling; all user strings pass through `escHtml()`

### PR 2 — `login.html` — sign in / sign up page
- `login.html` — email/password sign in and sign up with Supabase Auth
- Tab-switching UI (Sign In / Sign Up)
- Client-side validation: empty fields, short password, mismatched passwords
- Redirects to `home.html` on success; redirects away if already signed in
- Session-expired banner in place
- No Supabase data queries — auth only

### PR 1 — Project structure: /css/, /js/, /data/ folders and all shared files
- `index.html` — redirect entry point (auth check → home.html or login.html)
- `/css/variables.css` — all CSS custom properties for the entire project
- `/css/base.css` — reset, body styles, scrollbars, standard animations
- `/css/components.css` — buttons, cards, modals, forms, sync pill, toast, divider, session banner
- `/js/supabase-client.js` — single Supabase client initialization
- `/js/auth.js` — requireAuth, getSession, getUser, getMembership, isDM, signOut
- `/js/theme.js` — loadAndApplyTheme, applyThemePreset, applyAccentColor, saveAccentColor, saveCampaignTheme
- `/js/utils.js` — escHtml, formatDate, hexToRgb, darkenHex, debounce, showToast, generateInviteCode
- `/data/rulesets/5e-2014/sheet_schema.json` — section list for 5e 2014 sheets
- `/data/rulesets/5e-2014/classes/fighter.json` — Fighter class data (Battle Master subclass)

---

## What's Working

- Sign in and sign up with email/password via Supabase Auth. Redirects to `home.html` on success.
- Campaign lobby loads after login. Reads memberships + campaigns from Supabase.
- Create Campaign writes to `campaigns` and `memberships` tables, redirects to `campaign.html?c={id}`.
- Join Campaign by UUID — creates player membership and redirects.
- Sign out works (via `signOut()` in auth.js).
- Shared CSS variables, base styles, and components defined.
- Shared JS modules created (auth, theme, utils, supabase-client).
- Fighter class JSON data file created.
- `index.html` redirects authenticated users to `home.html`, unauthenticated to `login.html`.

---

## Current File Structure

```
dnd-v2/
├── index.html
├── login.html
├── home.html
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
```

---

## Known Issues

- None at this stage.

---

## What The Next Agent Should Build

**PR 4 — `campaign.html`** — main campaign page (party overview, DM tools)

- Party overview showing all character cards (name, class, HP, AC)
- Real-time sync of HP and character status via Supabase Realtime
- DM panel: campaign settings, NPC list, quest list, session notes
- Navigation links to `sheet.html?c={id}` and `combat.html?c={id}`
- Reads/writes: `characters`, `campaigns`, `npcs`, `quests` tables
- URL: `campaign.html?c={campaignId}`
