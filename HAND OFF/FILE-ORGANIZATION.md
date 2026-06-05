# FILE ORGANIZATION — DND V2
# This document defines exactly where every file lives and why.
# Read this before creating any new file.

---

## Root Structure

```
dnd-v2/
│
├── 📄 index.html                    # Redirects to login.html if not auth'd,
│                                    # or home.html if auth'd
├── 📄 login.html                    # Sign in / sign up
├── 📄 home.html                     # Campaign lobby (list/create/join campaigns)
├── 📄 campaign.html                 # Main campaign page (party overview, DM tools)
├── 📄 sheet.html                    # Character sheet (?c=campaignId)
├── 📄 combat.html                   # Combat tracker (?c=campaignId)
│
│   # Supabase credentials are INLINED directly in each HTML file (anon key only).
│   # See AGENT-RULES.md rule 13. There is no supabase-config.js — GitHub Pages
│   # cannot serve a gitignored config file, so the anon key lives in a <script>
│   # block in every page. The anon key is designed to be public; security comes
│   # from RLS policies. The service_role key must NEVER appear in any file.
│
├── 📄 firebase-config.js            # Legacy — kept for migration reference only
│
├── 📁 /data/                        # System reference data (JSON files)
│   └── 📁 /rulesets/
│       ├── 📁 /5e-2014/             # D&D 5e 2014 ruleset
│       │   ├── sheet_schema.json    # Which sections appear on the sheet
│       │   ├── weapons.json
│       │   ├── armor.json
│       │   ├── races.json
│       │   ├── spells.json
│       │   ├── conditions.json
│       │   └── /classes/
│       │       ├── fighter.json
│       │       ├── wizard.json
│       │       ├── sorcerer.json
│       │       └── [one file per class]
│       └── 📁 /5e-2024/             # D&D 5e 2024 ruleset (added later)
│           └── [same structure]
│
├── 📁 /assets/                      # Static assets
│   ├── 📁 /icons/                   # SVG icons used in the UI
│   └── 📁 /fonts/                   # Any self-hosted fonts (if needed)
│
├── 📁 /css/                         # Shared stylesheets
│   ├── variables.css                # All CSS custom properties (colors, fonts)
│   ├── base.css                     # Reset, body, typography
│   └── components.css               # Reusable components (buttons, cards, modals)
│
├── 📁 /js/                          # Shared JavaScript modules
│   ├── supabase-client.js           # Supabase initialization (one place only)
│   ├── auth.js                      # Auth helpers (requireAuth, getSession, etc.)
│   ├── theme.js                     # Theme loading and applying from database
│   └── utils.js                     # Shared utilities (escHtml, formatDate, etc.)
│
├── 📄 HANDOFF.md                    # ← Update on the PR branch, every PR (rule 28)
├── 📄 DND-MASTER-PLAN.md            # Full vision, schema, build order
├── 📄 DND-ARCHITECTURE-SPEC.md      # Database schema and architectural patterns
├── 📄 FEATURE-ENGINE-SPEC.md        # Feature engine: @ namespace, definition shape,
│                                    # resolver contract, block-editor tiers
├── 📄 AGENT-RULES.md                # Rules every agent must follow
├── 📄 FILE-ORGANIZATION.md          # This file
├── 📄 GAME-DATA-RULES.md            # JSON data file format rules
├── 📄 .gitignore
└── 📄 README.md
```

---

## The Rules

### Rule 1 — One file, one purpose
Every file does exactly one thing. If a file is doing two things, split it.

| ✓ Correct | ✗ Wrong |
|-----------|---------|
| `auth.js` handles only authentication | `auth.js` handles auth AND theme loading |
| `sheet.html` is only the character sheet | `sheet.html` has campaign overview embedded |

### Rule 2 — Shared code goes in /js/
If the same function is needed in two or more HTML files, it belongs in `/js/`.
Never copy-paste the same function into multiple HTML files.

```html
<!-- Every page that needs auth includes this -->
<script src="js/supabase-client.js"></script>
<script src="js/auth.js"></script>
```

### Rule 3 — Shared styles go in /css/
If the same CSS is needed on two or more pages, it belongs in `/css/`.
Page-specific styles can live in a `<style>` block in that page's HTML.

```html
<!-- Every page includes these -->
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
```

(Note: relative paths, no leading slash — see AGENT-RULES.md rule 33.)

### Rule 4 — System data goes in /data/rulesets/
D&D reference data (classes, races, weapons, spells) is never hardcoded in
JavaScript. It always lives in JSON files under `/data/rulesets/{ruleset}/`.

```js
// Load class data for a character
const classData = await fetch(`data/rulesets/${ruleset}/classes/${className}.json`)
  .then(r => r.json());
```

### Rule 5 — Campaign data goes in Supabase
Anything created by the DM or players during a campaign lives in the database.
NPCs, quests, homebrew items, session notes — all in Supabase, never in files.

### Rule 6 — No legacy files
Do not create files named `sheet-1.html`, `sheet-2.html` etc.
Do not create files named `auth-old.js` or `backup-index.html`.
If something is replaced, delete the old version in the same PR.

### Rule 7 — Credentials
The Supabase anon key is inlined in each HTML file (it is public by design; RLS is the
real security boundary). The service_role key and the Firebase service account key are
NEVER committed in any file. `firebase-config.js` is kept only as legacy migration
reference and contains no live secrets.

---

## /js/ File Contents

### supabase-client.js
```js
// Single source of truth for Supabase initialization
// Import this file on every page after the inlined anon-key <script> block
// and the Supabase CDN script.

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### auth.js
```js
// Auth helper functions
// Requires: supabase-client.js

