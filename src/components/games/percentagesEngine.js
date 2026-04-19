// ─────────────────────────────────────────────────────────────────────────────
// Percentages Lab — engine
// Pure functions. No React, no side-effects. Generates puzzles bounded to
// elementary / junior-high-friendly numbers, with a fading-scaffolding ladder.
// ─────────────────────────────────────────────────────────────────────────────

const rnd  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndi = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Level configuration ─────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  1: {
    vFactors: [2, 4, 5],
    hFactors: [2],
    totals:   [100, 200, 400, 500],
    puzzleTypes: ['vertical'],
    targets:     ['partValue'],
    shekelBiggerOnly: true,
    rollerMax:   10,
    scaffolding: 'full',           // show operator + factor on hint arc
  },
  2: {
    vFactors: [2, 4, 5, 10],
    hFactors: [2, 3],
    totals:   [100, 200, 300, 400, 500, 600, 800, 1000],
    puzzleTypes: ['vertical'],
    targets:     ['partValue', 'partPercent'],
    shekelBiggerOnly: true,
    rollerMax:   20,
    scaffolding: 'operator-only',   // show operator symbol only
  },
  3: {
    vFactors: [2, 4, 5, 10, 20],
    hFactors: [2, 3, 4, 5],
    totalsRange: [100, 1000],
    totalsStep:  50,
    puzzleTypes: ['vertical', 'horizontal'],
    targets:     ['partValue', 'partPercent', 'totalValue'],
    requireIntegerHFactor: true,
    rollerMax:   25,
    scaffolding: 'none',
  },
  4: {
    vFactors: [2, 4, 5, 8, 10, 20, 25],
    hFactors: [2, 3, 4, 5, 6, 10],
    totalsRange: [80, 1500],
    totalsStep:  20,
    puzzleTypes: ['vertical', 'horizontal'],
    targets:     'all',
    rollerMax:   50,
    scaffolding: 'none',
    hideLiveValue: true,
  },
  5: {
    vFactors: [4, 5, 8, 10, 20, 25, 40],
    hFactors: [2, 3, 4, 5, 8, 10],
    totalsRange: [100, 2000],
    totalsStep:  25,
    puzzleTypes: ['vertical', 'horizontal'],
    targets:     'all',
    rollerMax:   100,
    scaffolding: 'none',
    hideLiveValue: true,
    hidePlaceholderArc: true,
    expertFactors: [8, 3],          // 12.5% (÷8) and 33% (÷3) land here
  },
};

function getConfig(level) {
  return LEVEL_CONFIG[Math.max(1, Math.min(5, level))];
}

// ── Build one puzzle bounded to the level ───────────────────────────────────
// Returns (same shape as prototype, with extra metadata):
//   { partValue, partPercent, totalValue, totalPercent:100,
//     targetVar, puzzleType, isShekelBigger, activeArc, correctFactor,
//     correctOperation, display }
export function generatePuzzle(level) {
  const cfg = getConfig(level);

  // Up to 10 attempts to find a combination with integer values in range
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = buildOne(cfg);
    if (candidate) return candidate;
  }
  // Fallback — simplest possible puzzle
  return buildOne(LEVEL_CONFIG[1]) || fallback();
}

