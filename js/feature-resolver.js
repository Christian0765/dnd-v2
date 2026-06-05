// js/feature-resolver.js
// FE-3 — Pure feature resolver.
//
// Public API: window.FeatureResolver.resolve(definition, context) → ProposedOutcome
//
// HARD RULE: This file must remain pure. No DOM access, no Supabase calls,
// no side effects of any kind. It computes and proposes — it never writes.
// Applying is a separate step the DM gates (FE-4).
//
// See FEATURE-ENGINE-SPEC.md for the @ namespace, definition shape, and
// the full rationale for the compute/propose/never-write philosophy.

(function () {
  'use strict';

  // ================================================================
  // SECTION 1 — TOKEN RESOLVER
  // Resolves @namespace tokens against the context object.
  // Returns the numeric (or array) value, or null for unknown tokens.
  //
  // Context shape (both sources described in FEATURE-ENGINE-SPEC.md):
  //   Sheet values:  stats.{stat}.mod, char.{field}, prof_bonus,
  //                  classes.{name}.level, spellcasting_mod,
  //                  spell_save_dc, spell_attack_bonus
  //   Combat values: slot_level, target.ac, target.hp, attack_total
  //   Test helper:   _rollFn — injected Math.random replacement for tests
  // ================================================================

  function resolveToken(token, context) {
    // @stats.str.mod  @stats.dex.mod  etc.
    var statsMatch = token.match(/^@stats\.(str|dex|con|int|wis|cha)\.mod$/);
    if (statsMatch) {
      var stat = statsMatch[1];
      return (context.stats && context.stats[stat] != null)
        ? context.stats[stat].mod
        : null;
    }

    // @char.level  @char.max_hp  @char.ac
    var charMatch = token.match(/^@char\.(level|max_hp|ac)$/);
    if (charMatch) {
      return (context.char != null) ? context.char[charMatch[1]] : null;
    }

    // @prof_bonus  (top-level, not nested)
    if (token === '@prof_bonus') return context.prof_bonus != null ? context.prof_bonus : null;

    // @classes.{name}.level  (multiclass-aware)
    var classMatch = token.match(/^@classes\.(\w+)\.level$/);
    if (classMatch) {
      return (context.classes && context.classes[classMatch[1]] != null)
        ? context.classes[classMatch[1]].level
        : null;
    }

    // Spellcasting tokens
    if (token === '@slot_level')          return context.slot_level != null ? context.slot_level : null;
    if (token === '@spellcasting_mod')    return context.spellcasting_mod != null ? context.spellcasting_mod : null;
    if (token === '@spell_save_dc')       return context.spell_save_dc != null ? context.spell_save_dc : null;
    if (token === '@spell_attack_bonus')  return context.spell_attack_bonus != null ? context.spell_attack_bonus : null;

    // Context tokens (live combat)
    if (token === '@target.ac')    return (context.target != null) ? context.target.ac : null;
    if (token === '@target.hp')    return (context.target != null) ? context.target.hp : null;
    if (token === '@attack_total') return context.attack_total != null ? context.attack_total : null;

    return null; // not in namespace
  }

  // ================================================================
  // SECTION 2 — DICE ROLLER
  // Rolls NdM dice, records individual results.
  // context._rollFn replaces Math.random for deterministic tests.
  // ================================================================

  function rollDice(count, sides, rollFn) {
    var rng = rollFn || Math.random;
    var results = [];
    for (var i = 0; i < count; i++) {
      results.push(Math.floor(rng() * sides) + 1);
    }
    return {
      notation: count + 'd' + sides,
      count: count,
      sides: sides,
      results: results,
      total: results.reduce(function (a, b) { return a + b; }, 0)
    };
  }

  // ================================================================
  // SECTION 3 — ARITHMETIC EVALUATOR (no eval)
  // Handles: integers, +, -, *, /, parentheses, unary minus.
  // Grammar:
  //   expr   → term   (('+' | '-') term)*
  //   term   → factor (('*' | '/') factor)*
  //   factor → '-' factor | '(' expr ')' | NUMBER
  // ================================================================

  function tokenizeArithmetic(expr) {
    var tokens = [];
    var s = expr.replace(/\s+/g, '');
    var i = 0;
    while (i < s.length) {
      if (/\d/.test(s[i]) || (s[i] === '.' && i + 1 < s.length && /\d/.test(s[i + 1]))) {
        var num = '';
        while (i < s.length && /[\d.]/.test(s[i])) { num += s[i++]; }
        tokens.push(num);
      } else if ('+-*/()'.indexOf(s[i]) !== -1) {
        tokens.push(s[i++]);
      } else {
        i++; // skip unknown chars (shouldn't appear after token substitution)
      }
    }
    return tokens;
  }

  function evaluateArithmetic(expr) {
    if (!expr || expr.trim() === '') return 0;
    var tokens = tokenizeArithmetic(expr);
    var pos = 0;

    function peek() { return tokens[pos]; }
    function consume() { return tokens[pos++]; }

    function parseFactor() {
      var tok = peek();
      if (tok === '-') {
        consume();
        return -parseFactor();
      }
      if (tok === '(') {
        consume();
        var val = parseExpr();
        consume(); // ')'
        return val;
      }
      consume();
      return parseFloat(tok) || 0;
    }

    function parseTerm() {
      var left = parseFactor();
      while (peek() === '*' || peek() === '/') {
        var op = consume();
        var right = parseFactor();
        left = (op === '*') ? left * right : left / right;
      }
      return left;
    }

    function parseExpr() {
      var left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        var op = consume();
        var right = parseTerm();
        left = (op === '+') ? left + right : left - right;
      }
      return left;
    }

    return parseExpr();
  }

  // ================================================================
  // SECTION 4 — FORMULA EVALUATOR
  // Combines token substitution → dice rolling → arithmetic evaluation.
  // Returns a FormulaResult with full audit trail for the DM card.
  // ================================================================

  function evaluateFormula(formula, context) {
    if (!formula && formula !== 0) {
      return { formula_raw: '', formula_token_substituted: '0',
               formula_dice_rolled: '0', rolls: [], total: 0, errors: [] };
    }
    var raw = String(formula);

    // Step 1: substitute @tokens
    var tokenErrors = [];
    var tokenSubstituted = raw.replace(/@[\w.]+/g, function (token) {
      var value = resolveToken(token, context);
      if (value === null || value === undefined) {
        tokenErrors.push('Missing token: ' + token);
        return '0';
      }
      // Wrap negative values in parens to keep arithmetic unambiguous
      return (typeof value === 'number' && value < 0) ? '(' + value + ')' : String(value);
    });

    // Step 2: roll dice (NdM or dM notation)
    var rolls = [];
    var rollFn = context._rollFn || null;
    var diceRolled = tokenSubstituted.replace(/(\d*)d(\d+)/gi, function (match, countStr, sidesStr) {
      var count = countStr ? parseInt(countStr, 10) : 1;
      var sides = parseInt(sidesStr, 10);
      var roll = rollDice(count, sides, rollFn);
      rolls.push(roll);
      return String(roll.total);
    });

    // Step 3: evaluate arithmetic
    var total = 0;
    var arithmeticError = null;
    try {
      total = evaluateArithmetic(diceRolled);
      total = Math.round(total); // D&D always uses integers
    } catch (e) {
      arithmeticError = 'Arithmetic error: ' + e.message;
    }

    return {
      formula_raw: raw,
      formula_token_substituted: tokenSubstituted,
      formula_dice_rolled: diceRolled,
      rolls: rolls,
      total: total,
      errors: tokenErrors.concat(arithmeticError ? [arithmeticError] : [])
    };
  }

  // ================================================================
  // SECTION 5 — CONDITION EVALUATOR
  // Evaluates a structured triple { lhs, op, rhs } — never eval().
  // Ratified operators: ==, !=, >, >=, <, <=, in, not_in
  // ================================================================

  var RATIFIED_OPS = ['==', '!=', '>', '>=', '<', '<=', 'in', 'not_in'];

  function resolveConditionValue(val, context) {
    if (typeof val === 'string' && val.charAt(0) === '@') {
      return resolveToken(val, context);
    }
    if (Array.isArray(val)) return val; // used by 'in' / 'not_in'
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) return Number(val);
    return val;
  }

  function evaluateCondition(condition, context) {
    var lhs = condition.lhs;
    var op  = condition.op;
    var rhs = condition.rhs;

    if (RATIFIED_OPS.indexOf(op) === -1) {
      return { lhs: lhs, op: op, rhs: rhs, lhs_value: null, rhs_value: null,
               result: false, error: 'Unknown operator: ' + op };
    }

    var lhsValue = resolveConditionValue(lhs, context);
    var rhsValue = resolveConditionValue(rhs, context);
    var result;

    switch (op) {
      case '==':     result = lhsValue == rhsValue; break;   // intentional == for numeric coercion
      case '!=':     result = lhsValue != rhsValue; break;
      case '>':      result = lhsValue > rhsValue;  break;
      case '>=':     result = lhsValue >= rhsValue; break;
      case '<':      result = lhsValue < rhsValue;  break;
      case '<=':     result = lhsValue <= rhsValue; break;
      case 'in':     result = Array.isArray(rhsValue) && rhsValue.indexOf(lhsValue) !== -1; break;
      case 'not_in': result = Array.isArray(rhsValue) && rhsValue.indexOf(lhsValue) === -1; break;
      default:       result = false;
    }

    return { lhs: lhs, op: op, rhs: rhs, lhs_value: lhsValue, rhs_value: rhsValue, result: result };
  }

  // ================================================================
  // SECTION 6 — EFFECT RESOLVER (recursive)
  // Handles damage, heal, condition, active_effect, and save branches.
  // Both on_fail and on_success are always resolved — the DM card
  // displays both so the DM can apply whichever branch matches the roll.
  // ================================================================

  function resolveEffect(effect, context) {
    // Save-branch effect: { save, on_fail, on_success }
    if (effect.save) {
      var dcRaw = effect.save.dc;
      var dc;
      if (typeof dcRaw === 'string' && dcRaw.charAt(0) === '@') {
        dc = resolveToken(dcRaw, context);
      } else {
        dc = Number(dcRaw);
      }
      return {
        kind: 'save_branch',
        save: { stat: effect.save.stat, dc_raw: dcRaw, dc: dc },
        on_fail:    (effect.on_fail    || []).map(function (e) { return resolveEffect(e, context); }),
        on_success: (effect.on_success || []).map(function (e) { return resolveEffect(e, context); })
      };
    }

    // Damage effect
    if (effect.kind === 'damage') {
      var dmgResult = evaluateFormula(effect.formula || '0', context);
      return Object.assign({ kind: 'damage', damage_type: effect.damage_type || 'untyped' }, dmgResult);
    }

    // Heal effect
    if (effect.kind === 'heal') {
      var healResult = evaluateFormula(effect.formula || '0', context);
      return Object.assign({ kind: 'heal' }, healResult);
    }

    // Status condition (describes what to apply — not applied here)
    if (effect.kind === 'condition') {
      return { kind: 'condition', condition_name: effect.condition_name, duration: effect.duration || null };
    }

    // Active effect / buff spawn (describes what would be created — not created here)
    if (effect.kind === 'active_effect') {
      return {
        kind: 'active_effect',
        effect_type: effect.effect_type,
        effect_name: effect.effect_name,
        formula: effect.formula,
        applies_to: effect.applies_to,
        duration_type: effect.duration_type,
        rounds: effect.rounds || null
      };
    }

    // Unknown kind — pass through with an error note
    return { kind: effect.kind || 'unknown', raw: effect, error: 'Unrecognized effect kind: ' + effect.kind };
  }

  // ================================================================
  // SECTION 7 — MAIN RESOLVER
  //
  // resolve(definition, context) → ProposedOutcome
  //
  // ProposedOutcome shape:
  // {
  //   ok: boolean,
  //   error: string | null,
  //   conditions_met: boolean,       // true if all preconditions pass (or none)
  //   conditions: ConditionResult[], // one per definition.conditions entry
  //   effects: ResolvedEffect[],     // one per definition.effects entry
  //   cost: object | null            // from definition.cost, passed through
  // }
  //
  // Effects are always resolved (including both save branches) so the DM
  // decision card can display the full outcome before any state is written.
  // ================================================================

  function resolve(definition, context) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      return { ok: false, error: 'Definition is missing or not an object',
               conditions_met: false, conditions: [], effects: [], cost: null };
    }
    if (!context || typeof context !== 'object') {
      return { ok: false, error: 'Context is missing or not an object',
               conditions_met: false, conditions: [], effects: [], cost: null };
    }

    // Evaluate preconditions
    var rawConditions = Array.isArray(definition.conditions) ? definition.conditions : [];
    var conditions = rawConditions.map(function (c) { return evaluateCondition(c, context); });
    var conditions_met = conditions.every(function (c) { return c.result === true; });

    // Resolve effects (both branches of every save are pre-rolled for the DM card)
    var rawEffects = Array.isArray(definition.effects) ? definition.effects : [];
    var effects = rawEffects.map(function (e) { return resolveEffect(e, context); });

    return {
      ok: true,
      error: null,
      conditions_met: conditions_met,
      conditions: conditions,
      effects: effects,
      cost: definition.cost || null
    };
  }

  // ================================================================
  // SECTION 8 — EXPORT
  // ================================================================

  window.FeatureResolver = {
    resolve: resolve,
    // Exposed for tests and FE-4 wiring
    _resolveToken: resolveToken,
    _evaluateCondition: evaluateCondition,
    _evaluateFormula: evaluateFormula,
    _resolveEffect: resolveEffect
  };

  // ================================================================
  // SECTION 9 — INLINE TESTS
  // Run in browser console: FeatureResolver.runTests()
  //
  // Tests prove the resolver handles the three canonical spec examples:
  //   T1 — Divine Smite  (2d8 radiant, conditional on hit)
  //   T2 — Fireball      (save branch: 8d6 / 4d6 fire)
  //   T3 — Healing Word  (slot-scaling formula: 1d4 + spellcasting mod)
  // ================================================================

  function runTests() {
    var passed = 0;
    var failed = 0;

    function assert(label, condition, detail) {
      if (condition) {
        console.log('[PASS] ' + label);
        passed++;
      } else {
        console.error('[FAIL] ' + label + (detail ? ' — ' + detail : ''));
        failed++;
      }
    }

    // Deterministic dice: always rolls the mid value of the die.
    // e.g. d8 → always 5, d6 → always 4 (floor(0.5 * sides) + 1)
    function fixedRoll() { return 0.5; }

    // Shared fake context — a level 5 Paladin, CHA+4, casts into combat
    var ctx = {
      stats:  { str: { mod: 3 }, dex: { mod: 1 }, con: { mod: 2 },
                int: { mod: 0 }, wis: { mod: 1 }, cha: { mod: 4 } },
      char:   { level: 5, max_hp: 45, ac: 18 },
      prof_bonus: 3,
      classes: { paladin: { level: 5 } },
      slot_level: 2,
      spellcasting_mod: 4,
      spell_save_dc: 15,        // 8 + 3 (prof) + 4 (cha)
      spell_attack_bonus: 7,
      target: { ac: 14, hp: 30 },
      attack_total: 19,
      _rollFn: fixedRoll
    };

    // ── T1 — Divine Smite ────────────────────────────────────────────
    // Definition: optional bonus action on hit, costs a spell slot,
    // condition: attack_total >= target.ac, effect: 2d8 radiant
    var divineSmite = {
      trigger: { event: 'OnAttackRoll', activation: 'optional_on_hit' },
      cost: { resource: 'spell_slot', quantity: '1', action: 'bonus_action' },
      conditions: [
        { lhs: '@attack_total', op: '>=', rhs: '@target.ac' }
      ],
      effects: [
        { kind: 'damage', formula: '2d8', damage_type: 'radiant' }
      ]
    };

    var smiteResult = resolve(divineSmite, ctx);
    assert('T1: ok=true',             smiteResult.ok === true);
    assert('T1: conditions_met=true', smiteResult.conditions_met === true,
           'attack_total=' + ctx.attack_total + ' >= target.ac=' + ctx.target.ac);
    assert('T1: 1 condition evaluated',  smiteResult.conditions.length === 1);
    assert('T1: condition result=true',  smiteResult.conditions[0].result === true);
    assert('T1: 1 effect resolved',      smiteResult.effects.length === 1);
    assert('T1: effect kind=damage',     smiteResult.effects[0].kind === 'damage');
    assert('T1: damage_type=radiant',    smiteResult.effects[0].damage_type === 'radiant');
    assert('T1: 1 dice roll recorded',   smiteResult.effects[0].rolls.length === 1);
    assert('T1: roll notation=2d8',      smiteResult.effects[0].rolls[0].notation === '2d8');
    // fixedRoll = 0.5 → floor(0.5 * 8) + 1 = 5 per die → 2 dice → total 10
    assert('T1: total=10 (2×d8 mid)',    smiteResult.effects[0].total === 10,
           'got ' + smiteResult.effects[0].total);
    assert('T1: cost passed through',    smiteResult.cost && smiteResult.cost.resource === 'spell_slot');

    // Miss case: attack_total < target.ac
    var missCtx = Object.assign({}, ctx, { attack_total: 10, _rollFn: fixedRoll });
    var smiteMiss = resolve(divineSmite, missCtx);
    assert('T1-miss: conditions_met=false', smiteMiss.conditions_met === false,
           'attack_total=' + missCtx.attack_total + ' < target.ac=' + ctx.target.ac);
    assert('T1-miss: effects still resolved (for DM card)', smiteMiss.effects.length === 1,
           'resolver always pre-resolves effects for the DM card');

    // ── T2 — Fireball (save-branch spell) ────────────────────────────
    // 8d6 fire on failed DEX save, 4d6 fire on success.
    // Both branches are resolved so the DM card can show both outcomes.
    var fireball = {
      trigger: { event: 'OnSpellCast' },
      cost: { resource: 'spell_slot', quantity: '1', action: 'action' },
      effects: [
        {
          save: { stat: 'dex', dc: '@spell_save_dc' },
          on_fail:    [{ kind: 'damage', formula: '8d6', damage_type: 'fire' }],
          on_success: [{ kind: 'damage', formula: '4d6', damage_type: 'fire' }]
        }
      ]
    };

    var fireResult = resolve(fireball, ctx);
    assert('T2: ok=true',              fireResult.ok === true);
    assert('T2: no preconditions',     fireResult.conditions.length === 0);
    assert('T2: conditions_met=true',  fireResult.conditions_met === true,
           'no conditions = always met');
    assert('T2: 1 effect',             fireResult.effects.length === 1);
    assert('T2: kind=save_branch',     fireResult.effects[0].kind === 'save_branch');
    assert('T2: save.stat=dex',        fireResult.effects[0].save.stat === 'dex');
    assert('T2: save.dc=15',           fireResult.effects[0].save.dc === 15,
           'got ' + fireResult.effects[0].save.dc);
    assert('T2: on_fail resolved',     fireResult.effects[0].on_fail.length === 1);
    assert('T2: on_success resolved',  fireResult.effects[0].on_success.length === 1);
    // fixedRoll → d6 = floor(0.5*6)+1 = 4 per die
    // 8d6 fail branch: 8 × 4 = 32
    assert('T2: on_fail total=32',     fireResult.effects[0].on_fail[0].total === 32,
           'got ' + fireResult.effects[0].on_fail[0].total);
    // 4d6 success branch: 4 × 4 = 16
    assert('T2: on_success total=16',  fireResult.effects[0].on_success[0].total === 16,
           'got ' + fireResult.effects[0].on_success[0].total);
    assert('T2: on_fail damage_type=fire',    fireResult.effects[0].on_fail[0].damage_type === 'fire');
    assert('T2: on_success damage_type=fire', fireResult.effects[0].on_success[0].damage_type === 'fire');

    // ── T3 — Healing Word (slot-scaling formula) ─────────────────────
    // 1d4 + spellcasting mod, scales with @slot_level (bonus +1d4/level above 1)
    // Here the formula directly uses @slot_level as an addend to demonstrate
    // token resolution. ctx.slot_level=2, ctx.spellcasting_mod=4.
    var healingWord = {
      trigger: { event: 'OnSpellCast' },
      cost: { resource: 'spell_slot', quantity: '1', action: 'bonus_action' },
      effects: [
        { kind: 'heal', formula: '1d4 + @slot_level + @spellcasting_mod' }
      ]
    };

    var healResult = resolve(healingWord, ctx);
    assert('T3: ok=true',              healResult.ok === true);
    assert('T3: kind=heal',            healResult.effects[0].kind === 'heal');
    // @slot_level=2, @spellcasting_mod=4 → tokenSubstituted = '1d4 + 2 + 4'
    assert('T3: tokens substituted',
           healResult.effects[0].formula_token_substituted === '1d4 + 2 + 4',
           'got: ' + healResult.effects[0].formula_token_substituted);
    // fixedRoll → d4 = floor(0.5*4)+1 = 3 → total = 3 + 2 + 4 = 9
    assert('T3: total=9',              healResult.effects[0].total === 9,
           'got ' + healResult.effects[0].total);
    assert('T3: 1 dice roll recorded', healResult.effects[0].rolls.length === 1);
    assert('T3: roll notation=1d4',    healResult.effects[0].rolls[0].notation === '1d4');

    // ── T4 — Edge cases ──────────────────────────────────────────────
    // Missing context token falls back to 0 (with error logged)
    var emptyCtx = { _rollFn: fixedRoll };
    var missingToken = resolve(
      { effects: [{ kind: 'damage', formula: '@stats.cha.mod', damage_type: 'fire' }] },
      emptyCtx
    );
    assert('T4: missing token resolves without throw', missingToken.ok === true);
    assert('T4: missing token error recorded',
           missingToken.effects[0].errors.length > 0,
           'got: ' + JSON.stringify(missingToken.effects[0].errors));

    // Bad definition returns ok=false
    var badDef = resolve(null, ctx);
    assert('T4: null definition → ok=false', badDef.ok === false);

    // 'in' operator
    var inCondition = evaluateCondition(
      { lhs: '@stats.cha.mod', op: 'in', rhs: [4, 5, 6] }, ctx
    );
    assert('T4: in operator — cha.mod(4) in [4,5,6]', inCondition.result === true);

    // 'not_in' operator
    var notInCondition = evaluateCondition(
      { lhs: '@stats.str.mod', op: 'not_in', rhs: [4, 5, 6] }, ctx
    );
    assert('T4: not_in operator — str.mod(3) not_in [4,5,6]', notInCondition.result === true,
           'str.mod=' + ctx.stats.str.mod);

    // Negative modifier in formula
    var negCtx = Object.assign({}, ctx, {
      stats: Object.assign({}, ctx.stats, { str: { mod: -2 } }),
      _rollFn: fixedRoll
    });
    var negResult = resolve(
      { effects: [{ kind: 'damage', formula: '1d6 + @stats.str.mod', damage_type: 'bludgeoning' }] },
      negCtx
    );
    // d6 mid = floor(0.5*6)+1 = 4,  str.mod = -2  → 4 + (-2) = 2
    assert('T4: negative modifier — 1d6 + (-2) = 2',
           negResult.effects[0].total === 2,
           'got ' + negResult.effects[0].total);

    console.log('');
    console.log('FeatureResolver tests: ' + passed + ' passed, ' + failed + ' failed.');
    return { passed: passed, failed: failed };
  }

  window.FeatureResolver.runTests = runTests;

})();
