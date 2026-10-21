import { expectRedirectedAway } from '../../support/route-guard';
import { InstanceOverviewPage } from '../../support/pages/training-instance/instance-overview.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

test.describe('linear-instance.access-token', () => {
    test('shows the instance title, the instruction and the full access token', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'tokenshow' });
        await page.goto(`/linear-instance/${instance.id}/access-token`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Access Token of ${instance.title}`);
        await expect(page.getByText('Fill in following access token to start the game:')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: instance.accessToken })).toBeVisible();
        await checkpoint(page, 'access token shown');
    });

    test('shows the instance title exactly as stored', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'tokentitle' });
        await page.goto(`/linear-instance/${instance.id}/access-token`);
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { level: 1, name: instance.accessToken })).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: instance.title, exact: true })).toBeVisible();
    });

    test('shows the token with its original letter case', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'tokencase', accessTokenPrefix: 'e2e-Mixed-CASE' });
        await page.goto(`/linear-instance/${instance.id}/access-token`);
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { level: 1, name: instance.accessToken, exact: true })).toBeVisible();
    });

    test('is reached from the display token action of the overview', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'tokennav' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        await overview.table.clickRowAction(row, { icon: 'pin', label: 'Display Token' });
        await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/access-token$`));
        await expect(page.getByRole('heading', { level: 1, name: instance.accessToken })).toBeVisible();
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/:id/access-token`, async ({ openAs, createInstance }) => {
                const instance = await createInstance({ purpose: `tokenaccess-${role}` });
                await expectRedirectedAway(openAs, role, `/linear-instance/${instance.id}/access-token`);
            });
        }
    });
});
