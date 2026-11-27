import { ACCOUNTS, accountFor } from '../../support/accounts';
import { expect, test } from '../../support/fixtures';
import {
    AGENDAS,
    agendasOf,
    ALL_AGENDAS,
    ALL_ROLES,
    isDeployedOriginAgenda,
    displayNameOf,
    type NavigationGroup,
} from '../../support/pages/common/role-agendas';
import {
    breadcrumbEntries,
    breadcrumbLink,
    expectUrlWhileLoading,
    logoutMenuItem,
    navigation,
    navigationEntryByPath,
    notificationMenuButton,
    notificationMenu,
    openNotificationMenu,
    openUserMenu,
    pageTitle,
    toolbarUserName,
    userMenu,
    userMenuButton,
    waitForPageReady,
    waitWhileLoading,
} from '../../support/ui';

const NAVIGATION_GROUPS: NavigationGroup[] = ['Trainings', 'Sandboxes', 'Administration'];
const KEYCLOAK_LOGOUT_URL = '**/protocol/openid-connect/logout**';

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('page chrome', () => {
    for (const role of ALL_ROLES) {
        test.describe(`as ${role}`, () => {
            test.use({ account: role });

            test('page chrome', async ({ page, browserKey, checkpoint }) => {
                test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
                const agendas = agendasOf(role);
                const { login, subject } = ACCOUNTS[accountFor(role, browserKey)];

                await page.route(KEYCLOAK_LOGOUT_URL, (route) =>
                    route.fulfill({
                        contentType: 'text/html',
                        body: `<meta http-equiv="refresh" content="0;url=${new URL('/login', page.url()).href}">`,
                    }),
                );
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);

                await test.step('lists exactly the navigation entries of the role', async () => {
                    for (const key of ALL_AGENDAS) {
                        const entry = navigationEntryByPath(page, AGENDAS[key].path);
                        if (agendas.includes(AGENDAS[key])) {
                            await expect.soft(entry, `navigation entry ${AGENDAS[key].path} is listed once`).toHaveCount(1);
                            await expect
                                .soft(entry, `label of navigation entry ${AGENDAS[key].path}`)
                                .toHaveText(AGENDAS[key].navigationLabel);
                        } else {
                            await expect
                                .soft(entry, `navigation entry ${AGENDAS[key].path} is not listed`)
                                .toHaveCount(0);
                        }
                    }
                    await checkpoint(page, 'navigation');
                });

                await test.step('shows the navigation groups of the role and no other', async () => {
                    const groupsOfRole = new Set(agendas.map((agenda) => agenda.navigationGroup));
                    for (const group of NAVIGATION_GROUPS) {
                        await expect
                            .soft(navigation(page).getByText(group, { exact: true }), `navigation group ${group}`)
                            .toHaveCount(groupsOfRole.has(group) ? 1 : 0);
                    }
                });

                await test.step('prints the signed-in user name in the top bar', async () => {
                    await expect
                        .soft(toolbarUserName(page), 'user name in the top bar')
                        .toHaveText(displayNameOf(login));
                });

                await test.step('shows the user name and identity in the user menu', async () => {
                    await openUserMenu(page);
                    await expect.soft(userMenu(page), 'user name in the user menu').toContainText(displayNameOf(login));
                    await expect.soft(userMenu(page), 'identity in the user menu').toContainText(subject);
                    await expect.soft(logoutMenuItem(page), 'logout entry in the user menu').toBeVisible();
                    await checkpoint(page, 'user menu');
                    await page.keyboard.press('Escape');
                    await expect(userMenu(page)).toBeHidden();
                });

                await test.step('shows the notification bell and opens the notification history', async () => {
                    await expect.soft(notificationMenuButton(page), 'notification bell').toBeVisible();
                    await openNotificationMenu(page);
                    const menu = notificationMenu(page);
                    const showAll = menu.getByRole('link', { name: 'Show All' });
                    const emptyMessage = menu.getByText('You do not have any notifications yet');
                    await expect
                        .soft(showAll.or(emptyMessage), 'Show All link or the empty message')
                        .toBeVisible();
                    await expect
                        .soft(showAll, 'Show All link exactly when there are notifications')
                        .toHaveCount((await emptyMessage.count()) === 0 ? 1 : 0);
                    await page.keyboard.press('Escape');
                    await expect(notificationMenu(page)).toBeHidden();
                });

                for (const agenda of agendas.filter((candidate) => !isDeployedOriginAgenda(candidate))) {
                    await test.step(`the ${agenda.navigationGroup} / ${agenda.navigationLabel} entry opens its page`, async () => {
                        await page.goto('/home');
                        await waitForPageReady(page);
                        await navigationEntryByPath(page, agenda.path).click();
                        await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
                        await waitForPageReady(page);
                        await expect
                            .soft(pageTitle(page), `page title of ${agenda.path}`)
                            .toHaveText(agenda.pageTitle);
                    });

                    await test.step(`shows the breadcrumbs Home / ${agenda.breadcrumbLabel} on ${agenda.path}`, async () => {
                        await page.goto(agenda.path);
                        await waitForPageReady(page);
                        await expect
                            .soft(breadcrumbEntries(page), `breadcrumbs on ${agenda.path}`)
                            .toHaveText([/^Home/, agenda.breadcrumbLabel]);
                        await expect
                            .soft(breadcrumbLink(page, 'Home'), 'target of the Home breadcrumb')
                            .toHaveAttribute('href', '/');
                    });
                }

                await test.step('logging out leads to the login page and drops the local tokens', async () => {
                    await openUserMenu(page);
                    await logoutMenuItem(page).click();
                    await expectUrlWhileLoading(page, /\/login/);
                    await waitWhileLoading(page.getByRole('button', { name: 'Login with local Keycloak' }));
                    await expect.soft(userMenuButton(page), 'no user menu after logout').toHaveCount(0);
                    expect
                        .soft(await page.evaluate(() => localStorage.getItem('access_token')), 'stored access token')
                        .toBeNull();
                });
            });
        });
    }
});
