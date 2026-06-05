# AGENT RULES — DND V2
# Read this file before writing a single line of code.
# These rules apply to every PR in this project, no exceptions.

---

## The Golden Rules

1. **One feature per PR.**
   Never combine two features in one PR. If the prompt asks for login AND campaign creation, push back and ask which one to do first.

2. **Read HANDOFF.md first, every time.**
   The handoff document tells you what exists, what works, and what the file structure looks like. Never assume — always check.

3. **Read DND-ARCHITECTURE-SPEC.md before writing any database code.**
   Every table, every RLS policy, every pattern is documented there. Do not invent your own approach.

4. **Never break existing working features.**
   If a file is listed as working in HANDOFF.md, do not touch it unless the prompt explicitly says to. When in doubt, leave it alone.

5. **Test before opening a PR.**
   Go through the testing checklist in the prompt. If you cannot verify something works, say so explicitly in the PR description — do not pretend it works.

---

## Code Rules

6. **No frameworks, no build systems.**
   Vanilla HTML5, CSS3, JavaScript only. No React, Vue, webpack, TypeScript, npm packages in the frontend. No exceptions.

7. **Supabase client initialization.**
   Always use `supabaseClient` as the variable name. Never use `supabase` (that's the library itself).
   ```js
   const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

8. **Field-level saves only.**
   Never save an entire object to the database at once. Only save the specific field that changed.
   ```js
   // WRONG
   await supabaseClient.from('characters').update(entireObject).eq('id', id);

   // CORRECT
   await supabaseClient.from('characters').update({ name: newName }).eq('id', id);
   ```

9. **Atomic increments for numeric values.**
   HP, gold, resource counts must use the RPC functions defined in the schema. Never set absolute values from the client.
   ```js
   // WRONG
   await supabaseClient.from('characters').update({ cur_hp: 45 }).eq('id', id);

   // CORRECT
   await supabaseClient.rpc('adjust_hp', { character_id: id, delta: -5 });
   ```

10. **Soft deletes only.**
    Never use `.delete()` on any table. Always set `deleted_at = NOW()` instead.
    ```js
    // WRONG
    await supabaseClient.from('npcs').delete().eq('id', id);

    // CORRECT
    await supabaseClient.from('npcs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    ```

11. **Always handle errors explicitly.**
    Every Supabase call must check for errors. Never let failures be silent.
    ```js
    const { data, error } = await supabaseClient.from('table').select('*');
    if (error) {
      console.error('[functionName] Failed:', error.message);
      showError('Something went wrong. Please try again.');
      return;
    }
    ```

12. **Never commit real credentials.**
    `supabase-config.js` is in `.gitignore` and must never be committed with real keys.
    Only commit the template version with placeholder values.

---

## Design Rules

13. **Match the design system exactly.**
    Every page uses the CSS variables defined in HANDOFF.md. No new color values.
    No new fonts. The visual theme is dark parchment — near-black backgrounds,
    gold and warm cream accents, Cinzel for headings, Crimson Text for body text.

14. **Mobile-aware but desktop-first.**
    Add `@media (max-width: 600px)` breakpoints for major layout changes.
    The app is primarily used on laptops and tablets during sessions.

15. **Animations are subtle.**
    Use the standard `fadeIn` keyframe for new elements appearing.
    No bouncing, no spinning, no distracting effects.
    ```css
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: none; }
    }
    ```

---

## PR Rules

16. **PR description must include:**
    - What was built
    - What files were changed
    - What was NOT touched
    - The testing checklist results

17. **One commit per logical change.**
    Don't squash everything into one commit. Separate commits for:
    - HTML structure
    - CSS styles
    - JavaScript logic
    - Any fixes made during development

18. **Update HANDOFF.md in every PR.**
    The last commit in every PR must update HANDOFF.md to reflect:
    - What was just built (add to "What's Been Built")
    - Current file structure
    - Any known issues discovered
    - What the next task is

---

## How To Deliver Files

The project owner manually copies files into the repo and pushes them with Git.
The agent does NOT have write access to GitHub. Follow this delivery process exactly.

19. **Deliver files one at a time.**
    After building, present each file separately. Do not dump everything at once.
    Wait for the owner to confirm "got it" before showing the next file.

20. **Every file delivery must include two things:**

    **The file path** — exactly where it goes in the repo:
    ```
    📁 File: css/variables.css
    ```

    **The complete file contents** — the full code, nothing truncated:
    ```css
    /* full file contents here */
    ```

21. **Use this exact delivery format for every file:**
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📁 FILE 1 of 6: css/variables.css
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Save this file to: dnd-v2/css/variables.css

    [complete file contents]

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Ready for file 2? Reply "next" to continue.
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

22. **End every PR with a push summary.**
    After all files are delivered, show this exact block:
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✓ ALL FILES DELIVERED
    Run this single command to push to GitHub:

    cd C:\Users\cm070\Documents\dnd-v2 && git add . && git commit -m "PR X — [what was built]" && git push
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

    Always chain all three git commands into one line with &&.
    Always write a clear commit message describing what was built.
    Examples:
    - `git add . && git commit -m "PR 1 — project structure and shared files" && git push`
    - `git add . && git commit -m "PR 2 — login and signup page" && git push`
    - `git add . && git commit -m "PR 3 — campaign creation and home page" && git push`

---

## What To Do When Something Is Unclear

23. **Ask before building.**
    If the prompt is ambiguous about a design decision, ask one clear question
    before writing code. Don't guess and build the wrong thing.

24. **If it's not in the prompt, don't build it.**
    Scope creep causes bugs. If you think of a related feature while building,
    note it in the PR description as a suggestion — don't add it unasked.

25. **If something in the architecture spec conflicts with the prompt, flag it.**
    Don't silently pick one or the other. Point out the conflict and ask
    which takes priority.

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
| Images | base64 in database (no storage bucket yet) |
| Build | None — direct file editing |

---

## File Naming Conventions

| File | Purpose |
|------|---------|
| `login.html` | Sign in / sign up |
| `home.html` | Campaign lobby |
| `index.html` | Main campaign page (party overview) |
| `sheet.html` | Character sheet |
| `combat.html` | Combat tracker |
| `supabase-config.js` | Credentials (local only, never committed) |
| `HANDOFF.md` | Project state (update every PR) |
| `DND-ARCHITECTURE-SPEC.md` | Database schema and patterns |
| `AGENT-RULES.md` | This file |
| `/data/rulesets/` | JSON system data files |

---

## Remember

You are one agent in a long chain of agents building this project.
The next agent will read HANDOFF.md and trust that it accurately reflects
what you built. Write code you'd be proud to hand off. Leave things
cleaner than you found them.