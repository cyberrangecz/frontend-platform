import { InstanceOverviewPage } from '../../support/pages/training-instance/instance-overview.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

test.describe('linear-instance.access-token', () => {
    test('checks the access token page of an instance with a mixed-case token', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        test.setTimeout(180_000);
        const instance = await createInstance({ purpose: 'tokencheck', accessTokenPrefix: 'e2e-Mixed-CASE' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const tokenHeading = page.getByRole('heading', { level: 1, name: instance.accessToken });

        await test.step('is reached from the display token action of the overview', async () => {
            await overview.table.clickRowAction(row, { icon: 'pin', label: 'Display Token' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/access-token$`));
            await waitForPageReady(page);
            await expect.soft(tokenHeading, 'access token heading').toBeVisible();
        });

        await test.step('shows the instance title, the instruction and the full access token', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`Access Token of ${instance.title}`);
            await expect
                .soft(page.getByText('Fill in following access token to start the game:'), 'instruction')
                .toBeVisible();
            await expect.soft(tokenHeading, 'access token heading').toBeVisible();
            await checkpoint(page, 'access token shown');
        });

        await test.step('shows the instance title exactly as stored', async () => {
            await expect
                .soft(page.getByRole('heading', { level: 1, name: instance.title, exact: true }), 'title heading')
                .toBeVisible();
        });

        await test.step('shows the token with its original letter case', async () => {
            await expect
                .soft(
                    page.getByRole('heading', { level: 1, name: instance.accessToken, exact: true }),
                    'access token heading in its original case',
                )
                .toBeVisible();
        });
    });
});
