# DND V2 — MASTER PLAN
# Single source of truth for the full vision, data architecture, and build order.
# Every agent reads this before writing a single line of code.
# Updated: Full design session — world building, combat, display modes, friend system

---

## THE CORE PHILOSOPHY

The app has two distinct modes serving two different people:

**The DM's app** — a world-building studio, session planning tool, and live
session command center. The single most important part of this entire
application. Everything else serves this.

**The players' app** — a smart character sheet with live combat integration.
Powerful, but secondary. It exists to serve what the DM has built.

### The Math Philosophy (Combat)
The app is a **calculator with a DM override button**, not a rules enforcer.
Math is automatic and always correct by the book. The DM is always the final
authority. A miss by the numbers can become a hit if the player is creative
enough. The app presents what *should* happen — the DM decides what *actually*
happens. This applies to every combat feature without exception.

### The Display Philosophy
Two completely separate configuration layers that never touch each other:

**Layer 1 — Feature flags (DM controls per campaign)**
The DM can turn any gameplay feature on or off for the whole campaign.
Advanced combat tracker, online dice, tactical map, buff system — all
toggleable. If the DM turns off the online die, nobody sees it regardless
of their display mode. Stored directly on the `campaigns` table.

**Layer 2 — Display mode (player controls, purely cosmetic)**
Traditional mode (dark parchment, text-based, document-like) or Video Game
mode (health orbs, icon-based, animated, game UI). Both modes read and write
the exact same data. The mode only changes presentation. Players control their
own mode. Saves to account, can be overridden per device.

---

## WHO THIS IS FOR

Built for one specific group: 4-6 players + 1 DM, playing in person.
Architecture must be clean enough to scale to other groups later, but never
over-engineered for that goal. Build for the group first.

---

## ARCHITECTURAL PRINCIPLES

1. **Data and display are completely separate.**
   Every table stores pure data. How it renders is a UI concern only.

2. **Feature flags are DM-controlled, display modes are player-controlled.**
   Two completely different systems that never touch each other.

3. **Everything is campaign-scoped.**
   Almost every table has `campaign_id`. Data never leaks between campaigns.

4. **Worlds can be shared, campaigns cannot.**
   A DM can share world content publicly or import from other DMs.
   Campaign data (characters, sessions, combat) is always private.

5. **Soft deletes everywhere.**
   Never hard delete. Every table has `deleted_at TIMESTAMPTZ`.

6. **Field-level saves only.**
   Never update an entire row from the client. Only the changed field.

7. **Atomic increments for numeric values.**
   HP, gold, resources — always delta via RPC, never absolute set.

8. **Hierarchical campaigns.**
   Campaigns → Arcs → Sessions → Scenes. Everything has a place.

9. **INSERT → SELECT RLS pattern is forbidden.**
   Always generate UUIDs client-side with `crypto.randomUUID()`.
   Never chain `.insert().select().single()`.

10. **No absolute paths.**
    Site lives at `christian0765.github.io/dnd-v2/`. Always relative paths.

---

## PART ONE — IDENTITY & ACCESS

### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  is_searchable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `campaigns`
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'New Campaign',
  banner_url TEXT,
  dm_notes TEXT,
  ruleset TEXT NOT NULL DEFAULT '5e-2014',
  theme_preset TEXT DEFAULT 'classic',
  theme_vars JSONB DEFAULT '{}',

  -- Feature flags (DM controls — all default true)
  feature_combat_tracker BOOLEAN DEFAULT TRUE,
  feature_online_dice BOOLEAN DEFAULT TRUE,
  feature_tactical_map BOOLEAN DEFAULT FALSE,
  feature_buff_system BOOLEAN DEFAULT TRUE,
  feature_combat_log BOOLEAN DEFAULT TRUE,
  feature_world_events_feed BOOLEAN DEFAULT TRUE,
  feature_dm_allowances BOOLEAN DEFAULT TRUE,
  feature_lore_vault BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### `memberships`
```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('dm', 'player', 'guest')),
  accent_hex TEXT DEFAULT '#c4920a',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);
```

---

## PART TWO — DISPLAY & PREFERENCES

