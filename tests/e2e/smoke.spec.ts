import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.status).toBe('ok');
});

test('unauthenticated API request returns 401', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/t/tenant-1/guests');
  expect(res.status()).toBe(401);
});

test('login page loads', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await expect(page.locator('body')).toBeVisible();
});
