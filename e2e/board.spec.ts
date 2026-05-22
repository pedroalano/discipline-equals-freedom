import { test, expect } from '@playwright/test';

const E2E_API = 'http://localhost:3001';

async function cleanupBoards(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
  if (!accessToken) return;

  const res = await fetch(`${E2E_API}/boards`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return;
  const boards = (await res.json()) as Array<{ id: string }>;
  for (const board of boards) {
    await fetch(`${E2E_API}/boards/${board.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

test.beforeEach(async ({ page }) => {
  // Navigate first so cookies are populated in the context
  await page.goto('/boards');
  await cleanupBoards(page);
  await page.reload();
});

test.describe('Boards', () => {
  test('boards page renders empty state', async ({ page }) => {
    await page.goto('/boards');
    await expect(page.getByText(/create your first board/i)).toBeVisible({ timeout: 10_000 });
  });

  test('creates a board via the New Board dialog', async ({ page }) => {
    await page.goto('/boards');
    await page.getByRole('button', { name: /\+ new board/i }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    await page.getByPlaceholder('Board title...').fill('My E2E Board');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('My E2E Board')).toBeVisible({ timeout: 10_000 });
  });

  test('navigates into a board', async ({ page }) => {
    // Create board via API for speed
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'access_token')?.value ?? '';
    const res = await fetch(`${E2E_API}/boards`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Navigation Board' }),
    });
    const board = (await res.json()) as { id: string };

    await page.goto('/boards');
    // BoardsClient renders an <a> (Link) when no onBoardClick handler is provided
    await page.getByText('Navigation Board').first().click();
    await expect(page).toHaveURL(new RegExp(`/boards/${board.id}`), { timeout: 10_000 });
  });

  test('adds a list to a board', async ({ page }) => {
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'access_token')?.value ?? '';
    const res = await fetch(`${E2E_API}/boards`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'List Board' }),
    });
    const board = (await res.json()) as { id: string };

    await page.goto(`/boards/${board.id}`);

    // Click "+ Add list" ghost button to show the input
    const addListBtn = page.getByRole('button', { name: /\+ add list/i });
    await addListBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addListBtn.click();

    await page.getByPlaceholder('List title...').fill('To Do');
    // Click the "Add list" submit button
    await page.getByRole('button', { name: 'Add list' }).click();

    await expect(page.getByText('To Do')).toBeVisible({ timeout: 10_000 });
  });

  test('adds a card to a list', async ({ page }) => {
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'access_token')?.value ?? '';

    const boardRes = await fetch(`${E2E_API}/boards`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Card Board' }),
    });
    const board = (await boardRes.json()) as { id: string };

    const listRes = await fetch(`${E2E_API}/lists`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: board.id, title: 'Backlog' }),
    });
    const list = (await listRes.json()) as { id: string };
    expect(list.id).toBeDefined();

    await page.goto(`/boards/${board.id}`);
    await expect(page.getByText('Backlog')).toBeVisible({ timeout: 10_000 });

    // Click the "+ Add card" button inside the list
    await page.getByRole('button', { name: '+ Add card' }).first().click();

    // Card editor dialog appears with title input
    await page.locator('#card-title').fill('My first card');
    await page.getByRole('button', { name: /create|add|save/i }).last().click();

    await expect(page.getByText('My first card')).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a board', async ({ page }) => {
    await page.goto('/boards');
    await page.getByRole('button', { name: /\+ new board/i }).click();
    await page.getByPlaceholder('Board title...').fill('Delete Me Board');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByText('Delete Me Board').waitFor({ state: 'visible', timeout: 10_000 });

    // Boards are deleted via API (no UI delete button discovered); verify via API call
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'access_token')?.value ?? '';
    const res = await fetch(`${E2E_API}/boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const boards = (await res.json()) as Array<{ id: string; title: string }>;
    const target = boards.find((b) => b.title === 'Delete Me Board');
    expect(target).toBeDefined();

    await fetch(`${E2E_API}/boards/${target!.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    await page.reload();
    await expect(page.getByText('Delete Me Board')).not.toBeVisible({ timeout: 5_000 });
  });
});
