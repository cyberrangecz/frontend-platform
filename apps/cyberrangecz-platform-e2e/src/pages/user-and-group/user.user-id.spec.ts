import { expect, test } from '../../support/fixtures';
import {
    ADMINISTRATION_LINKS,
    ROLES_WITHOUT_ADMINISTRATION,
} from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { readUser } from '../../support/pages/user-and-group/group-data';
import { UserDetailPage } from '../../support/pages/user-and-group/user-pages';
import {
    breadcrumbEntries,
    pageTitle,
    waitForPageReady,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('user.user-id', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /user/:id`, async ({
                openAs,
                shared,
            }) => {
                await expectRedirectedAway(
                    openAs,
                    role,
                    `/user/${shared.userIds.userAdministrator}`,
                    { absentLinks: ADMINISTRATION_LINKS },
                );
            });
        }

        test('sends a signed-out visitor to the login page', async ({
            openAs,
            shared,
        }) => {
            const page = await openAs('anonymous');
            await page.goto(`/user/${shared.userIds.userAdministrator}`);
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test.describe('summary', () => {
        test('shows the title, the breadcrumb and the summary of the administrator', async ({
            page,
            apiAs,
            shared,
            checkpoint,
        }) => {
            const userId = shared.userIds.userAdministrator;
            const record = await readUser(
                apiAs('userAdministrator').userAndGroup,
                userId,
            );
            const detail = new UserDetailPage(page);
            await detail.open(userId);
            await expect(pageTitle(page)).toHaveText(
                `${record.given_name} ${record.family_name} Detail`,
            );
            await expect(breadcrumbEntries(page)).toHaveText([
                'Home',
                'Users',
                `${record.given_name} ${record.family_name}`,
            ]);
            await expect(detail.summaryCard.locator('.user-name')).toHaveText(
                `${record.given_name} ${record.family_name}`,
            );
            await expect(
                detail.summaryCard.locator('.user-description'),
            ).toHaveText(record.mail ?? 'No e-mail');
            await checkpoint(page, 'user detail');
        });

        test('shows the summary of a trainee', async ({
            page,
            apiAs,
            shared,
        }) => {
            const userId = shared.userIds.traineeChromium;
            const record = await readUser(
                apiAs('userAdministrator').userAndGroup,
                userId,
            );
            const detail = new UserDetailPage(page);
            await detail.open(userId);
            await expect(pageTitle(page)).toHaveText(
                `${record.given_name} ${record.family_name} Detail`,
            );
            await expect(
                detail.summaryCard.locator('.user-description'),
            ).toHaveText(record.mail ?? 'No e-mail');
        });

        test('counts the roles the service lists for the user', async ({
            page,
            apiAs,
            shared,
        }) => {
            const userId = shared.userIds.userAdministrator;
            const record = await readUser(
                apiAs('userAdministrator').userAndGroup,
                userId,
            );
            const detail = new UserDetailPage(page);
            await detail.open(userId);
            await expect(
                detail.summaryCard.locator('.icon-container .icon-text'),
            ).toHaveText(String(record.roles?.length ?? 0));
            await expect(detail.rolePanelHeaders).toHaveCount(
                record.roles?.length ?? 0,
            );
        });
    });

    test.describe('roles', () => {
        test('lists every role with its type and microservice', async ({
            page,
            apiAs,
            shared,
        }) => {
            const userId = shared.userIds.userAdministrator;
            const record = await readUser(
                apiAs('userAdministrator').userAndGroup,
                userId,
            );
            const detail = new UserDetailPage(page);
            await detail.open(userId);
            for (const role of record.roles ?? []) {
                await expect(
                    detail.rolePanelHeaders
                        .filter({ hasText: role.role_type })
                        .filter({
                            hasText: role.name_of_microservice,
                        }),
                ).not.toHaveCount(0);
            }
        });

        test('opens every role with Expand All and closes them with Collapse All', async ({
            page,
            shared,
            checkpoint,
        }) => {
            const detail = new UserDetailPage(page);
            await detail.open(shared.userIds.userAdministrator);
            await detail.expandAllButton.click();
            const count = await detail.rolePanelHeaders.count();
            for (let index = 0; index < count; index++) {
                await expect(
                    detail.rolePanelHeaders.nth(index),
                ).toHaveAttribute('aria-expanded', 'true');
            }
            await checkpoint(page, 'all roles expanded');
            await detail.collapseAllButton.click();
            for (let index = 0; index < count; index++) {
                await expect(
                    detail.rolePanelHeaders.nth(index),
                ).toHaveAttribute('aria-expanded', 'false');
            }
        });

        test('opens and closes one role by clicking its header', async ({
            page,
            shared,
        }) => {
            const detail = new UserDetailPage(page);
            await detail.open(shared.userIds.userAdministrator);
            const header = detail.rolePanelHeaders.first();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
        });

        test('shows the description of an opened role or states that it has none', async ({
            page,
            shared,
        }) => {
            const detail = new UserDetailPage(page);
            await detail.open(shared.userIds.userAdministrator);
            await detail.expandAllButton.click();
            const descriptions = page.locator('.roles-item-description');
            await expect(descriptions).toHaveCount(
                await detail.rolePanelHeaders.count(),
            );
            for (const description of await descriptions.all()) {
                await expect(description).toHaveText(/\S/);
            }
        });
    });

    test.describe('unknown user', () => {
        test('shows no raw exception text for a user id that is not a number', async ({
            page,
        }) => {
            await page.goto('/user/not-a-number');
            await waitForPageReady(page);
            await expect(page.locator('body')).not.toContainText(
                /exception|NaN|undefined|\[object/i,
            );
        });
    });
});