### `ui_preferences`
```sql
CREATE TABLE ui_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE UNIQUE,
  cosmetic_vars JSONB DEFAULT '{}',
  display_mode TEXT DEFAULT 'traditional'
    CHECK (display_mode IN ('traditional', 'videogame')),
  section_order JSONB DEFAULT '{}',
  hidden_sections JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `display_preferences`
```sql
CREATE TABLE display_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  global_mode TEXT DEFAULT 'traditional'
    CHECK (global_mode IN ('traditional', 'videogame')),
  section_modes JSONB DEFAULT '{}',
  field_overrides JSONB DEFAULT '{}',
  is_device_override BOOLEAN DEFAULT FALSE,
  device_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(membership_id, device_id)
);
```

---

## PART THREE — CHARACTERS

### `characters`
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ruleset_override TEXT,
  locked BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Identity
  name TEXT DEFAULT '',
  class TEXT DEFAULT '',
  subclass TEXT DEFAULT '',
  race TEXT DEFAULT '',
  subrace TEXT DEFAULT '',
  background TEXT DEFAULT '',
  alignment TEXT DEFAULT '',
  player_name TEXT DEFAULT '',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  prof_bonus TEXT DEFAULT '+2',
  portrait_url TEXT,

  -- Combat stats
  ac INTEGER DEFAULT 10,
  initiative INTEGER DEFAULT 0,
  speed INTEGER DEFAULT 30,
  cur_hp INTEGER DEFAULT 0,
  max_hp INTEGER DEFAULT 0,
  temp_hp INTEGER DEFAULT 0,
  hit_dice TEXT DEFAULT '1d8',
  hit_dice_remaining INTEGER DEFAULT 1,
  passive_perception INTEGER DEFAULT 10,
  carry_capacity INTEGER DEFAULT 0,
  inspiration BOOLEAN DEFAULT FALSE,

  -- Ability scores
  str INTEGER DEFAULT 10, str_mod INTEGER DEFAULT 0,
  dex INTEGER DEFAULT 10, dex_mod INTEGER DEFAULT 0,
  con INTEGER DEFAULT 10, con_mod INTEGER DEFAULT 0,
  int INTEGER DEFAULT 10, int_mod INTEGER DEFAULT 0,
  wis INTEGER DEFAULT 10, wis_mod INTEGER DEFAULT 0,
  cha INTEGER DEFAULT 10, cha_mod INTEGER DEFAULT 0,

  -- Saving throw proficiencies
  save_prof_str BOOLEAN DEFAULT FALSE,
  save_prof_dex BOOLEAN DEFAULT FALSE,
  save_prof_con BOOLEAN DEFAULT FALSE,
  save_prof_int BOOLEAN DEFAULT FALSE,
  save_prof_wis BOOLEAN DEFAULT FALSE,
  save_prof_cha BOOLEAN DEFAULT FALSE,

  -- Skill proficiencies
  skill_acrobatics BOOLEAN DEFAULT FALSE,
  skill_animal_handling BOOLEAN DEFAULT FALSE,
  skill_arcana BOOLEAN DEFAULT FALSE,
  skill_athletics BOOLEAN DEFAULT FALSE,
  skill_deception BOOLEAN DEFAULT FALSE,
  skill_history BOOLEAN DEFAULT FALSE,
  skill_insight BOOLEAN DEFAULT FALSE,
  skill_intimidation BOOLEAN DEFAULT FALSE,
  skill_investigation BOOLEAN DEFAULT FALSE,
  skill_medicine BOOLEAN DEFAULT FALSE,
  skill_nature BOOLEAN DEFAULT FALSE,
  skill_perception BOOLEAN DEFAULT FALSE,
  skill_performance BOOLEAN DEFAULT FALSE,
  skill_persuasion BOOLEAN DEFAULT FALSE,
  skill_religion BOOLEAN DEFAULT FALSE,
  skill_sleight_of_hand BOOLEAN DEFAULT FALSE,
  skill_stealth BOOLEAN DEFAULT FALSE,
  skill_survival BOOLEAN DEFAULT FALSE,

  -- Expertise
  expertise JSONB DEFAULT '[]',

  -- Conditions & status
  conditions JSONB DEFAULT '[]',
  exhaustion INTEGER DEFAULT 0,
  death_save_successes INTEGER DEFAULT 0,
  death_save_failures INTEGER DEFAULT 0,
  is_dead BOOLEAN DEFAULT FALSE,
  is_unconscious BOOLEAN DEFAULT FALSE,
  concentration_spell TEXT DEFAULT '',

  -- Free text
  traits TEXT DEFAULT '',
  ideals TEXT DEFAULT '',
  bonds TEXT DEFAULT '',
  flaws TEXT DEFAULT '',
  backstory TEXT DEFAULT '',
  proficiencies_text TEXT DEFAULT '',
  languages_text TEXT DEFAULT '',
  equipment_text TEXT DEFAULT '',
  allies_orgs TEXT DEFAULT '',
  additional_features TEXT DEFAULT '',

  accent_hex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### `currency`
```sql
CREATE TABLE currency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE UNIQUE,
  pp INTEGER DEFAULT 0,
  gp INTEGER DEFAULT 0,
  ep INTEGER DEFAULT 0,
  sp INTEGER DEFAULT 0,
  cp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `weapons`