function buildOne(cfg) {
  const puzzleType = rnd(cfg.puzzleTypes);
  const vFactor    = rnd(cfg.vFactors);
  const hFactor    = rnd(cfg.hFactors);

  // Pick totalValue
  let totalValue;
  if (cfg.totals) {
    totalValue = rnd(cfg.totals);
  } else {
    const [lo, hi] = cfg.totalsRange;
    const step     = cfg.totalsStep || 10;
    const steps    = Math.floor((hi - lo) / step);
    totalValue     = lo + rndi(0, steps) * step;
  }

  // isShekelBigger?  (true → totalValue > 100, false → totalValue < 100)
  let isShekelBigger;
  if (cfg.shekelBiggerOnly) {
    isShekelBigger = true;
  } else {
    isShekelBigger = Math.random() > 0.5;
  }

  // For horizontal puzzles we need an integer hFactor.  Snap totalValue.
  if (puzzleType === 'horizontal' || cfg.requireIntegerHFactor) {
    if (isShekelBigger) totalValue = 100 * hFactor;    // guarantees integer
    else                totalValue = Math.max(10, Math.floor(100 / hFactor));
  }

  // Validate vertical integrality
  const partValue = totalValue / vFactor;
  if (!Number.isInteger(partValue) || partValue < 1 || partValue > 2000) return null;

  const partPercent = 100 / vFactor;
  if (!Number.isInteger(partPercent) && partPercent !== 12.5 && partPercent !== 33) return null;

  // Actual horizontal factor (how % maps to ₪)
  const actualHFactor = isShekelBigger ? (totalValue / 100) : (100 / totalValue);
  if (cfg.requireIntegerHFactor && !Number.isInteger(actualHFactor)) return null;

  // Which variable is unknown?
  const targets  = cfg.targets === 'all'
    ? ['partValue', 'partPercent', 'totalValue']
    : cfg.targets;
  const targetVar = rnd(targets);

  // Which arc is interactive?
  let activeArc;
  if (puzzleType === 'vertical') {
    activeArc = (targetVar === 'partValue' || targetVar === 'totalValue') ? 'left' : 'right';
  } else {
    activeArc = (targetVar === 'partValue' || targetVar === 'partPercent') ? 'top' : 'bottom';
  }

  const correctFactor    = puzzleType === 'vertical' ? vFactor : actualHFactor;
  const correctOperation = resolveCorrectOperation(puzzleType, targetVar, isShekelBigger);

  return {
    partValue,
    partPercent,
    totalValue,
    totalPercent: 100,
    targetVar,
    puzzleType,
    isShekelBigger,
    activeArc,
    correctFactor,
    correctOperation,
    display: {
      partValue:    targetVar === 'partValue'   ? '?' : partValue,
      partPercent:  targetVar === 'partPercent' ? '?' : partPercent,
      totalValue:   targetVar === 'totalValue'  ? '?' : totalValue,
      totalPercent: 100,
    },
  };
}

// What operation should the child land on for the puzzle to balance?
function resolveCorrectOperation(puzzleType, targetVar, isShekelBigger) {
  if (puzzleType === 'vertical') {
    if (targetVar === 'partValue')   return 'divide';    // total ÷ f → part
    if (targetVar === 'totalValue')  return 'multiply';  // part × f → total
    if (targetVar === 'partPercent') return 'divide';    // 100  ÷ f → %
  } else {
    if (targetVar === 'partValue' || targetVar === 'totalValue') {
      // starting from % → ₪: if shekel bigger, multiply; else divide
      return isShekelBigger ? 'multiply' : 'divide';
    }
    if (targetVar === 'partPercent') {
      return isShekelBigger ? 'divide' : 'multiply';
    }
  }
  return 'multiply';
}

// Compute what the child's current (operation, factor) would yield.
// Used both by the live-value display and by the validator.
export function computeLiveValue(puzzle, userLogic) {
  if (!puzzle) return '?';
  const { targetVar, puzzleType, isShekelBigger } = puzzle;
  const { factor, operation } = userLogic;
  if (!factor || factor < 1) return '?';

  let r;
  if (puzzleType === 'vertical') {
    if (targetVar === 'partValue') {
      r = operation === 'divide'   ? puzzle.totalValue / factor : puzzle.totalValue * factor;
    } else if (targetVar === 'totalValue') {
      r = operation === 'multiply' ? puzzle.partValue  * factor : puzzle.partValue  / factor;
    } else {
      r = operation === 'divide'   ? 100 / factor              : 100 * factor;
    }
  } else {
    if (targetVar === 'partValue' || targetVar === 'totalValue') {
      const knownPct = targetVar === 'partValue' ? puzzle.partPercent : 100;
      if (isShekelBigger) r = operation === 'multiply' ? knownPct * factor : knownPct / factor;
      else                r = operation === 'divide'   ? knownPct / factor : knownPct * factor;
    } else {
      const knownShekel = puzzle.partValue;
      if (isShekelBigger) r = operation === 'divide'   ? knownShekel / factor : knownShekel * factor;
      else                r = operation === 'multiply' ? knownShekel * factor : knownShekel / factor;
    }
  }
  if (typeof r !== 'number' || !isFinite(r)) return '?';
  // Snap to integer if extremely close (float noise); otherwise keep 1 decimal
  if (Math.abs(r - Math.round(r)) < 0.01) return Math.round(r);
  return Math.round(r * 10) / 10;
}

