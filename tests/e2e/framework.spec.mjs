import YAML from 'yaml';
import path from 'node:path';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '../session-fixture.mjs';

const root = process.cwd();
const policy = YAML.parse(fs.readFileSync(path.join(root, 'architecture/locales.yaml'), 'utf8'));
function messages(testInfo) {
  const locale = testInfo.project.metadata.locale;
  return { locale, web: JSON.parse(fs.readFileSync(path.join(process.env.WEB_PATH || path.join(root, 'workspace/web'), `src/locales/${locale}.json`), 'utf8')), admin: JSON.parse(fs.readFileSync(path.join(process.env.ADMIN_PATH || path.join(root, 'workspace/admin'), `apps/web-antd/src/locales/langs/${locale}/page.json`), 'utf8')) };
}
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/\[intlify\].*(Not found|Fall back)/i.test(message.text())) errors.push(message.text()); });
  return errors;
}
async function layout(page, locale) {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', policy.languages[locale].direction);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Web loads translated framework capabilities within the viewport', async ({ page }, testInfo) => {
  const { locale, web } = messages(testInfo);
  const errors = collectErrors(page);
  await page.goto(`http://127.0.0.1:18781/?lang=${locale}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(web.home.title);
  await expect(page.getByRole('status')).toContainText(web.connection.ready);
  await layout(page, locale);
  expect(errors).toEqual([]);
  if (process.env.FRAMEWORK_SCREENSHOTS) {
    await mkdir(process.env.FRAMEWORK_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.FRAMEWORK_SCREENSHOTS, `web-${testInfo.project.name}.png`), fullPage: true });
  }
});

test('Web recovers from a network failure through a translated retry action', async ({ page }, testInfo) => {
  const { locale, web } = messages(testInfo);
  await page.route('**/api/v1/system/capabilities', route => route.abort());
  await page.goto(`http://127.0.0.1:18781/?lang=${locale}`);
  await expect(page.getByRole('status')).toContainText(web.connection.errors.network);
  await page.unroute('**/api/v1/system/capabilities');
  await page.getByRole('button', { name: web.connection.retry }).click();
  await expect(page.getByRole('status')).toContainText(web.connection.ready);
});

test('Web deep links and language selection retain the chosen language', async ({ page }, testInfo) => {
  const { locale, web } = messages(testInfo);
  await page.goto(`http://127.0.0.1:18781/unimplemented-module?lang=${locale}`);
  await expect(page.getByRole('heading', { name: web.notFound.title })).toBeVisible();
  await page.getByRole('link', { name: web.notFound.home, exact: true }).click();
  await expect(page.getByRole('status')).toContainText(web.connection.ready);
  await page.getByRole('combobox').selectOption('zh-CN');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByRole('combobox').selectOption(locale);
  await layout(page, locale);
});

test('stuhelper-admin loads translated controls and keeps identity checks active', async ({ page, request }, testInfo) => {
  const { locale, admin } = messages(testInfo);
  const errors = collectErrors(page);
  await page.goto(`http://127.0.0.1:18782/?lang=${locale}`);
  await expect(page.locator('#__app-loading__')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(admin.framework.errors.identity);
  await page.getByRole('button', { name: admin.framework.retry }).click();
  await expect(page.getByRole('status')).toContainText(admin.framework.errors.identity);
  const response = await request.get('http://127.0.0.1:18780/api/v1/admin/modules', { headers: { Cookie: 'stuhelper_session=synthetic-test' } });
  expect(response.status()).toBe(503);
  expect((await response.json()).code).toBe('identity_unavailable');
  await layout(page, locale);
  const common = JSON.parse(fs.readFileSync(path.join(process.env.ADMIN_PATH || path.join(root, 'workspace/admin'), `packages/locales/src/langs/${locale}/preferences.json`), 'utf8'));
  await page.getByRole('button', { name: common.language, exact: true }).click();
  await page.getByRole('menuitem', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.reload();
  // An explicit URL locale remains the navigation preference after reload.
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('#__app-loading__')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(admin.framework.errors.identity);
  await layout(page, locale);
  expect(errors).toEqual([]);
  if (process.env.FRAMEWORK_SCREENSHOTS) {
    await mkdir(process.env.FRAMEWORK_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.FRAMEWORK_SCREENSHOTS, `admin-${testInfo.project.name}.png`), fullPage: true });
  }
});

test('Chinese is the default language without a saved preference', async ({ page }) => {
  await page.goto('http://127.0.0.1:18781/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.goto('http://127.0.0.1:18782/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