```sql
CREATE TABLE weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⚔',
  atk_bonus INTEGER DEFAULT 0,
  dmg_dice TEXT DEFAULT '1d6',
  dmg_bonus INTEGER DEFAULT 0,
  dmg_type TEXT DEFAULT 'slashing',
  range TEXT DEFAULT '5 ft',
  properties JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  ammo_item_id UUID REFERENCES items(id),
  ability_mod TEXT DEFAULT 'str'
    CHECK (ability_mod IN ('str','dex','con','int','wis','cha','spell')),
  use_proficiency BOOLEAN DEFAULT TRUE,
  damage_bonus_feature TEXT,
  crit_dice TEXT,
  is_save BOOLEAN DEFAULT FALSE,
  save_dc INTEGER,
  save_stat TEXT,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `features`
```sql
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'passive'
    CHECK (category IN ('maneuver','action','passive','reaction','racial',
                        'fighting-style','homebrew','spell','cantrip')),
  formula TEXT,
  recharge TEXT,
  source_class TEXT DEFAULT '',
  source_level INTEGER DEFAULT 1,
  affects_attack_roll BOOLEAN DEFAULT FALSE,
  affects_damage BOOLEAN DEFAULT FALSE,
  affects_save BOOLEAN DEFAULT FALSE,
  combat_timing TEXT DEFAULT 'none'
    CHECK (combat_timing IN ('none','pre_roll','post_roll','reaction','passive')),
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `resources`
```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total INTEGER DEFAULT 1,
  used INTEGER DEFAULT 0,
  die_type TEXT,
  recover TEXT DEFAULT 'Long rest',
  category TEXT DEFAULT 'action',
  sort_order INTEGER DEFAULT 0
);
```

### `spell_slots`
```sql
CREATE TABLE spell_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE UNIQUE,
  slots_total JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}',
  slots_used  JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}',
  pact_slots_total INTEGER DEFAULT 0,
  pact_slots_used INTEGER DEFAULT 0,
  pact_slot_level INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `items`
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📦',
  category TEXT DEFAULT 'misc'
    CHECK (category IN ('weapons','armor','magical','resources','healing','food','misc')),
  weight NUMERIC DEFAULT 0,
  value_gp NUMERIC DEFAULT 0,
  is_magical BOOLEAN DEFAULT FALSE,
  requires_attunement BOOLEAN DEFAULT FALSE,
  properties JSONB DEFAULT '{}',
  source TEXT DEFAULT 'dm',
  is_public BOOLEAN DEFAULT FALSE,
  original_item_id UUID,
  deleted_at TIMESTAMPTZ
);
```

### `character_inventory`
```sql
CREATE TABLE character_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  attuned BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## PART FOUR — CAMPAIGN HIERARCHY

Campaigns → Arcs → Sessions → Scenes

### `campaign_arcs`
```sql
CREATE TABLE campaign_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active'
    CHECK (status IN ('planned','active','completed')),
  sort_order INTEGER DEFAULT 0,
  started_session INTEGER,
  ended_session INTEGER,
  deleted_at TIMESTAMPTZ
);
```

### `session_plans`
```sql
CREATE TABLE session_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES campaign_arcs(id),
  session_number INTEGER,
  title TEXT NOT NULL,
  planned_date DATE,
  actual_date DATE,
  status TEXT DEFAULT 'planning'
    CHECK (status IN ('planning','active','completed')),
  dm_prep_notes TEXT DEFAULT '',
  post_session_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### `session_scenes`
```sql
CREATE TABLE session_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_plan_id UUID REFERENCES session_plans(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','skipped')),
  deleted_at TIMESTAMPTZ
);
```

### `scene_npcs`
```sql
CREATE TABLE scene_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES session_scenes(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  role TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
```

### `scene_dialogue`
```sql
CREATE TABLE scene_dialogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES session_scenes(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id),
  speaker_label TEXT DEFAULT '',
  dialogue_text TEXT NOT NULL,
  dm_notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);
```

### `scene_encounters`
```sql
CREATE TABLE scene_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES session_scenes(id) ON DELETE CASCADE UNIQUE,
  difficulty TEXT DEFAULT 'medium'
    CHECK (difficulty IN ('trivial','easy','medium','hard','deadly','custom')),
  terrain_notes TEXT DEFAULT '',
  tactical_notes TEXT DEFAULT '',
  enemies JSONB DEFAULT '[]',
  loot JSONB DEFAULT '[]',
  xp_reward INTEGER DEFAULT 0
);
```

