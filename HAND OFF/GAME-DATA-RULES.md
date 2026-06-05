# GAME DATA RULES — DND V2
# Read this before creating or editing any file in /data/rulesets/
# This document defines how all game data must be formatted.

---

## Overview

All D&D system data (classes, races, spells, monsters, etc.) lives in JSON files
under `/data/rulesets/{ruleset}/`. This keeps game rules separate from campaign
data (which lives in Supabase) and makes it easy to add new rulesets later.

Current rulesets:
- `5e-2014` — D&D 5th Edition (2014 Player's Handbook)
- `5e-2024` — D&D 5th Edition (2024 revision) — coming later

---

## Golden Rules

1. **Pure JSON only.** No JavaScript, no comments, no trailing commas.
   Every file must pass `JSON.parse()` without errors.

2. **One file per data type.** Classes in `/classes/`, spells in `spells-*.json`,
   races in `races.json` etc. Never mix data types in one file.

3. **Subraces live inside their parent race.** Never create separate files for
   subraces — they are an array inside the race object.

4. **Subclasses live inside their parent class.** Never create separate files
   for subclasses — they are an array inside the class object.

5. **Never hardcode campaign data here.** NPC names, custom items, homebrew
   content — none of that belongs in these files. System data only.

6. **Descriptions are plain text.** No HTML, no markdown, no special formatting.
   Line breaks use `\n` if needed.

7. **Feature definitions follow FEATURE-ENGINE-SPEC.md.** When a feature object
   (in a class file, or homebrew) carries a `definition` block for the feature engine,
   it must match the shape in FEATURE-ENGINE-SPEC.md, and any formula inside it may use
   ONLY the ratified `@` tokens from that spec. Conditions are structured triples, never
   eval-able strings. Do not invent new tokens — adding a token is a change to the engine
   spec, not to a data file.

---

## Folder Structure

```
/data/
  /rulesets/
    /5e-2014/
      sheet_schema.json       Which sections appear on a character sheet
      shared.json             Shared data used across classes (ability names etc.)
      races.json              All races and subraces
      backgrounds.json        All backgrounds
      feats.json              All feats
      conditions.json         All conditions
      skills.json             All skills
      monsters.json           Monster stat blocks
      spells-1.json           Spells A-L
      spells-2.json           Spells M-Z
      spells-3.json           Additional/expanded spells
      /classes/
        artificer.json
        barbarian.json
        bard.json
        cleric.json
        druid.json
        fighter.json
        monk.json
        paladin.json
        ranger.json
        rogue.json
        sorcerer.json
        warlock.json
        wizard.json
  /templates/
    npc-template.json         Template for DM-created NPCs
    item-template.json        Template for DM-created items
    location-template.json    Template for DM-created locations
    quest-template.json       Template for DM-created quests
    shop-template.json        Template for DM-created shops
```

---

## File Formats

### Class File `/classes/{name}.json`

```json
{
  "name": "Fighter",
  "ruleset": "5e-2014",
  "hitDie": "d10",
  "primaryAbility": "str",
  "savingThrows": ["str", "con"],
  "armorClass": {
    "formula": "standard",
    "note": ""
  },
  "proficiencies": {
    "armor": ["Heavy", "Medium", "Light", "Shields"],
    "weapons": ["Martial", "Simple"],
    "tools": [],
    "skills": {
      "choose": 2,
      "from": ["Acrobatics", "Animal Handling", "Athletics", "History",
                "Insight", "Intimidation", "Perception", "Survival"]
    }
  },
  "startingEquipment": [
    "(a) chain mail or (b) leather armor, longbow, and 20 arrows",
    "(a) a martial weapon and a shield or (b) two martial weapons",
    "(a) a light crossbow and 20 bolts or (b) two handaxes",
    "(a) a dungeoneer's pack or (b) an explorer's pack"
  ],
  "subclasses": [
    {
      "name": "Battle Master",
      "source": "PHB",
      "unlocksAtLevel": 3,
      "description": "Those who emulate the archetypal Battle Master employ martial techniques...",
      "features": [
        {
          "level": 3,
          "name": "Combat Superiority",
          "description": "You learn maneuvers that are fueled by special dice called superiority dice."
        },
        {
          "level": 7,
          "name": "Know Your Enemy",
          "description": "If you spend at least 1 minute observing or interacting with another creature..."
        }
      ]
    },
    {
      "name": "Champion",
      "source": "PHB",
      "unlocksAtLevel": 3,
      "description": "The archetypal Champion focuses on the development of raw physical power...",
      "features": []
    }
  ],
  "features": [
    {
      "level": 1,
      "name": "Fighting Style",
      "category": "passive",
      "description": "You adopt a particular style of fighting as your specialty.",
      "options": [
        {
          "name": "Archery",
          "description": "+2 bonus to attack rolls with ranged weapons."
        },
        {
          "name": "Defense",
          "description": "+1 to AC when wearing armor."
        },
        {
          "name": "Dueling",
          "description": "+2 damage when wielding a melee weapon in one hand and no other weapons."
        },
        {
          "name": "Great Weapon Fighting",
          "description": "Reroll 1s and 2s on damage dice when using two-handed weapons."
        },
        {
          "name": "Protection",
          "description": "Use reaction to impose disadvantage on an attack against an adjacent ally."
        },
        {
          "name": "Two-Weapon Fighting",
          "description": "Add ability modifier to damage of off-hand attacks."
        }
      ]
    },
    {
      "level": 1,
      "name": "Second Wind",
      "category": "action",
      "formula": "1d10 + {level}",
      "recharge": "Short rest",
      "usesPerRecharge": 1,
      "description": "Bonus action: regain HP equal to 1d10 + your fighter level. Once per short or long rest."
    },
    {
      "level": 2,
      "name": "Action Surge",
      "category": "action",
      "recharge": "Short rest",
      "usesPerRecharge": 1,
      "usesAtLevel": { "17": 2 },
      "description": "Take one additional action on your turn. Once per short rest."
    }
  ],
  "progression": {
    "1":  { "profBonus": 2, "features": ["Fighting Style", "Second Wind"] },
    "2":  { "profBonus": 2, "features": ["Action Surge"] },
    "3":  { "profBonus": 2, "features": ["Martial Archetype"] },
    "4":  { "profBonus": 2, "features": ["ASI"] },
    "5":  { "profBonus": 3, "features": ["Extra Attack"] },
    "6":  { "profBonus": 3, "features": ["ASI"] },
    "7":  { "profBonus": 3, "features": ["Archetype Feature"] },
    "8":  { "profBonus": 3, "features": ["ASI"] },
    "9":  { "profBonus": 4, "features": ["Indomitable"] },
    "10": { "profBonus": 4, "features": ["Archetype Feature"] },
    "11": { "profBonus": 4, "features": ["Extra Attack (2)"] },
    "12": { "profBonus": 4, "features": ["ASI"] },
    "13": { "profBonus": 5, "features": ["Indomitable (2)"] },
    "14": { "profBonus": 5, "features": ["ASI"] },
    "15": { "profBonus": 5, "features": ["Archetype Feature"] },
    "16": { "profBonus": 5, "features": ["ASI"] },
    "17": { "profBonus": 6, "features": ["Action Surge (2)", "Indomitable (3)"] },
    "18": { "profBonus": 6, "features": ["Archetype Feature"] },
    "19": { "profBonus": 6, "features": ["ASI"] },
    "20": { "profBonus": 6, "features": ["Extra Attack (3)"] }
  },
  "spellcasting": null
}
```

For spellcasting classes, replace `"spellcasting": null` with:
```json
"spellcasting": {
  "ability": "int",
  "type": "prepared",
  "spellList": "wizard",
  "ritualCasting": true,
  "spellcastingFocus": "arcane focus or spellbook",
  "slotsTable": {
    "1":  [2,0,0,0,0,0,0,0,0],
    "2":  [3,0,0,0,0,0,0,0,0],
    "3":  [4,2,0,0,0,0,0,0,0],
    "4":  [4,3,0,0,0,0,0,0,0],
    "5":  [4,3,2,0,0,0,0,0,0],
    "6":  [4,3,3,0,0,0,0,0,0],
    "7":  [4,3,3,1,0,0,0,0,0],
    "8":  [4,3,3,2,0,0,0,0,0],
    "9":  [4,3,3,3,1,0,0,0,0],
    "10": [4,3,3,3,2,0,0,0,0],
    "11": [4,3,3,3,2,1,0,0,0],
    "12": [4,3,3,3,2,1,0,0,0],
    "13": [4,3,3,3,2,1,1,0,0],
    "14": [4,3,3,3,2,1,1,0,0],
    "15": [4,3,3,3,2,1,1,1,0],
    "16": [4,3,3,3,2,1,1,1,0],
    "17": [4,3,3,3,2,1,1,1,1],
    "18": [4,3,3,3,3,1,1,1,1],
    "19": [4,3,3,3,3,2,1,1,1],
    "20": [4,3,3,3,3,2,2,1,1]
  }
}
```

---

### Race File `races.json`

The races file is an array of race objects. Each race has a `subraces` array.
If a race has no subraces, `subraces` is an empty array.

```json
[
  {
    "name": "Dragonborn",
    "size": "Medium",
    "speed": 30,
    "languages": ["Common", "Draconic"],
    "abilityScoreIncrease": { "str": 2, "cha": 1 },
    "traits": [
      {
        "name": "Draconic Ancestry",
        "description": "You have draconic ancestry of a particular color of dragon."
      },
      {
        "name": "Breath Weapon",
        "description": "You can use your action to exhale destructive energy."
      },
      {
        "name": "Damage Resistance",
        "description": "You have resistance to the damage type associated with your draconic ancestry."
      }
    ],
    "subraces": [
      {
        "name": "Black Dragonborn",
        "damageType": "acid",
        "breathWeapon": { "shape": "5x30 ft line", "save": "DEX" },
        "resistance": "acid",
        "traits": []
      },
      {
        "name": "Blue Dragonborn",
        "damageType": "lightning",
        "breathWeapon": { "shape": "5x30 ft line", "save": "DEX" },
        "resistance": "lightning",
        "traits": []
      },
      {
        "name": "Brass Dragonborn",
        "damageType": "fire",
        "breathWeapon": { "shape": "5x30 ft line", "save": "DEX" },
        "resistance": "fire",
        "traits": []
      },
      {
        "name": "Bronze Dragonborn",
        "damageType": "lightning",
        "breathWeapon": { "shape": "5x30 ft line", "save": "DEX" },
        "resistance": "lightning",
        "traits": []
      },
      {
        "name": "Copper Dragonborn",
        "damageType": "acid",
        "breathWeapon": { "shape": "5x30 ft line", "save": "DEX" },
        "resistance": "acid",
        "traits": []
      },
      {
        "name": "Gold Dragonborn",
        "damageType": "fire",
        "breathWeapon": { "shape": "15 ft cone", "save": "DEX" },
        "resistance": "fire",
        "traits": []
      },
      {
        "name": "Green Dragonborn",
        "damageType": "poison",
        "breathWeapon": { "shape": "15 ft cone", "save": "CON" },
        "resistance": "poison",
        "traits": []
      },
      {
        "name": "Red Dragonborn",
        "damageType": "fire",
        "breathWeapon": { "shape": "15 ft cone", "save": "DEX" },
        "resistance": "fire",
        "traits": []
      },
      {
        "name": "Silver Dragonborn",
        "damageType": "cold",
        "breathWeapon": { "shape": "15 ft cone", "save": "CON" },
        "resistance": "cold",
        "traits": []
      },
      {
        "name": "White Dragonborn",
        "damageType": "cold",
        "breathWeapon": { "shape": "15 ft cone", "save": "CON" },
        "resistance": "cold",
        "traits": []
      }
    ]
  }
]
```

---

### Spell File `spells-*.json`

The spells file is an array of spell objects.

```json
[
  {
    "name": "Fireball",
    "level": 3,
    "school": "Evocation",
    "castingTime": "1 action",
    "range": "150 feet",
    "area": "20-foot-radius sphere",
    "components": ["V", "S", "M"],
    "material": "A tiny ball of bat guano and sulfur",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "classes": ["Sorcerer", "Wizard"],
    "description": "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.",
    "atHigherLevels": "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd."
  }
]
```

---

### Monster File `monsters.json`

The monsters file is an array of monster objects.

```json
[
  {
    "name": "Goblin",
    "size": "Small",
    "type": "humanoid (goblinoid)",
    "alignment": "neutral evil",
    "ac": 15,
    "acNote": "leather armor, shield",
    "hp": "2d6",
    "avgHp": 7,
    "speed": "30 ft",
    "str": 8,  "strMod": -1,
    "dex": 14, "dexMod": 2,
    "con": 10, "conMod": 0,
    "int": 10, "intMod": 0,
    "wis": 8,  "wisMod": -1,
    "cha": 8,  "chaMod": -1,
    "skills": { "Stealth": 6 },
    "senses": "darkvision 60 ft, passive Perception 9",
    "languages": ["Common", "Goblin"],
    "cr": "1/4",
    "xp": 50,
    "traits": [
      {
        "name": "Nimble Escape",
        "description": "The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
      }
    ],
    "actions": [
      {
        "name": "Scimitar",
        "type": "melee",
        "attackBonus": 4,
        "reach": "5 ft",
        "targets": 1,
        "damage": "1d6+2",
        "damageType": "slashing"
      },
      {
        "name": "Shortbow",
        "type": "ranged",
        "attackBonus": 4,
        "range": "80/320 ft",
        "targets": 1,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ]
  }
]
```

---

### Background File `backgrounds.json`

The backgrounds file is an array of background objects.

```json
[
  {
    "name": "Acolyte",
    "description": "You have spent your life in service to a temple...",
    "skillProficiencies": ["Insight", "Religion"],
    "toolProficiencies": [],
    "languages": 2,
    "equipment": [
      "Holy symbol",
      "Prayer book or prayer wheel",
      "5 sticks of incense",
      "Vestments",
      "Common clothes",
      "Belt pouch with 15 gp"
    ],
    "feature": {
      "name": "Shelter of the Faithful",
      "description": "As an acolyte, you command the respect of those who share your faith..."
    },
    "suggestedCharacteristics": {
      "personalityTraits": [
        "I idolize a particular hero of my faith...",
        "I can find common ground between the fiercest enemies..."
      ],
      "ideals": [
        { "name": "Tradition", "description": "The ancient traditions of worship must be preserved.", "alignment": "Lawful" }
      ],
      "bonds": [
        "I would die to recover an ancient relic of my faith."
      ],
      "flaws": [
        "I judge others harshly, and myself even more severely."
      ]
    }
  }
]
```

---

### Feat File `feats.json`

The feats file is an array of feat objects.

```json
[
  {
    "name": "Alert",
    "prerequisite": null,
    "description": "Always on the lookout for danger, you gain the following benefits:",
    "benefits": [
      "+5 bonus to initiative",
      "You can't be surprised while you are conscious",
      "Other creatures don't gain advantage on attack rolls against you as a result of being unseen by you"
    ]
  },
  {
    "name": "Actor",
    "prerequisite": null,
    "description": "Skilled at mimicry and dramatics, you gain the following benefits:",
    "benefits": [
      "Increase your Charisma score by 1, to a maximum of 20",
      "You have advantage on Charisma (Deception) and Charisma (Performance) checks when trying to pass yourself off as a different person",
      "You can mimic the speech of another person or the sounds made by other creatures"
    ],
    "abilityScoreIncrease": { "cha": 1 }
  }
]
```

---

### Conditions File `conditions.json`

```json
[
  {
    "name": "Blinded",
    "icon": "👁",
    "effects": [
      "A blinded creature can't see and automatically fails any ability check that requires sight",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage"
    ]
  },
  {
    "name": "Charmed",
    "icon": "💕",
    "effects": [
      "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects",
      "The charmer has advantage on any ability check to interact socially with the creature"
    ]
  }
]
```

---

### Skills File `skills.json`

```json
[
  {
    "name": "Acrobatics",
    "ability": "dex",
    "description": "Your Dexterity (Acrobatics) check covers your attempt to stay on your feet in a tricky situation."
  },
  {
    "name": "Animal Handling",
    "ability": "wis",
    "description": "When there is a question whether you can calm a domesticated animal, keep a mount from being spooked..."
  }
]
```

---

## Templates Folder `/data/templates/`

These files define the JSON format for DM-created content. When a DM uses a
separate agent to create an NPC, item, location etc., the agent outputs JSON
that matches these templates exactly. The DM can then import that JSON into
the game.

### `npc-template.json`
```json
{
  "_template": "npc",
  "_version": "1.0",
  "name": "",
  "race": "",
  "role": "",
  "alignment": "",
  "status": "alive",
  "location": "",
  "publicNotes": "",
  "dmNotes": "",
  "portrait": null,
  "type": "simple",
  "stats": {
    "hp": 0,
    "ac": 0,
    "str": 10, "dex": 10, "con": 10,
    "int": 10, "wis": 10, "cha": 10
  },
  "traits": [],
  "actions": []
}
```

### `item-template.json`
```json
{
  "_template": "item",
  "_version": "1.0",
  "name": "",
  "description": "",
  "category": "misc",
  "rarity": "common",
  "weight": 0,
  "valueGp": 0,
  "isMagical": false,
  "properties": {},
  "requiresAttunement": false
}
```

### `location-template.json`
```json
{
  "_template": "location",
  "_version": "1.0",
  "name": "",
  "type": "city",
  "description": "",
  "dmNotes": "",
  "discovered": false,
  "npcs": [],
  "shops": [],
  "pointsOfInterest": []
}
```

### `quest-template.json`
```json
{
  "_template": "quest",
  "_version": "1.0",
  "title": "",
  "description": "",
  "status": "hidden",
  "reward": "",
  "giverNpcName": "",
  "dmNotes": "",
  "objectives": []
}
```

### `shop-template.json`
```json
{
  "_template": "shop",
  "_version": "1.0",
  "name": "",
  "keeper": "",
  "type": "general",
  "location": "",
  "notes": "",
  "items": [
    {
      "name": "",
      "description": "",
      "category": "misc",
      "priceGp": 0,
      "quantity": -1,
      "visible": true
    }
  ]
}
```

---

## How To Add A New Ruleset

1. Create `/data/rulesets/{ruleset-name}/` folder
2. Copy `sheet_schema.json` from `5e-2014` and update for the new ruleset
3. Create class files matching the format above
4. Create races, spells, backgrounds, feats, conditions, skills files
5. Add the ruleset name to the `ruleset` selector in `home.html`
6. Update `GAME-DATA-RULES.md` to list the new ruleset

---

## How To Add A New Class To An Existing Ruleset

1. Create `/data/rulesets/{ruleset}/classes/{classname}.json`
2. Follow the class file format exactly
3. Include ALL features, ALL subclasses, complete progression table
4. Test that the file is valid JSON
5. Update `GAME-DATA-RULES.md` classes list
6. Update `HANDOFF.md`

---

## How To Add A New Subrace

Open the relevant race in `races.json` and add a new object to the `subraces`
array. Follow the subrace format shown in the Dragonborn example above.
Never create a separate file for a subrace.
