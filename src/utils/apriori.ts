import type { Transaction, FrequentItemset, AssociationRule } from '../store/useAppStore';

// ─── Key Helpers ──────────────────────────────────────────────────────────────

/** Canonical sorted key for a set of items */
const itemKey = (items: string[]) => [...items].sort().join('\x00');

// ─── Support Counter ─────────────────────────────────────────────────────────

function buildCountFn(txArrays: string[][]) {
  return function countSupport(items: string[]): number {
    return txArrays.filter((tx) => items.every((item) => tx.includes(item))).length;
  };
}

// ─── Candidate Generation (Apriori-Gen) ──────────────────────────────────────
/**
 * Given a list of frequent k-itemsets (each already sorted internally),
 * generate candidate (k+1)-itemsets via the standard Apriori join + prune.
 */
function aprioriGen(freqK: string[][], freqKeySet: Set<string>): string[][] {
  const candidates: string[][] = [];
  const sorted = freqK.map((s) => [...s].sort());
  const k = sorted[0]?.length ?? 0;

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      // Check if first (k-1) elements are identical
      let prefixMatch = true;
      for (let p = 0; p < k - 1; p++) {
        if (a[p] !== b[p]) { prefixMatch = false; break; }
      }
      if (!prefixMatch) continue;

      // Last element of a must be strictly less than last of b
      if (a[k - 1] >= b[k - 1]) continue;

      const candidate = [...a, b[k - 1]];

      // Prune: every k-subset of candidate must be frequent
      let valid = true;
      for (let drop = 0; drop < candidate.length; drop++) {
        const sub = candidate.filter((_, idx) => idx !== drop);
        if (!freqKeySet.has(itemKey(sub))) { valid = false; break; }
      }
      if (valid) candidates.push(candidate);
    }
  }
  return candidates;
}

// ─── Bitmask Subset Enumeration ────────────────────────────────────────────────

function* nonEmptyProperSubsets(arr: string[]): Generator<{ ant: string[]; con: string[] }> {
  const n = arr.length;
  const max = (1 << n) - 1;
  for (let mask = 1; mask < max; mask++) {
    const ant: string[] = [];
    const con: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) ant.push(arr[i]);
      else con.push(arr[i]);
    }
    yield { ant, con };
  }
}

// ─── Main Apriori Function ────────────────────────────────────────────────────

export function runApriori(
  transactions: Transaction[],
  minSupport: number,   // fraction 0–1
  minConfidence: number // fraction 0–1
): { frequentItemsets: FrequentItemset[]; associationRules: AssociationRule[] } {
  const N = transactions.length;
  if (N === 0) return { frequentItemsets: [], associationRules: [] };

  // Build transaction arrays (each tx is an array of trimmed service names)
  const txArrays: string[][] = transactions.map(
    (t) => [...new Set(t.services.map((s) => s.trim()).filter(Boolean))]
  );

  const countSupport = buildCountFn(txArrays);

  // FIX 1: Gunakan minSupport * N langsung tanpa Math.ceil
  // Math.ceil bisa over-prune untuk N tertentu, lebih aman pakai >= langsung
  const minCount = minSupport * N;

  // ── Step 1: Find frequent 1-itemsets ────────────────────────────────────────
  const allItems = new Set<string>();
  txArrays.forEach((tx) => tx.forEach((item) => allItems.add(item)));

  const supportMap = new Map<string, number>();
  const allFrequent: FrequentItemset[] = [];

  let prevFrequent: string[][] = [];

  for (const item of allItems) {
    const cnt = countSupport([item]);
    if (cnt >= minCount) {
      prevFrequent.push([item]);
      supportMap.set(itemKey([item]), cnt);
      allFrequent.push({ itemset: [item], support: cnt / N, frequency: cnt });
    }
  }

  if (prevFrequent.length === 0) {
    return { frequentItemsets: [], associationRules: [] };
  }

  // FIX 2: Sort prevFrequent secara konsisten sebelum masuk aprioriGen
  // Tanpa ini, join prefix di aprioriGen tidak akan bekerja dengan benar
  // dan 3-itemset seperti {Coloring, Hair Mask, Vitamin Rambut} bisa terlewat
  prevFrequent = prevFrequent.map((fi) => [...fi].sort());
  prevFrequent.sort((a, b) => a[0].localeCompare(b[0]));

  // ── Step 2: Find frequent k-itemsets (k ≥ 2) ────────────────────────────────
  for (let k = 2; k <= 8; k++) {
    if (prevFrequent.length < k - 1) break;

    const prevKeySet = new Set(prevFrequent.map((fi) => itemKey(fi)));
    const candidates = aprioriGen(prevFrequent, prevKeySet);
    if (candidates.length === 0) break;

    const nextFrequent: string[][] = [];

    for (const candidate of candidates) {
      const cnt = countSupport(candidate);
      if (cnt >= minCount) {
        nextFrequent.push(candidate);
        supportMap.set(itemKey(candidate), cnt);
        allFrequent.push({ itemset: candidate, support: cnt / N, frequency: cnt });
      }
    }

    if (nextFrequent.length === 0) break;

    // FIX 3: Sort nextFrequent secara konsisten untuk iterasi berikutnya
    prevFrequent = nextFrequent.map((fi) => [...fi].sort());
    prevFrequent.sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const cmp = a[i].localeCompare(b[i]);
        if (cmp !== 0) return cmp;
      }
      return a.length - b.length;
    });
  }

  // ── Step 3: Generate Association Rules ─────────────────────────────────────
  const associationRules: AssociationRule[] = [];

  for (const fi of allFrequent) {
    if (fi.itemset.length < 2) continue;

    for (const { ant, con } of nonEmptyProperSubsets(fi.itemset)) {
      const antKey = itemKey(ant);
      const conKey = itemKey(con);

      const antCnt = supportMap.get(antKey) ?? countSupport(ant);
      const conCnt = supportMap.get(conKey) ?? countSupport(con);

      if (antCnt === 0) continue;

      const confidence = fi.frequency / antCnt;
      if (confidence < minConfidence) continue;

      const supportA = antCnt / N;
      const supportB = conCnt / N;
      const lift = supportB > 0 ? confidence / supportB : 0;

      associationRules.push({
        id: '',
        antecedent: [...ant],
        consequent: [...con],
        supportA,
        supportB,
        support: fi.support,
        confidence,
        lift,
        keterangan: lift >= 1 ? 'Valid' : 'Tidak Valid',
      });
    }
  }

  // Sort by lift DESC, then confidence DESC
  associationRules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

  // Assign sequential IDs
  associationRules.forEach((r, i) => { r.id = `Rule_${i + 1}`; });

  return { frequentItemsets: allFrequent, associationRules };
}