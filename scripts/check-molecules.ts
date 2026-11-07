// Run: node scripts/check-molecules.ts
// Checks each structure against its published formula, so a display edit can't quietly make the chemistry wrong.
import assert from "node:assert";
import { MOLECULES } from "../src/data/molecules.ts";

const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

for (const m of MOLECULES) {
  const plain = m.formula.replace(/[₀-₉]/g, (c) => SUB[c]);
  const fromFormula: Record<string, number> = {};
  for (const [, el, n] of plain.matchAll(/([A-Z][a-z]?)(\d*)/g)) if (el !== "H") fromFormula[el] = Number(n || 1);
  const counted: Record<string, number> = {};
  for (const a of m.atoms) counted[a.el] = (counted[a.el] ?? 0) + 1;

  assert.deepStrictEqual(counted, fromFormula, `${m.name}: atoms don't match ${m.formula}`);
  assert.deepStrictEqual(counted, m.heavyAtoms, `${m.name}: heavyAtoms out of date`);

  // Every bond points at real atoms, and only an ion may stand alone.
  const bonded = new Set<number>();
  for (const [a, b] of m.bonds) {
    assert.ok(m.atoms[a] && m.atoms[b] && a !== b, `${m.name}: bad bond ${a}-${b}`);
    bonded.add(a);
    bonded.add(b);
  }
  m.atoms.forEach((a, i) => assert.ok(bonded.has(i) || a.el === "K", `${m.name}: atom ${i} unbonded`));

  // Valence ceiling for each element in these molecules (sulfur is hypervalent here).
  const MAX: Record<string, number> = { C: 4, N: 4, O: 2, S: 6, K: 0 };
  m.atoms.forEach((a, i) => {
    const used = m.bonds.reduce((sum, [x, y, order]) => sum + (x === i || y === i ? order : 0), 0);
    assert.ok(used <= MAX[a.el], `${m.name}: atom ${i} (${a.el}) has ${used} bonds`);
  });
  console.log(`ok ${m.name} ${m.formula}`);
}
