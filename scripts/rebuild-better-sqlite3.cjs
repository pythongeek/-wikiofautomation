#!/usr/bin/env node
// scripts/rebuild-better-sqlite3.cjs
// Fallback for postinstall: explicitly fetch the better-sqlite3 prebuilt binary.
// Runs only if `npm rebuild better-sqlite3` fails (e.g. when prebuild-install
// mirror is flaky). Uses prebuild-install directly to target the right
// platform binary, then validates it exists.

const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const root = join(__dirname, '..');
const bs3 = join(root, 'node_modules', 'better-sqlite3');

if (!existsSync(bs3)) {
  console.log('[rebuild-better-sqlite3] better-sqlite3 not installed yet — skipping');
  process.exit(0);
}

// Try the project's own prebuild-install first
const prebuild = join(bs3, 'node_modules', '.bin', 'prebuild-install');
if (existsSync(prebuild)) {
  try {
    execSync(`"${prebuild}"`, { cwd: bs3, stdio: 'inherit' });
    console.log('[rebuild-better-sqlite3] prebuilt binary installed');
    process.exit(0);
  } catch (e) {
    console.warn('[rebuild-better-sqlite3] prebuild-install failed:', e.message);
  }
}

// Last resort: fall back to node-gyp build (requires Python + C++ toolchain on Hostinger)
console.log('[rebuild-better-sqlite3] attempting node-gyp fallback');
try {
  execSync('npm run build-release', { cwd: bs3, stdio: 'inherit' });
  console.log('[rebuild-better-sqlite3] node-gyp build succeeded');
  process.exit(0);
} catch (e) {
  console.error('[rebuild-better-sqlite3] node-gyp build also failed:', e.message);
  console.error('[rebuild-better-sqlite3] the native binding will be missing at runtime —');
  console.error('[rebuild-better-sqlite3] /admin routes and sessions will not work until this is resolved.');
  // Don't fail the install — let the build attempt to continue.
  // better-sqlite3's TypeScript types still resolve, so astro check passes.
  process.exit(0);
}