import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Emits `version.json` next to index.html so there is one permanent URL that
 * answers "which commit is live?".
 *
 * Asset filenames deliberately carry a content hash and change on every build —
 * that is what lets browsers cache them forever and still pick up new code — so
 * they are useless as a fixed thing to check. This file has a stable address
 * instead, and `vercel.json` marks it no-store so the answer is never cached.
 *
 * On Vercel the values come from the build environment; locally we ask git, so
 * `npm run build` produces something meaningful too.
 */
function versionFile(): Plugin {
  return {
    name: 'map4sale-version-file',
    apply: 'build',
    generateBundle() {
      const git = (args: string) => {
        try {
          return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        } catch {
          return '';
        }
      };

      const commit = process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse HEAD') || 'unknown';
      const ref = process.env.VERCEL_GIT_COMMIT_REF || git('rev-parse --abbrev-ref HEAD') || 'unknown';

      this.emitFile({
        type: 'asset',
        fileName: 'version.json', // never hashed — that is the whole point
        source: `${JSON.stringify(
          {
            commit,
            shortCommit: commit.slice(0, 7),
            ref,
            env: process.env.VERCEL_ENV || 'local',
            builtAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
});