### `scene_contingencies`
```sql
CREATE TABLE scene_contingencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES session_scenes(id) ON DELETE CASCADE,
  trigger_note TEXT NOT NULL,
  response_note TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

---

## PART FIVE — WORLD BUILDING

### Visibility Model
Every piece of world content has a visibility state:
- **dm** — DM only, never shown to players (default)
- **party** — all players can see it
- **individual** — only specific players (stored in `content_visibility`)

### `npcs`
```sql
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race TEXT DEFAULT '',
  role TEXT DEFAULT '',
  relation TEXT DEFAULT 'neutral',
  status TEXT DEFAULT 'alive'
    CHECK (status IN ('alive','dead','unknown','missing')),
  last_seen_location TEXT DEFAULT '',
  first_appeared_session INTEGER,
  personality TEXT DEFAULT '',
  motivation TEXT DEFAULT '',
  secret TEXT DEFAULT '',
  speech_pattern TEXT DEFAULT '',
  relationships JSONB DEFAULT '[]',
  public_notes TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  portrait_url TEXT,
  visibility TEXT DEFAULT 'dm'
    CHECK (visibility IN ('dm','party','individual')),
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  original_npc_id UUID,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `locations`
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'location'
    CHECK (type IN ('city','dungeon','region','landmark','location',
                    'building','wilderness')),
  description TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  lore TEXT DEFAULT '',
  discovered BOOLEAN DEFAULT FALSE,
  connected_to UUID[] DEFAULT '{}',
  map_image_url TEXT,
  parent_location_id UUID REFERENCES locations(id),
  icon TEXT DEFAULT '📍',
  visibility TEXT DEFAULT 'dm'
    CHECK (visibility IN ('dm','party','individual')),
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  original_location_id UUID,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `quests`
```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES campaign_arcs(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'hidden'
    CHECK (status IN ('hidden','active','completed','failed')),
  reward TEXT DEFAULT '',
  giver_npc_id UUID REFERENCES npcs(id),
  location_id UUID REFERENCES locations(id),
  created_session INTEGER,
  completed_session INTEGER,
  visibility TEXT DEFAULT 'dm'
    CHECK (visibility IN ('dm','party','individual')),
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `factions`
```sql
CREATE TABLE factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  alignment TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  methods TEXT DEFAULT '',
  secrets TEXT DEFAULT '',
  dm_notes TEXT DEFAULT '',
  icon TEXT DEFAULT '⚔',
  banner_color TEXT DEFAULT '#c4920a',
  visibility TEXT DEFAULT 'dm'
    CHECK (visibility IN ('dm','party','individual')),
  tags TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ
);
```

### `faction_reputations`
```sql
CREATE TABLE faction_reputations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID REFERENCES factions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  reputation INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'neutral'
    CHECK (tier IN ('hostile','unfriendly','neutral','friendly','honored','exalted')),
  notes TEXT DEFAULT '',
  UNIQUE(faction_id, character_id)
);
```

### `lore_entries`
```sql
CREATE TABLE lore_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'secret'
    CHECK (type IN ('secret','history','faction_lore','prophecy',
                    'character_secret','world_rule','item_lore','other')),
  visibility TEXT DEFAULT 'dm'
    CHECK (visibility IN ('dm','party','individual')),
  related_npc_ids UUID[] DEFAULT '{}',
  related_location_ids UUID[] DEFAULT '{}',
  related_faction_ids UUID[] DEFAULT '{}',
  related_quest_ids UUID[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  original_lore_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### `content_visibility`
```sql
CREATE TABLE content_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('npc','quest','location','faction',
                            'lore_entry','world_event')),
  content_id UUID NOT NULL,
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  visible_since TIMESTAMPTZ DEFAULT NOW()
);
```

### `tags`
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#c4920a',
  UNIQUE(campaign_id, name)
);
```

---

## PART SIX — TIMELINES & BRANCHING

### `timelines`
```sql
CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_plan_id UUID REFERENCES session_plans(id),
  arc_id UUID REFERENCES campaign_arcs(id),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'branch'
    CHECK (type IN ('branch','arc','contingency','what_if')),
  is_actual BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);
```

### `timeline_nodes`
```sql
CREATE TABLE timeline_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES timeline_nodes(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger TEXT DEFAULT '',
  scene_id UUID REFERENCES session_scenes(id),
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned','taken','skipped')),
  sort_order INTEGER DEFAULT 0
);
```

---

## PART SEVEN — LIVE SESSION & WORLD EVENTS

### `world_events`
```sql
CREATE TABLE world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_plan_id UUID REFERENCES session_plans(id),
  session_number INTEGER,
  event_text TEXT NOT NULL,
  dm_notes TEXT DEFAULT '',
  event_type TEXT DEFAULT 'narrative'
    CHECK (event_type IN ('narrative','quest_update','location_discovered',
                          'npc_revealed','faction_change','item_found','custom')),
  visibility TEXT DEFAULT 'party'
    CHECK (visibility IN ('party','individual','dm')),
  target_membership_id UUID REFERENCES memberships(id),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## PART EIGHT — SHARED / PUBLIC CONTENT

