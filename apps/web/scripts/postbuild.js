#!/usr/bin/env node
// Post-build script for Lambda Web Adapter deployment.
// 1. Flatten pnpm virtual store so Next.js can resolve deps inside Lambda.
// 2. Write the bootstrap shell script that LWA uses to start the Next.js server.

const fs = require('fs');
const path = require('path');

const standalone = path.join(__dirname, '../.next/standalone');
const pnpmStore = path.join(standalone, 'node_modules/.pnpm');
const target = path.join(standalone, 'apps/web/node_modules');

// --- Step 1: Flatten pnpm virtual store ---
// pnpm puts all packages under node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>
// Lambda has no symlinks, so we copy each package into a flat node_modules.
for (const versionedDir of fs.readdirSync(pnpmStore).filter((e) => e !== 'node_modules')) {
  const nm = path.join(pnpmStore, versionedDir, 'node_modules');
  if (!fs.existsSync(nm)) continue;

  for (const pkg of fs.readdirSync(nm).filter((p) => !p.startsWith('.'))) {
    const src = path.join(nm, pkg);
    if (pkg.startsWith('@')) {
      // Scoped package: copy each sub-package under the scope directory
      fs.mkdirSync(path.join(target, pkg), { recursive: true });
      for (const name of fs.readdirSync(src)) {
        const dst = path.join(target, pkg, name);
        if (!fs.existsSync(dst)) {
          try { fs.cpSync(path.join(src, name), dst, { recursive: true, dereference: true }); } catch (_) {}
        }
      }
    } else {
      const dst = path.join(target, pkg);
      if (!fs.existsSync(dst)) {
        try { fs.cpSync(src, dst, { recursive: true, dereference: true }); } catch (_) {}
      }
    }
  }
}
console.log('✓ Flattened pnpm virtual store');

// --- Step 2: Write run.sh ---
// LWA's bootstrap treats the Lambda handler value as a path to an executable.
// run.sh starts the Next.js HTTP server; LWA then intercepts Lambda events
// and forwards them as HTTP requests to PORT 3000.
const runSh = path.join(standalone, 'run.sh');
fs.writeFileSync(runSh, '#!/bin/bash\nexec node apps/web/server.js\n', { mode: 0o755 });
console.log('✓ Wrote run.sh');
