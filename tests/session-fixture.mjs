import { test as base, expect } from '@playwright/test';

// These suites isolate business-page behavior with HTTP fixtures. The formal
// backend suite exercises actual login, current sessions and revocation.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/v1/auth/session', route => route.fulfill({
      status: 401, json: { code: 'unauthenticated' },
    }));
    await use(page);
  },
});
export { expect };

export const administrator = { authenticated:true, content_school_id:'school', profile:{id:'00000000-0000-4000-8000-000000000001',nickname:'Fixture admin',nickname_required:false,bio:'',visibility:{school:true,badge:true,department:true,grade:false,reviews:true,resources:true},group_card_consent:{school:false,grade:false,department:false,name:false,student_id:false,gender:false,nickname:false},revision:1},csrf_token:'a'.repeat(43),phone_bound:true,administrator:true,expires_at:'2030-01-01T00:00:00Z'};

// Business-page fixtures opt into enabled modules; framework tests use the real server.
export async function mockCapabilities(page) {
    await page.route('**/api/v1/system/capabilities', route => route.fulfill({ json: { api_version: 1, capabilities: ['favorites.manage', 'groups.read', 'groups.manage', 'groups.configure', 'billing.manage', 'billing.membership', 'billing.wallet', 'billing.resource-unlock', 'notifications.inbox', 'open-platform.data', 'open-platform.manage', 'qq-binding.manage', 'search.query', 'information-query.query'] } }));
}