```sql
CREATE TABLE public_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID REFERENCES profiles(id),
  content_type TEXT NOT NULL
    CHECK (content_type IN ('npc','location','faction','lore_entry',
                            'item','quest','encounter','ruleset_addon')),
  content_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  ruleset TEXT DEFAULT '5e-2014',
  download_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

---

## PART NINE — COMBAT SYSTEM

### The Combat Flow

**Step 1 — Initiative**
DM starts combat. Players roll initiative (input or animation mode).
DM can reorder at any time. Enemies added any time mid-combat.

**Step 2 — Pending Abilities Panel**
Before rolling, active player sees unused teammate buffs they can apply.
Pulled from `active_effects`. Player applies or saves.

**Step 3 — The Roll**
- Input mode: player types raw number, app applies all modifiers
- Animation mode: RPC generates result server-side, broadcasts to ALL screens
- Natural 20: damage dice doubled automatically. DM controls narrative.
- Natural 1: automatic miss. DM controls narrative.

**Step 4 — Math**
```
Attack: raw_roll + ability_mod + prof_bonus + active_buffs
Hit:    attack_total >= target_AC
Damage: damage_dice + ability_mod + damage_buffs + feature_bonuses
```

**Step 5 — DM Decision Card**
```
┌─────────────────────────────────────┐
│ THORIN attacks GOBLIN               │
│ Roll: 14  Total: 19  AC: 15  HIT ✓  │
│ Damage: 7 (1d6+3)                   │
│ [Apply Damage]  [Adjust]  [Miss]    │
└─────────────────────────────────────┘
```

### `combat_sessions`
```sql
CREATE TABLE combat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  session_plan_id UUID REFERENCES session_plans(id),
  round INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT FALSE,
  combatants JSONB DEFAULT '[]',
  dice_mode TEXT DEFAULT 'input'
    CHECK (dice_mode IN ('input','animation')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `enemies`
```sql
CREATE TABLE enemies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT DEFAULT 'custom'
    CHECK (source IN ('monster_manual','custom')),
  monster_key TEXT,
  ac INTEGER DEFAULT 10,
  max_hp INTEGER DEFAULT 10,
  speed INTEGER DEFAULT 30,
  str INTEGER DEFAULT 10, str_mod INTEGER DEFAULT 0,
  dex INTEGER DEFAULT 10, dex_mod INTEGER DEFAULT 0,
  con INTEGER DEFAULT 10, con_mod INTEGER DEFAULT 0,
  int INTEGER DEFAULT 10, int_mod INTEGER DEFAULT 0,
  wis INTEGER DEFAULT 10, wis_mod INTEGER DEFAULT 0,
  cha INTEGER DEFAULT 10, cha_mod INTEGER DEFAULT 0,
  saving_throws JSONB DEFAULT '{}',
  damage_immunities TEXT[] DEFAULT '{}',
  damage_resistances TEXT[] DEFAULT '{}',
  condition_immunities TEXT[] DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  legendary_actions JSONB DEFAULT '[]',
  cr TEXT DEFAULT '1',
  xp INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  portrait_url TEXT,
  deleted_at TIMESTAMPTZ
);
```

### `active_effects`
```sql
CREATE TABLE active_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_session_id UUID REFERENCES combat_sessions(id) ON DELETE CASCADE,
  source_character_id UUID REFERENCES characters(id),
  target_character_id UUID REFERENCES characters(id),
  target_enemy_id UUID,
  effect_type TEXT NOT NULL
    CHECK (effect_type IN ('buff','debuff','condition')),
  effect_name TEXT NOT NULL,
  timing TEXT NOT NULL
    CHECK (timing IN ('pre_roll','post_roll','persistent')),
  die_type TEXT,
  formula TEXT,
  applies_to TEXT NOT NULL
    CHECK (applies_to IN ('attack','damage','save','check','all')),
  consumed BOOLEAN DEFAULT FALSE,
  duration_type TEXT DEFAULT 'combat'
    CHECK (duration_type IN ('combat','rounds','concentration')),
  rounds_remaining INTEGER,
  concentration BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### `combat_log`
```sql
CREATE TABLE combat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_session_id UUID REFERENCES combat_sessions(id) ON DELETE CASCADE,
  session_number INTEGER,
  round INTEGER NOT NULL,
  turn_order INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('player','enemy','dm','system')),
  actor_id UUID,
  actor_name TEXT NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('attack','spell','ability','reaction',
                           'effect','hp_change','dm_override','move')),
  target_name TEXT,
  roll_raw INTEGER,
  roll_total INTEGER,
  roll_breakdown TEXT,
  hit BOOLEAN,
  dm_override BOOLEAN DEFAULT FALSE,
  dm_override_reason TEXT,
  damage_dealt INTEGER,
  damage_breakdown TEXT,
  hp_before INTEGER,
  hp_after INTEGER,
  effect_applied TEXT,
  dm_note TEXT,
  dice_mode TEXT DEFAULT 'input'
    CHECK (dice_mode IN ('input','animation'))
);
```

### `dice_rolls`
```sql
CREATE TABLE dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_session_id UUID REFERENCES combat_sessions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id),
  roll_type TEXT NOT NULL,
  die_sides INTEGER NOT NULL,
  die_count INTEGER DEFAULT 1,
  results INTEGER[] NOT NULL,
  total INTEGER NOT NULL,
  is_secret BOOLEAN DEFAULT FALSE,
  revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `dm_allowances`