async function requireAuth()           // Redirect to login if not signed in
async function getSession()            // Get current session or null
async function getUser()               // Get current user or null
async function getMembership(cId)      // Get user's membership for a campaign
async function isDM(campaignId)        // Check if current user is DM
async function signOut()               // Sign out and redirect to login
```

### theme.js
```js
// Theme loading and applying
// Requires: supabase-client.js

async function loadAndApplyTheme(campaignId, membershipId)
function applyThemePreset(presetName)
function applyAccentColor(hex)
function saveAccentColor(hex, membershipId)
function saveCampaignTheme(preset, customVars, campaignId)
```

### utils.js
```js
// Shared utility functions
// No dependencies

function escHtml(str)                  // Escape HTML to prevent XSS
function formatDate(timestamp)         // Format Supabase timestamp for display
function hexToRgb(hex)                 // Convert hex color to RGB string
function darkenHex(hex, amount)        // Darken a hex color
function debounce(fn, delay)           // Debounce a function call
function generateId()                  // Generate a random ID
function showToast(message, type)      // Show a toast notification
```

---

## /css/ File Contents

### variables.css
Contains ALL CSS custom properties:
- Color palette (--parchment, --ink, --gold, --red, --green, etc.)
- Font families
- Spacing scale
- Border radius values
- Shadow definitions
- Animation durations

### base.css
Contains:
- CSS reset (* { box-sizing: border-box; margin: 0; padding: 0; })
- Body styles (background, font-family, min-height)
- Typography defaults (h1-h6, p, a)
- Scrollbar styles

### components.css
Contains reusable UI components used across multiple pages:
- `.btn` button variants (primary, secondary, danger, ghost)
- `.card` parchment card styles
- `.modal-overlay` and `.modal-box` modal styles
- `.sync-status` sync indicator styles
- `.form-field` and `.form-label` form styles
- `.section-title` (.sec) styles
- `.toast` notification styles
- `.divider` decorative divider
- `@keyframes fadeIn` and other shared animations

---

## Page Responsibilities

### login.html
- Sign in with email/password
- Sign up with display name, email, password
- Redirect to home.html on success
- Token refresh handling
- No Supabase data queries (auth only)

### home.html
- List all campaigns the user belongs to
- Create a new campaign
- Join an existing campaign via invite code
- Sign out
- Reads: memberships, campaigns tables

### campaign.html
- Party overview (all character cards)
- DM panel (campaign settings, NPCs, quests, shop, session notes)
- Navigation to sheet.html and combat.html
- Real-time sync of all character HP/status
- Reads/writes: characters, campaigns, npcs, quests, items tables

### sheet.html
- Full character sheet for one character
- Reads ?c=campaignId from URL, looks up character via membership
- Field-level saves on blur
- Atomic HP/gold adjustments
- Real-time sync (DM can edit from campaign.html simultaneously)
- Reads/writes: characters, currency, weapons, features, resources, spell_slots,
  character_inventory tables

### combat.html
- Combat tracker for a campaign session
- Reads ?c=campaignId from URL
- Real-time sync across all players
- HP changes write back to characters table
- Reads/writes: combat_sessions, characters tables

---

## URL Structure

| URL | Page | Notes |
|-----|------|-------|
| `login.html` | Login | No auth required |
| `home.html` | Campaign lobby | Auth required |
| `campaign.html?c={id}` | Campaign page | Auth + membership required |
| `sheet.html?c={id}` | Character sheet | Auth + membership required |
| `combat.html?c={id}` | Combat tracker | Auth + membership required |

The `?c=` parameter is the campaign UUID from Supabase.
The app determines which character to show based on the user's membership row —
not from a URL parameter. (All URLs are relative — no leading slash, rule 33.)

---

## What Does NOT Belong In This Repo

| Item | Where it belongs |
|------|-----------------|
| Supabase service_role key | Never committed anywhere |
| Firebase service account key | Never committed anywhere |
| D&D copyrighted content | Not included at all |
| Player character data | Supabase database |
| NPC/quest/shop data | Supabase database |
| Campaign banners/images | Supabase database (base64) |
| Session recordings | Not in scope |
| node_modules | gitignored |

(The Supabase ANON key is the exception — it is inlined in each HTML file on purpose
per rule 13, because it is public by design and RLS is the real security boundary.)

---

## Adding A New Page Checklist

When creating any new HTML page:

- [ ] File is named according to the naming convention above
- [ ] Includes Google Fonts link tag
- [ ] Includes `css/variables.css`, `css/base.css`, `css/components.css`
- [ ] Inlines the anon-key `<script>` block (SUPABASE_URL + SUPABASE_ANON_KEY) per rule 13
- [ ] Includes the Supabase CDN script AFTER the anon-key block
- [ ] Includes `js/supabase-client.js`
- [ ] Includes `js/auth.js` (if auth is needed)
- [ ] Includes `js/utils.js`
- [ ] Calls `requireAuth()` on DOMContentLoaded if auth is required
- [ ] Has a `<title>` tag
- [ ] Has a `<meta name="viewport">` tag
- [ ] Uses only CSS variables from variables.css for colors
- [ ] All user-supplied strings pass through `escHtml()`
- [ ] All Supabase calls have error handling
- [ ] All paths are relative (no leading slash, rule 33)
- [ ] Added to HANDOFF.md file structure section (on the PR branch)

---

## Adding A New /js/ Module Checklist

- [ ] File has a comment at the top listing its dependencies
- [ ] File has a comment listing all exported functions
- [ ] All functions have a one-line comment describing what they do
- [ ] No hardcoded strings that should be CSS variables
- [ ] No direct DOM manipulation that belongs in the HTML file
- [ ] Added to FILE-ORGANIZATION.md /js/ section
- [ ] Added to HANDOFF.md file structure section (on the PR branch)
