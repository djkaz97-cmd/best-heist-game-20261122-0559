// Hands the entry in: game/ and screenshots/ go to /output (or MAKEFUN_OUTPUT_DIR),
// then the kit's dossier library writes the dossier the scorer compares byte for byte.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

mkdirSync(outDir, { recursive: true });

for (const part of ['game', 'screenshots']) {
  const target = join(outDir, part);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(here, part), target, { recursive: true });
}

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const parsed = JSON.parse(new TextDecoder().decode(dossier));
console.log(
  `Velvet Hour: ${parsed.images.length} screenshots, ${dossier.length} dossier bytes -> ${outDir}`,
);
