import { test, expect } from '@playwright/test';

// Tests that require NO authentication — override the global storageState
test.describe('Auth (unauthenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('login page renders magic-link form', async ({ page }) => {
    await page.goto('/login');
    // CardTitle renders as a div, not an h-element
    await expect(page.getByText('Sign in')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send sign-in link/i })).toBeVisible();
  });

  test('submitting login form shows confirmation message', async ({ page }) => {
    // Intercept the API call to avoid hitting the NestJS rate-limiter (3 req/min per IP)
    await page.route('/api/auth/magic-link/request', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'If this email exists, you will receive a link.' }),
      }),
    );

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('anyone@example.com');
    await page.getByRole('button', { name: /send sign-in link/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 10_000 });
  });
});

// Tests that require authentication — use global storageState (set in playwright.config.ts)
test.describe('Auth (authenticated)', () => {
  test('authenticated user lands on dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('logout clears auth cookies and redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
