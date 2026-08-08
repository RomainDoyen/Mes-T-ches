import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'wxt';

const EXTENSION_DESCRIPTION =
  'Organisez vos tâches en local : priorités, tags, catégories, sous-tâches et multi-profils. Données stockées sur votre appareil (SQLite), sans compte ni cloud.';

function findChromeBinary(): string | undefined {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/opt/google/chrome/chrome',
  ];

  const found = candidates.find((path) => existsSync(path));
  if (found) return found;

  const playwrightRoot = join(homedir(), '.cache/ms-playwright');
  if (!existsSync(playwrightRoot)) return undefined;

  const versions = readdirSync(playwrightRoot)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));

  for (const version of versions) {
    const binary = join(playwrightRoot, version, 'chrome-linux64', 'chrome');
    if (existsSync(binary)) return binary;
  }

  return undefined;
}

const chromeBinary = findChromeBinary();

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Mes Tâches',
    description: EXTENSION_DESCRIPTION,
    permissions: ['storage'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Mes Tâches',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
      },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  webExt: {
    binaries: chromeBinary
      ? {
          chrome: chromeBinary,
          chromium: chromeBinary,
        }
      : undefined,
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  vite: () => ({
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
  }),
});
