import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('Web reads real platform capabilities and fits the viewport', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:18781');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('校园服务');
  await expect(page.getByRole('status')).toContainText('服务已连接');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  if (process.env.FRAMEWORK_SCREENSHOTS) {
    await mkdir(process.env.FRAMEWORK_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.FRAMEWORK_SCREENSHOTS, `web-${testInfo.project.name}.png`), fullPage: true });
  }
});

test('Web recovers from a network failure through the retry action', async ({ page }) => {
  await page.route('**/api/v1/system/capabilities', route => route.abort());
  await page.goto('http://127.0.0.1:18781');
  await expect(page.getByRole('status')).toContainText('暂时无法连接服务');
  await page.unroute('**/api/v1/system/capabilities');
  await page.getByRole('button', { name: '重新连接' }).click();
  await expect(page.getByRole('status')).toContainText('服务已连接');
});

test('Unknown Web deep links have an explicit unavailable page', async ({ page }) => {
  await page.goto('http://127.0.0.1:18781/unimplemented-module');
  await expect(page.getByRole('heading', { name: '这个页面暂不可用' })).toBeVisible();
  await page.getByRole('link', { name: '返回首页' }).click();
  await expect(page.getByRole('status')).toContainText('服务已连接');
});

test('Vben Admin loads without manufacturing a logged-in administrator', async ({ page, request }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:18782');
  await expect(page.locator('#__app-loading__')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('管理员身份服务尚未接入');
  await page.getByRole('button', { name: '重新连接' }).click();
  await expect(page.getByRole('status')).toContainText('管理员身份服务尚未接入');
  const response = await request.get('http://127.0.0.1:18780/api/v1/admin/modules', { headers: { Cookie: 'stuhelper_session=synthetic-test' } });
  expect(response.status()).toBe(503);
  expect((await response.json()).code).toBe('identity_unavailable');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  if (process.env.FRAMEWORK_SCREENSHOTS) {
    await mkdir(process.env.FRAMEWORK_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.FRAMEWORK_SCREENSHOTS, `admin-${testInfo.project.name}.png`), fullPage: true });
  }
});