// Validator — compares the computed value against the target.
// Uses epsilon tolerance so 12.5, 33⅓ etc. don't break on float equality.
// For integer-factor puzzles we also require the operation+factor to match exactly.
const EPSILON = 0.1;

export function isCorrect(puzzle, userLogic) {
  const live   = computeLiveValue(puzzle, userLogic);
  const target = puzzle[puzzle.targetVar];
  if (typeof live !== 'number' || typeof target !== 'number') return false;
  if (Math.abs(live - target) > EPSILON) return false;

  if (Number.isInteger(puzzle.correctFactor)) {
    return userLogic.factor === puzzle.correctFactor &&
           userLogic.operation === puzzle.correctOperation;
  }
  // Floating correctFactor (L4-L5): value match is sufficient
  return true;
}

// ── Scaffolding — what visual aids are turned on for this level? ────────────
export function getScaffolding(level) {
  const cfg = getConfig(level);
  return {
    showHintOperator: cfg.scaffolding === 'full' || cfg.scaffolding === 'operator-only',
    showHintFactor:   cfg.scaffolding === 'full',
    showLiveValue:    !cfg.hideLiveValue,
    hidePlaceholderArc: !!cfg.hidePlaceholderArc,
    rollerMax:        cfg.rollerMax,
  };
}

// ── Hint generator — graded by level ────────────────────────────────────────
// Returns { kind, operation?, factor?, example?, text }
export function getHint(puzzle, level) {
  if (!puzzle) return null;
  const { correctOperation, correctFactor } = puzzle;

  if (level <= 2) {
    return {
      kind: 'both',
      operation: correctOperation,
      factor:    Number.isInteger(correctFactor) ? correctFactor : Math.round(correctFactor),
      text: 'נסה את הפעולה והמספר שזוהרים ✨',
    };
  }
  if (level === 3) {
    return {
      kind: 'operator',
      operation: correctOperation,
      text: correctOperation === 'multiply'
        ? 'הכיוון הנכון הוא כפל (×)'
        : 'הכיוון הנכון הוא חילוק (÷)',
    };
  }
  if (level === 4) {
    // Numerical analogue with different numbers
    const examples = [
      '100% = 400₪, אז 25% זה 400÷4 = 100₪',
      '100% = 200₪, אז 50% זה 200÷2 = 100₪',
      '10% של 300₪ זה 300÷10 = 30₪',
      '100% = 600₪, אז 20% זה 600÷5 = 120₪',
    ];
    return { kind: 'example', text: rnd(examples) };
  }
  // L5 — verbal only
  return {
    kind: 'text',
    text: 'כשהאחוז קטן מ-100 אתה מחפש חלק מהסכום — לכן חלק (÷). כשהוא גדול — כופל (×).',
  };
}

// ── Safety fallback for truly degenerate rolls ──────────────────────────────
function fallback() {
  return {
    partValue: 50, partPercent: 50, totalValue: 100, totalPercent: 100,
    targetVar: 'partValue', puzzleType: 'vertical', isShekelBigger: true,
    activeArc: 'left', correctFactor: 2, correctOperation: 'divide',
    display: { partValue: '?', partPercent: 50, totalValue: 100, totalPercent: 100 },
  };
}
