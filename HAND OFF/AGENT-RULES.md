# AGENT RULES — DND V2
# Read this file before writing a single line of code.
# These rules apply to every PR in this project, no exceptions.

---

## The Golden Rules

1. **One feature per PR.**
   Never combine two features in one PR. If the prompt asks for login AND campaign creation, push back and ask which one to do first. With the branch workflow, the branch IS the PR (see rule 19).

2. **Read HANDOFF.md first, every time.**
   The handoff document tells you what exists, what works, and what the file structure looks like. Never assume — always check.

3. **Read DND-MASTER-PLAN.md before writing any code.**
   The master plan is the single source of truth for the full vision, all database tables, RLS policies, RPC functions, and build order. It overrides everything else when there is a conflict.

4. **Read DND-ARCHITECTURE-SPEC.md before writing any database code.**
   Every table, every RLS policy, every pattern is documented there. Do not invent your own approach.

5. **Never break existing working features.**
   If a file is listed as working in HANDOFF.md, do not touch it unless the prompt explicitly says to. When in doubt, leave it alone.

6. **Test before opening a PR.**
   Go through the testing checklist in the prompt. If you cannot verify something works, say so explicitly — do not pretend it works.

---

## Code Rules

7. **No frameworks, no build systems.**
   Vanilla HTML5, CSS3, JavaScript only. No React, Vue, webpack, TypeScript, npm packages in the frontend. No exceptions.

