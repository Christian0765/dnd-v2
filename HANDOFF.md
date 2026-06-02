# HANDOFF — DND V2
# Read this before writing any code. This is the source of truth for project state.

---

## What's Been Built

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

- Shared CSS variables, base styles, and components defined
- Shared JS modules created (auth, theme, utils, supabase-client)
- Fighter class JSON data file created
- `index.html` redirects authenticated users to `home.html`, unauthenticated to `login.html`

---

## Current File Structure

```
dnd-v2/
├── index.html
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

- None at this stage. No features built yet — foundation only.

---

## What The Next Agent Should Build

**PR 2 — `login.html`** — sign in and sign up page

- Email/password sign in
- Sign up with display name, email, password
- Creates a row in `profiles` table on sign up
- Redirects to `home.html` on success
- Uses the design system (dark card, gold headings, form fields from components.css)
- Includes session-banner for token expiry
- No Supabase data queries beyond auth
