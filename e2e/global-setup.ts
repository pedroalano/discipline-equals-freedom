import { chromium, type FullConfig } from '@playwright/test';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:3000';
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const E2E_EMAIL = 'e2e@zenfocus.test';
const STORAGE_PATH = path.join(__dirname, '.auth', 'user.json');

export default async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(path.join(__dirname, '.auth'), { recursive: true });

  const redis = new Redis(REDIS_URL, { lazyConnect: true });
  await redis.connect();

  // Ensure the test user exists in the database via the API
  await fetch(`${API_URL}/auth/magic-link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_EMAIL }),
  });

  // Scan Redis for the magicLink token just created to retrieve the userId
  let userId: string | null = null;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'magicLink:*', 'COUNT', 100);
    cursor = nextCursor;
    for (const key of keys) {
      const val = await redis.get(key);
      if (val) {
        userId = val;
        // Remove this token so it isn't re-used
        await redis.del(key);
        break;
      }
    }
    if (userId) break;
  } while (cursor !== '0');

  if (!userId) {
    throw new Error(`[global-setup] Could not find magic link token in Redis for ${E2E_EMAIL}`);
  }

  // Plant a known token that the browser will consume
  const rawToken = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(rawToken).digest('hex');
  await redis.set(`magicLink:${hash}`, userId, 'EX', 300);

  // Mark the user as email-verified so the app doesn't block them
  await redis.quit();

  // Navigate Playwright browser through the magic-link flow to capture cookies
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: WEB_URL });
  const page = await context.newPage();

  await page.goto(`${WEB_URL}/auth/magic?token=${rawToken}`);
  // The page POSTs to /api/auth/magic-link/verify then does window.location.assign('/')
  await page.waitForURL(`${WEB_URL}/`, { timeout: 15_000 });

  await context.storageState({ path: STORAGE_PATH });
  await browser.close();

  console.log('[global-setup] Auth state saved to', STORAGE_PATH);
}
