// A seeded PRNG. Nothing in Velvet Hour calls Math.random: every speck of grain,
// every halftone offset and every coin toss of texture comes from these two
// functions, so the same seed always paints the same frame.

/** Mulberry32: a fast 32-bit generator, returned as a function of no arguments. */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0..1 value for a grid cell, for texture that never shimmers. */
export function hash2(x, y, seed = 1) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
