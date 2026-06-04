# AGENT RULES — DND V2
# Read this file before writing a single line of code.
# These rules apply to every PR in this project, no exceptions.

---

## The Golden Rules

1. **One feature per PR.**
   Never combine two features in one PR. If the prompt asks for login AND campaign creation, push back and ask which one to do first.

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

## PR Rules

19. **PR description must include:**
    - What was built
    - What files were changed
    - What was NOT touched
    - The testing checklist results

20. **Update HANDOFF.md in every PR.**
    The last step of every PR must update HANDOFF.md to reflect:
    - What was just built
    - Current file structure
    - Any known issues discovered
    - What the next task is

---

## How To Deliver Files

The project owner copies files manually — the agent does NOT push to GitHub.
The owner is not a developer. Follow this delivery process exactly, every time.

21. **Deliver files one at a time.**
    Present each file separately. Do not dump everything at once.
    Wait for the owner to confirm "got it" or "next" before showing the next file.

22. **Every file delivery must follow this exact format:**
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📁 FILE 1 of 3
    Path: home.html
    Action: Replace the existing file at dnd-v2/home.html
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [complete file contents here]

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Got it? Reply "next" for file 2.
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

    The "Path" line must say exactly where the file goes in the repo.
    The "Action" line must say whether to REPLACE an existing file or CREATE a new one.
    Never say "put it somewhere" or leave the location ambiguous.

23. **Always specify the exact file action:**
    - `Action: Replace the existing file at dnd-v2/home.html`
    - `Action: Create a new file at dnd-v2/js/friends.js`
    - `Action: Create a new file at dnd-v2/friends.html`
    Never leave this ambiguous.

24. **Never tell the owner to push to main directly.**
    The owner uploads files via the GitHub web interface or copies them locally.
    End every PR with this exact push command:
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✓ ALL FILES DELIVERED

    To publish: go to github.com/Christian0765/dnd-v2,
    upload each file to its correct location, then commit.

    OR if using terminal:
    cd C:\Users\cm070\Documents\dnd-v2 && git add . && git commit -m "PR X — description" && git push
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

25. **HANDOFF.md is always pasted in chat — never delivered as a file.**
    At the end of every PR, paste the full updated HANDOFF.md contents
    directly in chat as a markdown code block. Do not attach it as a file.
    The owner will copy and paste it into the GitHub web editor manually.
    Format:
    ```
    Here is the updated HANDOFF.md — paste this into GitHub:

    [full HANDOFF.md contents here]
    ```

---

## What To Do When Something Is Unclear

26. **Ask before building.**
    If the prompt is ambiguous about a design decision, ask one clear question
    before writing code. Don't guess and build the wrong thing.

27. **If it's not in the prompt, don't build it.**
    Scope creep causes bugs. If you think of a related feature while building,
    note it as a suggestion — don't add it unasked.

28. **If something in the master plan or architecture spec conflicts with the prompt, flag it.**
    Don't silently pick one. Point out the conflict and ask which takes priority.

---

## GitHub Pages Path Rule

29. **Never use absolute paths starting with `/`.**
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
| `HANDOFF.md` | Project state — update every PR |
| `DND-MASTER-PLAN.md` | Full vision, schema, build order |
| `DND-ARCHITECTURE-SPEC.md` | Database schema and patterns |
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
