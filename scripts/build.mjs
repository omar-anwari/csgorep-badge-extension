import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
if (!target || !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/build.mjs <chrome|firefox>');
  process.exit(1);
}

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist', target);

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(srcDir, distDir, { recursive: true });

if (target === 'chrome') {
  copyFileSync(
    path.join(srcDir, 'manifest.chrome.json'),
    path.join(distDir, 'manifest.json')
  );
}

rmSync(path.join(distDir, 'manifest.chrome.json'), { force: true });