```sql
CREATE TABLE dm_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES characters(id),
  allowance_type TEXT NOT NULL
    CHECK (allowance_type IN ('weapon_mod','feature','damage_type',
                              'rule_exception','other')),
  description TEXT NOT NULL,
  mechanical_effect TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  dm_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## PART TEN — SHOP & HOMEBREW

### `shop_listings`
```sql
CREATE TABLE shop_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  price_gp NUMERIC DEFAULT 0,
  quantity_available INTEGER DEFAULT -1,
  visible_to_players BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ
);
```

### `homebrew`
```sql
CREATE TABLE homebrew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('weapon','race','class','item','spell','feature','rule')),
  name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_by_dm BOOLEAN DEFAULT TRUE,
  visible_to_players BOOLEAN DEFAULT TRUE,
  requires_dm_approval BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ
);
```

---

## PART ELEVEN — RPC FUNCTIONS

### `adjust_hp` — run before PR 5b-2
```sql
CREATE OR REPLACE FUNCTION adjust_hp(character_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE characters
  SET cur_hp = GREATEST(0, LEAST(max_hp, cur_hp + delta))
  WHERE id = character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `adjust_resource`
```sql
CREATE OR REPLACE FUNCTION adjust_resource(resource_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE resources
  SET used = GREATEST(0, LEAST(total, used + delta))
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `adjust_currency`
```sql
CREATE OR REPLACE FUNCTION adjust_currency(
  character_id UUID,
  denomination TEXT,
  delta INTEGER
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE currency SET %I = GREATEST(0, %I + $1) WHERE character_id = $2',
    denomination, denomination
  ) USING delta, character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `roll_dice` — needed for animation mode combat
```sql
CREATE OR REPLACE FUNCTION roll_dice(
  p_sides INTEGER,
  p_count INTEGER,
  p_character_id UUID,
  p_combat_session_id UUID,
  p_roll_type TEXT,
  p_is_secret BOOLEAN DEFAULT FALSE
)
RETURNS dice_rolls AS $$
DECLARE
  v_results INTEGER[];
  v_total INTEGER := 0;
  v_roll dice_rolls;
  i INTEGER;
BEGIN
  FOR i IN 1..p_count LOOP
    v_results := array_append(v_results,
      floor(random() * p_sides + 1)::INTEGER);
    v_total := v_total + v_results[i];
  END LOOP;
  INSERT INTO dice_rolls (
    combat_session_id, character_id, roll_type,
    die_sides, die_count, results, total, is_secret
  )
  VALUES (
    p_combat_session_id, p_character_id, p_roll_type,
    p_sides, p_count, v_results, v_total, p_is_secret
  )
  RETURNING * INTO v_roll;
  RETURN v_roll;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `accept_friend_request`
```sql
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  v_sender UUID;
  v_receiver UUID;
  v_a UUID;
  v_b UUID;
BEGIN
  SELECT sender_id, receiver_id
  INTO v_sender, v_receiver
  FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not authorized';
  END IF;

  IF v_sender < v_receiver THEN
    v_a := v_sender; v_b := v_receiver;
  ELSE
    v_a := v_receiver; v_b := v_sender;
  END IF;

  INSERT INTO friendships (user_a, user_b)
  VALUES (v_a, v_b)
  ON CONFLICT DO NOTHING;

  UPDATE friend_requests
  SET status = 'accepted', resolved_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `accept_campaign_invite`
```sql
CREATE OR REPLACE FUNCTION accept_campaign_invite(invite_id UUID)
RETURNS void AS $$
DECLARE
  v_campaign_id UUID;
  v_user_id UUID;
BEGIN
  SELECT campaign_id, invited_user_id
  INTO v_campaign_id, v_user_id
  FROM campaign_invites
  WHERE id = invite_id
    AND invited_user_id = auth.uid()
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found, not authorized, or expired';
  END IF;

  INSERT INTO memberships (user_id, campaign_id, role)
  VALUES (v_user_id, v_campaign_id, 'player')
  ON CONFLICT DO NOTHING;

  UPDATE campaign_invites
  SET status = 'accepted', resolved_at = NOW()
  WHERE id = invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `update_activity`
```sql
CREATE OR REPLACE FUNCTION update_activity(
  p_campaign_id UUID,
  p_campaign_name TEXT,
  p_in_session BOOLEAN
)
RETURNS void AS $$
BEGIN
  INSERT INTO friend_activity (
    user_id, is_online, last_seen,
    current_campaign_id, current_campaign_name, in_active_session
  )
  VALUES (
    auth.uid(), TRUE, NOW(),
    p_campaign_id, p_campaign_name, p_in_session
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_online = TRUE,
    last_seen = NOW(),
    current_campaign_id = p_campaign_id,
    current_campaign_name = p_campaign_name,
    in_active_session = p_in_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## PART TWELVE — TACTICAL MAP (LONG TERM)

Not Version 1. Build after core combat is solid.
Grid battlefield, token placement, movement, AoE, line of sight.

---

## PART THIRTEEN — FRIEND SYSTEM & SOCIAL LAYER

### Philosophy
Players find each other through the app, not just by sharing campaign IDs.
Friend connections let you invite friends into campaigns, see when friends
are in an active session, and find people to play with.
No social feed, no likes — just connections that matter for playing together.

### Friend States
- **pending** — request sent, not yet accepted
- **accepted** — mutual connection
- **blocked** — one-way block

### `friend_requests`
```sql
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','blocked')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);
```

### `friendships`
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_a < user_b),
  UNIQUE(user_a, user_b)
);
```

### `friend_activity`
```sql
CREATE TABLE friend_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_campaign_id UUID REFERENCES campaigns(id),
  current_campaign_name TEXT DEFAULT '',
  in_active_session BOOLEAN DEFAULT FALSE,
  status_text TEXT DEFAULT '',
  privacy TEXT DEFAULT 'friends'
    CHECK (privacy IN ('public','friends','none'))
);
```

### `campaign_invites`
```sql
CREATE TABLE campaign_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  resolved_at TIMESTAMPTZ,
  UNIQUE(campaign_id, invited_user_id)
);
```

### How It All Connects
- Search for friends by display name on the friends page
- Send a friend request with optional message
- Receiver sees pending requests on home.html
- Accept → friendship row created via `accept_friend_request` RPC
- DM opens campaign settings → "Invite Friends" — shows friend list with online status
- Friend sees invite on home.html → accepts via `accept_campaign_invite` RPC
- On home.html, friends panel shows who is online and what campaign they're in
- Privacy setting lets friends hide their activity

### RLS For Friend System
```sql
CREATE POLICY "friend_requests_own" ON friend_requests
FOR ALL TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "friendships_own" ON friendships
FOR SELECT TO authenticated
USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "friend_activity_read" ON friend_activity
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR privacy = 'public'
  OR (
    privacy = 'friends' AND user_id IN (
      SELECT user_b FROM friendships WHERE user_a = auth.uid()
      UNION
      SELECT user_a FROM friendships WHERE user_b = auth.uid()
    )
  )
);

