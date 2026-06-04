<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>D&amp;D Tracker — Character Sheet</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <script>
    const SUPABASE_URL      = 'https://izpubltxejnelahoxszp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cHVibHR4ZWpuZWxhaG94c3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjU1MDQsImV4cCI6MjA5NjAwMTUwNH0.h57Wz1AH3of5ZlAj5L-G1Rq2g5p0XPG2bI_ECno_paY';
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/supabase-client.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/utils.js"></script>
  <style>
    /* ── Sheet-specific variables ── */
    :root {
      --shown-color: #5a9a3a;
      --shown-bg:    rgba(90,154,58,0.1);
    }

    /* ── Body offset for fixed top bar ── */
    body {
      padding-top: 48px;
      padding-bottom: 60px;
    }

    /* ── Top Bar ── */
    .top-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 48px;
      background: linear-gradient(160deg, var(--header-bg-1), var(--header-bg-2));
      border-bottom: 1px solid rgba(var(--border-rgb), 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 100;
      gap: 12px;
    }

    .top-bar-center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .top-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .back-link {
      font-family: var(--font-heading);
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--border-light);
      text-decoration: none;
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      transition: color var(--transition-fast), border-color var(--transition-fast);
      white-space: nowrap;
    }
    .back-link:hover {
      color: var(--gold-light);
      border-color: var(--gold);
      text-decoration: none;
    }

    /* ── Character Header (dark band, page-flow) ── */
    .char-header {
      background: linear-gradient(160deg, var(--header-bg-1), var(--header-bg-2));
      border-bottom: 1px solid rgba(var(--border-rgb), 0.3);
      padding: 16px 24px;
    }

    .char-header-inner {
      max-width: 700px;
      margin: 0 auto;
    }

    .char-name-display {
      font-family: var(--font-heading);
      font-size: 1.8rem;
      font-weight: 900;
      color: var(--gold-light);
      line-height: 1.1;
      margin-bottom: 12px;
    }

    .char-meta-row {
      display: flex;
      align-items: stretch;
    }

    .char-meta-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 10px;
      position: relative;
      min-width: 0;
    }
    .char-meta-item:first-child { padding-left: 0; }
    .char-meta-item:last-child  { padding-right: 0; }

    .char-meta-item + .char-meta-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 15%;
      bottom: 15%;
      width: 1px;
      background: rgba(var(--border-rgb), 0.4);
    }

    .char-meta-label {
      font-family: var(--font-heading);
      font-size: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--border-light);
      margin-bottom: 3px;
      white-space: nowrap;
    }

    .char-meta-value {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: rgba(var(--light-text-rgb), 0.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* ── Sheet Outer ── */
    .sheet-outer {
      padding: 16px 12px;
    }

    /* ── Sheet Body (parchment card) ── */
    .sheet-body {
      max-width: 700px;
      margin: 0 auto;
      background: var(--sheet-bg);
      border: 1px solid var(--border);
      box-shadow: 0 0 0 2px var(--shadow-deep), 0 8px 30px rgba(0,0,0,0.6);
      padding: 20px 24px;
      animation: fadeIn 0.3s ease;
    }

    /* ── Ability Score Grid ── */
    .ability-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
    }

    .ability-box {
      background: var(--ability-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 10px 8px;
      text-align: center;
    }

    .ability-name {
      font-family: var(--font-heading);
      font-size: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--border-light);
      display: block;
      margin-bottom: 4px;
    }

    .ability-mod {
      font-family: var(--font-heading);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--stat-color);
      display: block;
      line-height: 1;
      margin-bottom: 3px;
    }

    .ability-score
