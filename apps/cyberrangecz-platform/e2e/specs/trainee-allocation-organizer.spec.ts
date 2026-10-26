import { expect, Page, test } from '@playwright/test';
import { signIn } from '../support/platform-session';

/**
 * Organizer-side checks of single sandbox per trainee against a deployed platform.
 *
 * Required environment:
 *   F07_PLATFORM_ORIGIN       origin of the deployed frontend
 *   F07_ORGANIZER_USERNAME    account holding the training organizer role
 *   F07_ORGANIZER_PASSWORD    password of that account
 * Optional environment (the titles default to the names the F07 setup gives its instances):
 *   F07_SELF_TITLE           title of an instance that is not managed and whose pool has no free sandbox
 *   F07_MANAGED_TITLE         title of a managed instance whose pool has no free sandbox
 *   F07_STARTED_TITLE         title of an instance that has already started
 *   F07_FUTURE_TITLE          title of an instance that has not started yet
 *
 * The deployment must have the frontend key `enableTraineeSandboxAllocation` on and
 * `enableLocalMode` off, and training's `single.sandbox.per.user.enabled` on.
 */
const ORIGIN = process.env['F07_PLATFORM_ORIGIN'];
const USERNAME = process.env['F07_ORGANIZER_USERNAME'];
const PASSWORD = process.env['F07_ORGANIZER_PASSWORD'];
const SELF_TITLE = process.env['F07_SELF_TITLE'] ?? 'F07-self';
const MANAGED_TITLE = process.env['F07_MANAGED_TITLE'] ?? 'F07-managed';
const STARTED_TITLE = process.env['F07_STARTED_TITLE'] ?? SELF_TITLE;
const FUTURE_TITLE = process.env['F07_FUTURE_TITLE'] ?? 'F07-future';

const NO_FREE_SANDBOX_TOOLTIP = 'Cannot copy access token because there is no free sandbox.';

test.skip(
    ORIGIN === undefined || USERNAME === undefined || PASSWORD === undefined,
    'F07_PLATFORM_ORIGIN, F07_ORGANIZER_USERNAME and F07_ORGANIZER_PASSWORD are required'
);

const ACCOUNT = { origin: ORIGIN ?? '', username: USERNAME ?? '', password: PASSWORD ?? '' };

test.use({ baseURL: ORIGIN });

/** Opens the instance list and returns the row of the instance with the given title. */
async function openInstanceRow(page: Page, title: string) {
    await page.goto('/linear-instance');
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toBeVisible();
    return row;
}

test.describe('Trainee sandbox allocation — organizer side', () => {
    test.beforeEach(async ({ page }) => {
        await signIn(page, ACCOUNT);
    });

    test('runtime config switches the feature on', async ({ page }) => {
        const configuration = await page.evaluate(async () => {
            const response = await fetch('/assets/config.json');
            return response.json() as Promise<{ enableTraineeSandboxAllocation?: boolean }>;
        });
        expect(configuration.enableTraineeSandboxAllocation).toBe(true);
    });

    test('create form shows the Managed toggle, off by default', async ({ page }) => {
        await page.goto('/linear-instance/create');
        const managed = page.getByRole('switch', { name: 'Managed' });
        await expect(managed).toBeVisible();
        await expect(managed).not.toBeChecked();
    });

    test('create form hides the Managed toggle for a local instance', async ({ page }) => {
        await page.goto('/linear-instance/create');
        const local = page.getByRole('switch', { name: 'Local' });
        test.skip(!(await local.isVisible()), 'the deployment has local mode off, so no Local toggle exists');

        await local.click();
        await expect(page.getByRole('switch', { name: 'Managed' })).toBeHidden();
        await local.click();
        await expect(page.getByRole('switch', { name: 'Managed' })).toBeVisible();
    });

    test('edit page of a started instance keeps the Managed toggle disabled', async ({ page }) => {
        const row = await openInstanceRow(page, STARTED_TITLE);
        await row.getByRole('button', { name: 'create' }).click();

        await expect(page.getByRole('switch', { name: 'Managed' })).toBeDisabled();
    });

    test('edit page of an instance that has not started keeps the Managed toggle disabled', async ({ page }) => {
        const row = await openInstanceRow(page, FUTURE_TITLE);
        await row.getByRole('button', { name: 'create' }).click();

        await expect(page.getByRole('switch', { name: 'Managed' })).toBeDisabled();
    });

    test('access token of a not managed instance is copyable without a free sandbox', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        const row = await openInstanceRow(page, SELF_TITLE);
        await expect(row).toContainText('0 (0 free)');

        const tokenButton = row.locator('.access-token-container button');
        await expect(tokenButton).toBeEnabled();
        await tokenButton.click();

        await expect(page.getByText('Access token has been copied')).toBeVisible();
        const copied = await page.evaluate(() => navigator.clipboard.readText());
        expect(copied).toBe((await tokenButton.innerText()).trim());
    });

    test('access token of a managed instance stays blocked without a free sandbox', async ({ page }) => {
        const row = await openInstanceRow(page, MANAGED_TITLE);
        await expect(row).toContainText('(0 free)');

        await expect(row.locator('.access-token-container button')).toBeDisabled();
        await row.locator('.access-token-container').hover();
        await expect(page.getByRole('tooltip')).toHaveText(NO_FREE_SANDBOX_TOOLTIP);
    });

    test('the managed toggle of the create form can be switched on', async ({ page }) => {
        await page.goto('/linear-instance/create');
        const managed = page.getByRole('switch', { name: 'Managed' });

        await managed.click();

        await expect(managed).toBeChecked();
    });

    test('the training API reports the managed flag of the not managed and the managed instance', async ({ page }) => {
        const flags = await page.evaluate(async () => {
            const response = await fetch('/training/api/v1/training-instances?size=100', {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            });
            const body = (await response.json()) as { content: { title: string; managed?: boolean }[] };
            return Object.fromEntries(body.content.map((instance) => [instance.title, instance.managed]));
        });

        expect(flags[SELF_TITLE]).toBe(false);
        expect(flags[MANAGED_TITLE]).toBe(true);
    });

    test('a not managed instance shows no no-free-sandbox tooltip on its access token', async ({ page }) => {
        const row = await openInstanceRow(page, SELF_TITLE);

        await row.locator('.access-token-container').hover();

        await expect(page.getByRole('tooltip').filter({ hasText: NO_FREE_SANDBOX_TOOLTIP })).toHaveCount(0);
    });
});
