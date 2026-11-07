// Skeletal structures for the formula section. Heavy atoms only: hydrogens are omitted, as in standard skeletal drawings.
// Layouts are for display, not measured geometry. Connectivity and heavy-atom counts are what must be correct:
// run `node scripts/check-molecules.ts` after any edit.
export type Molecule = {
  name: string;
  formula: string; // Display form, with subscripts.
  heavyAtoms: Record<string, number>;
  atoms: { el: "C" | "N" | "O" | "S" | "K"; p: [number, number, number] }[];
  bonds: [number, number, 1 | 2][];
};

export const CAFFEINE: Molecule = {
  name: "Caffeine",
  formula: "C₈H₁₀N₄O₂",
  heavyAtoms: { C: 8, N: 4, O: 2 },
  atoms: [
    { el: "N", p: [-1.21, 0.7, 0] }, // 0 N1
    { el: "C", p: [-1.21, -0.7, 0] }, // 1 C2
    { el: "N", p: [0, -1.4, 0] }, // 2 N3
    { el: "C", p: [1.21, -0.7, 0] }, // 3 C4
    { el: "C", p: [1.21, 0.7, 0] }, // 4 C5
    { el: "C", p: [0, 1.4, 0] }, // 5 C6
    { el: "N", p: [2.54, 1.13, 0] }, // 6 N7
    { el: "C", p: [3.36, 0, 0] }, // 7 C8
    { el: "N", p: [2.54, -1.13, 0] }, // 8 N9
    { el: "O", p: [0, 2.62, 0] }, // 9 C6=O
    { el: "O", p: [-2.26, -1.31, 0] }, // 10 C2=O
    { el: "C", p: [-2.26, 1.31, 0] }, // 11 N1 methyl
    { el: "C", p: [0, -2.62, 0] }, // 12 N3 methyl
    { el: "C", p: [3.05, 2.42, 0] }, // 13 N7 methyl
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 2],
    [4, 5, 1],
    [5, 0, 1],
    [4, 6, 1],
    [6, 7, 1],
    [7, 8, 2],
    [8, 3, 1],
    [5, 9, 2],
    [1, 10, 2],
    [0, 11, 1],
    [2, 12, 1],
    [6, 13, 1],
  ],
};

export const TAURINE: Molecule = {
  name: "Taurine",
  formula: "C₂H₇NO₃S",
  heavyAtoms: { C: 2, N: 1, O: 3, S: 1 },
  atoms: [
    { el: "N", p: [-3.1, -0.45, 0] }, // 0 amine
    { el: "C", p: [-1.85, 0.3, 0] }, // 1
    { el: "C", p: [-0.55, -0.45, 0] }, // 2
    { el: "S", p: [0.85, 0.3, 0] }, // 3 sulfonic acid
    { el: "O", p: [1.45, 1.6, 0] }, // 4 =O
    { el: "O", p: [2.05, -0.55, 0.85] }, // 5 =O
    { el: "O", p: [1.3, -0.45, -1.3] }, // 6 -OH
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 2],
    [3, 5, 2],
    [3, 6, 1],
  ],
};

export const NIACIN: Molecule = {
  name: "Niacin",
  formula: "C₆H₅NO₂",
  heavyAtoms: { C: 6, N: 1, O: 2 },
  atoms: [
    { el: "N", p: [-1.21, 0.7, 0] }, // 0 N1
    { el: "C", p: [0, 1.4, 0] }, // 1 C2
    { el: "C", p: [1.21, 0.7, 0] }, // 2 C3
    { el: "C", p: [1.21, -0.7, 0] }, // 3 C4
    { el: "C", p: [0, -1.4, 0] }, // 4 C5
    { el: "C", p: [-1.21, -0.7, 0] }, // 5 C6
    { el: "C", p: [2.45, 1.42, 0] }, // 6 carboxyl C
    { el: "O", p: [2.45, 2.64, 0] }, // 7 =O
    { el: "O", p: [3.5, 0.8, 0] }, // 8 -OH
  ],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
    [2, 6, 1],
    [6, 7, 2],
    [6, 8, 1],
  ],
};

// Glucose, shown for the sugars step: pyranose ring in a chair, with its hydroxyls and CH2OH.
export const GLUCOSE: Molecule = {
  name: "Glucose",
  formula: "C₆H₁₂O₆",
  heavyAtoms: { C: 6, O: 6 },
  atoms: [
    { el: "O", p: [-1.21, 0.7, 0.25] }, // 0 ring O
    { el: "C", p: [-1.21, -0.7, -0.25] }, // 1 C1
    { el: "C", p: [0, -1.4, 0.25] }, // 2 C2
    { el: "C", p: [1.21, -0.7, -0.25] }, // 3 C3
    { el: "C", p: [1.21, 0.7, 0.25] }, // 4 C4
    { el: "C", p: [0, 1.4, -0.25] }, // 5 C5
    { el: "O", p: [-2.32, -1.34, -0.1] }, // 6 C1-OH
    { el: "O", p: [0, -2.68, 0.1] }, // 7 C2-OH
    { el: "O", p: [2.32, -1.34, -0.1] }, // 8 C3-OH
    { el: "O", p: [2.32, 1.34, 0.1] }, // 9 C4-OH
    { el: "C", p: [0, 2.72, -0.1] }, // 10 C6
    { el: "O", p: [1.14, 3.38, 0.1] }, // 11 C6-OH
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 1],
    [4, 5, 1],
    [5, 0, 1],
    [1, 6, 1],
    [2, 7, 1],
    [3, 8, 1],
    [4, 9, 1],
    [5, 10, 1],
    [10, 11, 1],
  ],
};

// Acesulfame K, shown for the Sugarfree sweetener step: oxathiazinone ring dioxide and its potassium ion.
export const ACESULFAME_K: Molecule = {
  name: "Acesulfame K",
  formula: "C₄H₄KNO₄S",
  heavyAtoms: { C: 4, K: 1, N: 1, O: 4, S: 1 },
  atoms: [
    { el: "S", p: [-1.21, 0.7, 0] }, // 0
    { el: "N", p: [0, 1.4, 0] }, // 1
    { el: "C", p: [1.21, 0.7, 0] }, // 2 C=O
    { el: "C", p: [1.21, -0.7, 0] }, // 3 =CH
    { el: "C", p: [0, -1.4, 0] }, // 4 C-CH3
    { el: "O", p: [-1.21, -0.7, 0] }, // 5 ring O
    { el: "O", p: [-2.2, 1.35, 0.75] }, // 6 S=O
    { el: "O", p: [-2.2, 1.35, -0.75] }, // 7 S=O
    { el: "O", p: [2.27, 1.31, 0] }, // 8 C=O
    { el: "C", p: [0, -2.62, 0] }, // 9 methyl
    { el: "K", p: [0.3, 3.2, 0] }, // 10 ion, unbonded
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 2],
    [4, 5, 1],
    [5, 0, 1],
    [0, 6, 2],
    [0, 7, 2],
    [2, 8, 2],
    [4, 9, 1],
  ],
};

export const MOLECULES = [CAFFEINE, TAURINE, NIACIN, GLUCOSE, ACESULFAME_K];
