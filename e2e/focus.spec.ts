import { test, expect } from '@playwright/test';

const E2E_API = 'http://localhost:3001';

async function cleanupFocusItems(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'access_token')?.value;
  if (!token) return;

  // Delete all today's focus items (use local date matching the browser's localDateISO)
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
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

async function cleanupHabits(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'access_token')?.value;
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

test.beforeEach(async ({ page }) => {
  // Navigate to /boards first (no focus item fetching) so cookies populate the context
  await page.goto('/boards');
  await cleanupHabits(page);
  await cleanupFocusItems(page);
});

test.describe('Focus Items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard shows focus input', async ({ page }) => {
    await expect(page.locator('#focus-input')).toBeVisible({ timeout: 10_000 });
  });

  test('creates a focus item by typing and pressing Enter', async ({ page }) => {
    await page.locator('#focus-input').fill('Write e2e tests');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Write e2e tests').first()).toBeVisible({ timeout: 10_000 });
  });

  test('marks a focus item as complete', async ({ page }) => {
    await page.locator('#focus-input').fill('Complete me');
    await page.keyboard.press('Enter');
    await page.getByText('Complete me').first().waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByRole('button', { name: 'Mark complete' }).first().click();
    // After marking complete, the item disappears from the active list
    await expect(page.getByText('All done for today!')).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a focus item', async ({ page }) => {
    await page.locator('#focus-input').fill('Delete me');
    await page.keyboard.press('Enter');
    await page.getByText('Delete me').first().waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByRole('button', { name: 'Delete item' }).first().click();
    await expect(page.getByText('Delete me')).not.toBeVisible({ timeout: 5_000 });
  });

  test('persists focus items after page reload', async ({ page }) => {
    await page.locator('#focus-input').fill('Persist me');
    await page.keyboard.press('Enter');
    await page.getByText('Persist me').first().waitFor({ state: 'visible', timeout: 10_000 });

    await page.reload();
    await expect(page.getByText('Persist me').first()).toBeVisible({ timeout: 10_000 });
  });
});
