import { expect, test } from '../../support/fixtures';
import { readUser } from '../../support/pages/user-and-group/group-data';
import { UserDetailPage } from '../../support/pages/user-and-group/user-pages';
import { breadcrumbEntries, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('user.user-id', () => {
    test('checks the user detail', async ({ page, apiAs, shared, checkpoint }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const administratorId = shared.userIds.userAdministrator;
        const administrator = await readUser(api, administratorId);
        const administratorName = `${administrator.given_name} ${administrator.family_name}`;
        const detail = new UserDetailPage(page);
        await detail.open(administratorId);

        await test.step('shows the title, the breadcrumb and the summary of the administrator', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`${administratorName} Detail`);
            await expect.soft(breadcrumbEntries(page), 'breadcrumb').toHaveText(['Home', 'Users', administratorName]);
            await expect.soft(detail.summaryCard.locator('.user-name'), 'user name').toHaveText(administratorName);
            await expect.soft(detail.summaryCard.locator('.user-description'), 'user description').toHaveText(
                administrator.mail ?? 'No e-mail',
            );
            await checkpoint(page, 'user detail');
        });

        await test.step('counts the roles the service lists for the user', async () => {
            await expect.soft(detail.summaryCard.locator('.icon-container .icon-text'), 'role count').toHaveText(
                String(administrator.roles?.length ?? 0),
            );
            await expect.soft(detail.rolePanelHeaders, 'role panels').toHaveCount(administrator.roles?.length ?? 0);
        });

        await test.step('lists every role with its type and microservice', async () => {
            for (const role of administrator.roles ?? []) {
                await expect
                    .soft(
                        detail.rolePanelHeaders
                            .filter({ hasText: role.role_type })
                            .filter({ hasText: role.name_of_microservice }),
                        `role ${role.role_type} of ${role.name_of_microservice}`,
                    )
                    .not.toHaveCount(0);
            }
        });

        await test.step('opens and closes one role by clicking its header', async () => {
            const header = detail.rolePanelHeaders.first();
            await expect.soft(header, 'initially').toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect.soft(header, 'after the first click').toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect.soft(header, 'after the second click').toHaveAttribute('aria-expanded', 'false');
        });

        await test.step('opens every role with Expand All and closes them with Collapse All', async () => {
            await detail.expandAllButton.click();
            const count = await detail.rolePanelHeaders.count();
            for (let index = 0; index < count; index++) {
                await expect.soft(detail.rolePanelHeaders.nth(index), `role ${index} expanded`).toHaveAttribute('aria-expanded', 'true');
            }
            await checkpoint(page, 'all roles expanded');
            await detail.collapseAllButton.click();
            for (let index = 0; index < count; index++) {
                await expect.soft(detail.rolePanelHeaders.nth(index), `role ${index} collapsed`).toHaveAttribute('aria-expanded', 'false');
            }
        });

        await test.step('shows the description of an opened role or states that it has none', async () => {
            await detail.expandAllButton.click();
            const descriptions = page.locator('.roles-item-description');
            await expect.soft(descriptions, 'descriptions').toHaveCount(await detail.rolePanelHeaders.count());
            for (const description of await descriptions.all()) {
                await expect.soft(description, 'description text').toHaveText(/\S/);
            }
        });

        await test.step('shows the summary of a trainee', async () => {
            const traineeId = shared.userIds.traineeChromium;
            const trainee = await readUser(api, traineeId);
            await detail.open(traineeId);
            await expect.soft(pageTitle(page), 'page title').toHaveText(`${trainee.given_name} ${trainee.family_name} Detail`);
            await expect.soft(detail.summaryCard.locator('.user-description'), 'user description').toHaveText(
                trainee.mail ?? 'No e-mail',
            );
        });

        await test.step('shows no raw exception text for a user id that is not a number', async () => {
            await page.goto('/user/not-a-number');
            await waitForPageReady(page);
            await expect.soft(page.locator('body'), 'page text').not.toContainText(/exception|NaN|undefined|\[object/i);
        });
    });
});