8. **Supabase client initialization.**
   Always use `supabaseClient` as the variable name. Never use `supabase` (that's the library itself).
   ```js
   const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

9. **Field-level saves only.**
   Never save an entire object to the database at once. Only save the specific field that changed.
   ```js
   // WRONG
   await supabaseClient.from('characters').update(entireObject).eq('id', id);

   // CORRECT
   await supabaseClient.from('characters').update({ name: newName }).eq('id', id);
   ```

10. **Atomic increments for numeric values.**
    HP, gold, resource counts must use the RPC functions defined in the schema. Never set absolute values from the client.
    ```js
    // WRONG
    await supabaseClient.from('characters').update({ cur_hp: 45 }).eq('id', id);

    // CORRECT
    await supabaseClient.rpc('adjust_hp', { character_id: id, delta: -5 });
    ```

11. **Soft deletes only.**
    Never use `.delete()` on any table. Always set `deleted_at = NOW()` instead.
    ```js
    // WRONG
    await supabaseClient.from('npcs').delete().eq('id', id);

    // CORRECT
    await supabaseClient.from('npcs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    ```

12. **Always handle errors explicitly.**
    Every Supabase call must check for errors. Never let failures be silent.
    ```js
    const { data, error } = await supabaseClient.from('table').select('*');
    if (error) {
      console.error('[functionName] Failed:', error.message);
      showError('Something went wrong. Please try again.');
      return;
    }
    ```

13. **Inline Supabase credentials directly in every HTML file.**
    The site is hosted on GitHub Pages which cannot serve `supabase-config.js`
    because that file is in `.gitignore` and never pushed to the repo.
    Put credentials directly in a `<script>` block BEFORE the Supabase CDN script:

    ```html
    <script>
      const SUPABASE_URL      = 'https://izpubltxejnelahoxszp.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cHVibHR4ZWpuZWxhaG94c3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjU1MDQsImV4cCI6MjA5NjAwMTUwNH0.h57Wz1AH3of5ZlAj5L-G1Rq2g5p0XPG2bI_ECno_paY';
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="js/supabase-client.js"></script>
    ```

    Do NOT use `<script src="supabase-config.js"></script>` — that file
    does not exist on the live site.
    NOTE: the inlined key is the ANON key, which is designed to be public. Security comes
    from RLS policies, not key secrecy. The service_role key must NEVER appear in any
    committed file.

14. **Never use .single() — always use .maybeSingle().**
    `.single()` throws a 406 error if no row is found.
    `.maybeSingle()` returns null safely. Use it everywhere.

15. **Always generate UUIDs client-side.**
    Never chain `.insert().select().single()` — the RLS SELECT policy
    blocks the read before the membership row exists.
    Always use `crypto.randomUUID()` before inserting:
    ```js
    const id = crypto.randomUUID();
    await supabaseClient.from('table').insert({ id, ...fields });
    ```

---

## Design Rules

16. **Match the design system exactly.**
    Every page uses the CSS variables defined in css/variables.css.
    No new color values. No new fonts.
    Dark parchment theme: near-black backgrounds, gold and warm cream accents,
    Cinzel for headings, Crimson Text for body text.

17. **Mobile-aware but desktop-first.**
    Add `@media (max-width: 600px)` breakpoints for major layout changes.
    The app is primarily used on laptops and tablets during sessions.

18. **Animations are subtle.**
    Use the standard `fadeIn` keyframe. No bouncing, no spinning.
    ```css
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: none; }
    }
    ```

---

## The Workflow At A Glance

The agent runs in Claude Code with git, `gh`, and console/SQL access. The agent does the
mechanics; the owner makes the decisions. The single rule that governs everything:

> **The agent works on a PR branch and opens a pull request. The owner tests the branch
> and merges. The agent NEVER merges, NEVER pushes to `main`, NEVER deletes branches.**

The merge button is the one irreversible act, and it belongs to the owner alone — it is
the moment the owner has tested and approved. Pushing to a branch is reversible; merging
to `main` is what ships.

---

## Branch & PR Rules

19. **One PR branch per conceptual PR.**
    One feature per branch (this is rule 1, enforced by git). Branch name matches the PR
    in the build order, lowercase, hyphenated:
    ```
    fe-2-definition-column
    pr-5b-5-spells-wiring
    ```
    The branch IS the PR. Never combine two features in one branch.

20. **Always branch from fresh `main`.**
    Before creating any branch:
    ```
    git checkout main
    git pull
    git checkout -b <branch-name>
    ```
    Branching from stale `main` causes conflicts the owner would have to resolve by hand.

21. **One PR in flight at a time.**
    Do not open a second PR branch while another is still awaiting the owner's test/merge.
    The next branch is cut only after the previous PR is merged, from the updated `main`.
    (If the owner explicitly asks for parallel work, that overrides this — but the default
    is one at a time.)

22. **The agent pushes to its branch and opens a real PR. Nothing more.**
    ```
    git push -u origin <branch-name>
    gh pr create --title "FE-2 — definition column + manual renderer" --body "<see rule 23>"
    ```
    Then STOP. Do not merge. Do not push to `main`. Do not delete the branch. Report the
    PR link to the owner and wait.

23. **Every PR description must contain, in this order:**
    - **What was built** — one short paragraph.
    - **Files changed** — exact repo paths (e.g. `dnd-v2/sheet.html`, `dnd-v2/js/utils.js`).
    - **What was NOT touched** — the working features deliberately left alone (rule 5).
    - **RUN BEFORE TESTING** — see rule 25. Omit the header only if there is no SQL/console step.
    - **Test plan** — the exact steps the owner follows to verify the branch works.

24. **The owner merges; the agent never does.**
    After the owner has tested the branch and is satisfied, the OWNER merges (GitHub web
    "merge" button, or `gh pr merge` run by the owner). The agent does not run merge
    commands even if asked mid-task — if the owner says "merge it," the agent confirms the
    owner has tested it, then reminds the owner that clicking merge is theirs. The agent's
    job ends at "PR is open and green."

---

## SQL & Schema Rules (single shared database)

25. **Schema changes are a PR gate, listed as "RUN BEFORE TESTING."**
    Schema lives in Supabase, not git. A branch can carry code that needs a column that
    does not exist yet. So if a PR needs any schema change, the PR body MUST include:
    ```
    ## RUN BEFORE TESTING
    Run this in the Supabase SQL editor before checking out and testing this branch:

    ALTER TABLE features ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}';
    ```
    The owner runs the SQL first, THEN tests the branch. Testing before the SQL will fail
    and look like a code bug when it is not.

26. **Schema changes are additive and reversible by default.**
    There is ONE Supabase project shared across all branches — there is no per-branch
    database. A destructive change on a test branch hits the same data `main` reads from.
    Therefore, by default:
    - Use `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, new RPC functions.
    - Never `DROP COLUMN`, `DROP TABLE`, or `ALTER COLUMN ... TYPE` as part of normal PR
      work. New columns are additive; old ones are left in place until a dedicated cleanup.
    - A genuinely destructive change requires its own explicit, owner-approved step,
      announced in the PR body under a `## DESTRUCTIVE — CONFIRM FIRST` header, and is
      never bundled with feature work.
    (Future upgrade, not required now: a separate staging Supabase project for branch
    testing. Until then, additive-only is the safety boundary.)

27. **Other console steps follow the same gate.**
    Any required step outside git — RPC creation, RLS policy changes, storage config —
    goes in the PR body under "RUN BEFORE TESTING" with the exact command. Never assume a
    console step was done; state it explicitly so the owner runs it before testing.

---

## HANDOFF.md Rules

28. **HANDOFF.md is updated ON the PR branch, as the last commit.**
    HANDOFF.md always reflects what is on `main`. So the doc update rides with the work:
    the final commit of every branch updates HANDOFF.md, and merging the PR merges the doc
    update atomically. HANDOFF never drifts from the code it describes.

29. **Every HANDOFF.md update must reflect:**
    - What this PR built.
    - Current file structure (if it changed).
    - Any known issues discovered.
    - The next task in the build order.
    - Any SQL/console steps that were run (mirror the "RUN BEFORE TESTING" section so the
      record of what the database now contains lives in the repo too).

---

## What To Do When Something Is Unclear

30. **Ask before building.**
    If the prompt is ambiguous about a design decision, ask one clear question
    before writing code. Don't guess and build the wrong thing.

31. **If it's not in the prompt, don't build it.**
    Scope creep causes bugs. If you think of a related feature while building,
    note it as a suggestion in the PR body — don't add it unasked.

32. **If something in the master plan or architecture spec conflicts with the prompt, flag it.**
    Don't silently pick one. Point out the conflict and ask which takes priority.

---

## GitHub Pages Path Rule

33. **Never use absolute paths starting with `/`.**
    The site lives at `christian0765.github.io/dnd-v2/` — not the root.
    Absolute paths cause 404 errors.

    ```js
    // WRONG
    window.location.href = '/login.html';

    // CORRECT
    window.location.href = 'login.html';
    ```

    This applies everywhere — JS redirects, HTML href attributes,
    CSS url() references, fetch() calls. No leading slash. Ever.

---

## Quick Command Reference (the whole happy path)

```bash
# Start a PR
git checkout main && git pull
git checkout -b fe-2-definition-column

# ... do the work, commit in logical steps ...
git add -A && git commit -m "FE-2 — add definition column read/write to sheet.html"

# ... final commit updates HANDOFF.md ...
git add HANDOFF.md && git commit -m "FE-2 — update HANDOFF"

# Open the PR and stop
git push -u origin fe-2-definition-column
gh pr create --title "FE-2 — definition column + manual renderer" --body "..."

# AGENT STOPS HERE.
# Owner runs any RUN-BEFORE-TESTING SQL, tests the branch, and merges.
```

---

## The Stack At A Glance

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Hosting | GitHub Pages |
| Fonts | Google Fonts (Cinzel, Crimson Text) |
| Images | base64 in database |
| Build | None — direct file editing |
| Workflow | Claude Code → PR branch → owner tests → owner merges |

---

## File Naming Conventions

| File | Purpose |
|------|---------|
| `login.html` | Sign in / sign up / password recovery |
| `home.html` | Campaign lobby |
| `index.html` | Entry point redirect |
| `campaign.html` | Campaign page (party overview, DM tools) |
| `sheet.html` | Character sheet |
| `combat.html` | Combat tracker |
| `friends.html` | Friends list and requests |
| `HANDOFF.md` | Project state — update every PR (on-branch, rule 28) |
| `DND-MASTER-PLAN.md` | Full vision, schema, build order |
| `DND-ARCHITECTURE-SPEC.md` | Database schema and patterns |
| `FEATURE-ENGINE-SPEC.md` | Feature engine: namespace, definition shape, resolver, blocks |
| `AGENT-RULES.md` | This file |
| `GAME-DATA-RULES.md` | JSON data file format rules |
| `FILE-ORGANIZATION.md` | Folder structure rules |

---

## Remember

You are one agent in a long chain of agents building this project.
The next agent will read HANDOFF.md and DND-MASTER-PLAN.md and trust
that they accurately reflect what you built.
Write code you would be proud to hand off.
Leave things cleaner than you found them.