CREATE POLICY "campaign_invites_own" ON campaign_invites
FOR ALL TO authenticated
USING (invited_user_id = auth.uid() OR invited_by = auth.uid());
```

---

## PART FOURTEEN — SQL TO RUN

### Already run:
```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
```

### Run before PR 5b-2:
```sql
CREATE OR REPLACE FUNCTION adjust_hp(character_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE characters
  SET cur_hp = GREATEST(0, LEAST(max_hp, cur_hp + delta))
  WHERE id = character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Run before PR 5b-4:
```sql
ALTER TABLE weapons
  ADD COLUMN IF NOT EXISTS ability_mod TEXT DEFAULT 'str',
  ADD COLUMN IF NOT EXISTS use_proficiency BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS damage_bonus_feature TEXT,
  ADD COLUMN IF NOT EXISTS crit_dice TEXT;
```

### Run before PR 7a (friend system):
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS friend_requests ( ... );
CREATE TABLE IF NOT EXISTS friendships ( ... );
CREATE TABLE IF NOT EXISTS friend_activity ( ... );
CREATE TABLE IF NOT EXISTS campaign_invites ( ... );
-- (use full CREATE TABLE statements from Part Thirteen above)
```

### Run before Phase 2 (world building):
```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS feature_combat_tracker BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_online_dice BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_tactical_map BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feature_buff_system BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_combat_log BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_world_events_feed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_dm_allowances BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_lore_vault BOOLEAN DEFAULT TRUE;

ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS personality TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS motivation TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS secret TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS speech_pattern TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS relationships JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_npc_id UUID;

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS arc_id UUID REFERENCES campaign_arcs(id),
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lore TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS map_image_url TEXT,
  ADD COLUMN IF NOT EXISTS parent_location_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📍',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_location_id UUID;

ALTER TABLE factions
  ADD COLUMN IF NOT EXISTS goals TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS methods TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS secrets TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '⚔',
  ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '#c4920a';
```

---

## PART FIFTEEN — COMPLETE TABLE REFERENCE

| Table | Phase | Status |
|-------|-------|--------|
| `profiles` | Foundation | Built (needs ALTER PR 7a) |
| `campaigns` | Foundation | Built (needs ALTER Phase 2) |
| `memberships` | Foundation | Built |
| `ui_preferences` | Display | PR 6 |
| `display_preferences` | Display | Video game mode PR |
| `characters` | Characters | PR 5b-1 (level/xp added) |
| `currency` | Characters | PR 5b-4 |
| `weapons` | Characters | PR 5b-4 (needs ALTER before) |
| `features` | Characters | PR 5b-4 |
| `resources` | Characters | PR 5b-4 |
| `spell_slots` | Characters | PR 5b-5 |
| `items` | Characters | PR 5b-4 |
| `character_inventory` | Characters | PR 5b-4 |
| `campaign_arcs` | Hierarchy | Phase 2 |
| `session_plans` | World Building | Phase 2 |
| `session_scenes` | World Building | Phase 2 |
| `scene_npcs` | World Building | Phase 2 |
| `scene_dialogue` | World Building | Phase 2 |
| `scene_encounters` | World Building | Phase 2 |
| `scene_contingencies` | World Building | Phase 2 |
| `timelines` | World Building | Phase 2 |
| `timeline_nodes` | World Building | Phase 2 |
| `world_events` | World Building | Phase 2 |
| `lore_entries` | World Building | Phase 2 |
| `content_visibility` | World Building | Phase 2 |
| `tags` | World Building | Phase 2 |
| `public_content` | Sharing | Phase 2 |
| `npcs` | World Building | Built (needs ALTER Phase 2) |
| `locations` | World Building | Built (needs ALTER Phase 2) |
| `quests` | World Building | Built (needs ALTER Phase 2) |
| `factions` | World Building | Built (needs ALTER Phase 2) |
| `faction_reputations` | World Building | Built |
| `shop_listings` | Shop | Phase 2 |
| `homebrew` | Homebrew | Phase 2 |
| `combat_sessions` | Combat | Built |
| `enemies` | Combat | Phase 3 |
| `active_effects` | Combat | Phase 3 |
| `combat_log` | Combat | Phase 3 |
| `dice_rolls` | Combat | Phase 3 |
| `dm_allowances` | Combat | Phase 3 |
| `friend_requests` | Social | Phase 2 PR 7a |
| `friendships` | Social | Phase 2 PR 7a |
| `friend_activity` | Social | Phase 2 PR 7d |
| `campaign_invites` | Social | Phase 2 PR 7c |

---

## PART SIXTEEN — FULL BUILD ORDER

### Phase 1 — Character Sheet (current)
| PR | What |
|----|------|
| 5b-1 | Auth + character load + header saves |
| 5b-2 | Ability scores + combat stats + HP |
| 5b-3 | Death saves + saving throws + skills |
| 5b-4 | Weapons + features + proficiencies + equipment + currency |
| 5b-5 | Conditions + spell slots + spells + personality + backstory |
| 6 | Layout persistence via ui_preferences |

### Phase 2 — DM World Building
| PR | What |
|----|------|
| 7 | Campaign arcs + session plan builder + scene editor |
| 7a | Friends page — search, send/accept/decline requests |
| 7b | home.html friends panel — online status, pending requests |
| 7c | Campaign invites — DM invite friends, accept on home.html |
| 7d | Activity tracking — online status, in-session indicator |
| 8 | NPC builder — full linked creation, personality, secrets |
| 9 | Location builder — linked to NPCs, quests, factions |
| 10 | Quest builder — linked world, visibility controls |
| 11 | Timeline planner — branching paths, contingencies |
| 12 | Live session mode — scene tracking, world events feed |
| 13 | Player world view — quest log, known NPCs, events feed |
| 14 | Lore vault — secrets, hidden content, reveal controls |
| 15 | Faction builder + reputation tracker |
| 16 | Tags + search + categories across all world content |
| 17 | Public content library — DM sharing and importing |
| 18 | Display preferences — video game mode, per-field overrides |

### Phase 3 — Combat System
| PR | What |
|----|------|
| 19 | combat.html — initiative, turn order, enemy management |
| 20 | Combat actions — attack rolls, damage, DM decision card |
| 21 | Active effects — buffs, debuffs, pending abilities panel |
| 22 | Dice animation mode — server-side rolls, real-time broadcast |
| 23 | Combat log — persistent session history |
| 24 | Enemy library — monster manual + custom enemies |
| 25 | DM allowances — homebrew approval workflow |

### Phase 4 — Tactical Map
| PR | What |
|----|------|
| 26 | Grid battlefield — token placement, movement, distance |
| 27 | Area effects — spell radius, AoE damage |
| 28 | Line of sight + cover |
