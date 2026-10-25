/**
 * Generate the pre-recorded voice clips (public/voice/<key>.m4a) with the macOS "Linh"
 * Vietnamese voice: `say` → AIFF → `afconvert` → AAC 32 kbps. Existing files are kept
 * unless --force, so hand-recorded replacements are not overwritten.
 *
 * Note: Apple's licence limits system-voice output to personal, non-commercial use —
 * replace the clips with a human recording before a commercial release.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { allClips } from '../src/lib/voiceClips';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public', 'voice');
const force = process.argv.includes('--force');
const voice = process.env.VOICE ?? 'Linh';
const rate = process.env.RATE ?? '185';

if (process.platform !== 'darwin') {
  console.error('voice:build needs macOS (`say` + `afconvert`).');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ba-bang-voice-'));
let made = 0;
let kept = 0;
for (const { key, text } of allClips()) {
  const out = path.join(outDir, `${key}.m4a`);
  if (!force && fs.existsSync(out)) {
    kept++;
    continue;
  }
  const aiff = path.join(tmp, `${key}.aiff`);
  execFileSync('say', ['-v', voice, '-r', rate, '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', aiff, out]);
  made++;
}
fs.rmSync(tmp, { recursive: true, force: true });
const bytes = fs.readdirSync(outDir).reduce((s, f) => s + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`voice: ${made} generated, ${kept} kept → public/voice (${(bytes / 1024).toFixed(0)} KB)`);
