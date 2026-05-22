import { test, expect } from '@playwright/test';

const E2E_API = 'http://localhost:3001';

async function getToken(page: import('@playwright/test').Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === 'access_token')?.value ?? '';
}

async function cleanupHabits(page: import('@playwright/test').Page) {
  const token = await getToken(page);
  if (!token) return;
  const res = await fetch(`${E2E_API}/habits`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = (await res.json()) as { habits?: Array<{ id: string }> };
  const habits = data.habits ?? [];
  await Promise.all(
    habits.map((h) =>
      fetch(`${E2E_API}/habits/${h.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
}

async function cleanupFocusItems(page: import('@playwright/test').Page) {
  const token = await getToken(page);
  if (!token) return;
  const today = new Date().toLocaleDateString('en-CA');
  const res = await fetch(`${E2E_API}/focus?date=${today}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = (await res.json()) as { items?: Array<{ id: string }> };
  const items = data.items ?? [];
  await Promise.all(
    items.map((item) =>
      fetch(`${E2E_API}/focus/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
}

test.beforeEach(async ({ page }) => {
  // Navigate to /boards (no focus fetching) so cookies populate the context
  await page.goto('/boards');
  await cleanupHabits(page);
  await cleanupFocusItems(page);
});

test.describe('Habits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('habits modal opens from dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /manage habits/i }).click();
    await expect(page.getByText('Manage Habits')).toBeVisible({ timeout: 5_000 });
  });

  test('creates a daily habit via the habits modal', async ({ page }) => {
    await page.getByRole('button', { name: /manage habits/i }).click();

    const habitNameInput = page.getByPlaceholder('Habit name...');
    await habitNameInput.waitFor({ state: 'visible', timeout: 5_000 });
    await habitNameInput.fill('Morning run');

    await page.getByRole('button', { name: 'Add habit' }).click();

    await expect(page.getByText('Morning run').first()).toBeVisible({ timeout: 10_000 });
  });

  test('daily habit auto-generates a focus item on dashboard', async ({ page }) => {
    const token = await getToken(page);
    await fetch(`${E2E_API}/habits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Daily meditation', frequency: 'DAILY' }),
    });

    await page.reload();
    // Focus items are fetched on load — habit auto-generation triggers
    await expect(page.getByText('Daily meditation').first()).toBeVisible({ timeout: 15_000 });
  });

  test('habit appears in Today page habit section', async ({ page }) => {
    const token = await getToken(page);
    await fetch(`${E2E_API}/habits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Journaling', frequency: 'DAILY' }),
    });

    await page.goto('/today');
    await expect(page.getByText('Journaling').first()).toBeVisible({ timeout: 15_000 });
  });

  test('completing a habit focus item marks it done', async ({ page }) => {
    const token = await getToken(page);
    await fetch(`${E2E_API}/habits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Read 10 pages', frequency: 'DAILY' }),
    });

    await page.reload();
    // Wait for habit item to appear
    await page.getByText('Read 10 pages').first().waitFor({ state: 'visible', timeout: 15_000 });
    // Mark complete
    await page.getByRole('button', { name: 'Mark complete' }).first().click();

    // After completion, the item leaves the active list
    await expect(page.getByText('Read 10 pages')).not.toBeVisible({ timeout: 10_000 });
  });
});
