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

test.describe('page chrome', () => {
    for (const role of ALL_ROLES) {
        test.describe(`as ${role}`, () => {
            test.use({ account: role });
            const agendas = agendasOf(role);

            test('lists exactly the navigation entries of the role', async ({ page, checkpoint }) => {
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                for (const key of ALL_AGENDAS) {
                    const entry = navigationEntryByPath(page, AGENDAS[key].path);
                    if (agendas.includes(AGENDAS[key])) {
                        await expect(entry).toHaveCount(1);
                        await expect(entry).toHaveText(AGENDAS[key].navigationLabel);
                    } else {
                        await expect(entry).toHaveCount(0);
                    }
                }
                await checkpoint(page, 'navigation');
            });

            test('shows the navigation groups of the role and no other', async ({ page }) => {
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                const groupsOfRole = new Set(agendas.map((agenda) => agenda.navigationGroup));
                for (const group of NAVIGATION_GROUPS) {
                    const groupLabel = navigation(page).getByText(group, { exact: true });
                    await expect(groupLabel).toHaveCount(groupsOfRole.has(group) ? 1 : 0);
                }
            });

            for (const agenda of agendas.filter((candidate) => !isDeployedOriginAgenda(candidate))) {
                test(`the ${agenda.navigationGroup} / ${agenda.navigationLabel} entry opens its page`, async ({
                    page,
                }) => {
                    await page.goto('/home');
                    await waitForPageReady(page);
                    await navigationEntryByPath(page, agenda.path).click();
                    await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
                    await waitForPageReady(page);
                    await expect(pageTitle(page)).toHaveText(agenda.pageTitle);
                });

                test(`shows the breadcrumbs Home / ${agenda.breadcrumbLabel} on ${agenda.path}`, async ({
                    page,
                }) => {
                    await page.goto(agenda.path);
                    await waitForPageReady(page);
                    await expect(breadcrumbEntries(page)).toHaveText([/^Home/, agenda.breadcrumbLabel]);
                    await expect(breadcrumbLink(page, 'Home')).toHaveAttribute('href', '/');
                });
            }

            test('prints the signed-in user name in the top bar', async ({ page, browserKey }) => {
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                const { login } = ACCOUNTS[accountFor(role, browserKey)];
                await expect(toolbarUserName(page)).toHaveText(displayNameOf(login));
            });

            test('shows the user name and identity in the user menu', async ({ page, browserKey, checkpoint }) => {
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                const { login, subject } = ACCOUNTS[accountFor(role, browserKey)];
                await openUserMenu(page);
                await expect(userMenu(page)).toContainText(displayNameOf(login));
                await expect(userMenu(page)).toContainText(subject);
                await expect(logoutMenuItem(page)).toBeVisible();
                await checkpoint(page, 'user menu');
            });

            test('logging out leads to the login page and drops the local tokens', async ({ page }) => {
                await page.route(KEYCLOAK_LOGOUT_URL, (route) =>
                    route.fulfill({
                        contentType: 'text/html',
                        body: `<meta http-equiv="refresh" content="0;url=${new URL('/login', page.url()).href}">`,
                    }),
                );
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                await openUserMenu(page);
                await logoutMenuItem(page).click();
                await expectUrlWhileLoading(page, /\/login/);
                await waitWhileLoading(page.getByRole('button', { name: 'Login with local Keycloak' }));
                await expect(userMenuButton(page)).toHaveCount(0);
                expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
            });

            test('shows the notification bell and opens the notification history', async ({ page }) => {
                await page.goto(agendas[0]!.path);
                await waitForPageReady(page);
                await expect(notificationMenuButton(page)).toBeVisible();
                await openNotificationMenu(page);
                const menu = notificationMenu(page);
                const showAll = menu.getByRole('link', { name: 'Show All' });
                const emptyMessage = menu.getByText('You do not have any notifications yet');
                await expect(showAll.or(emptyMessage)).toBeVisible();
                await expect(showAll).toHaveCount((await emptyMessage.count()) === 0 ? 1 : 0);
            });
        });
    }
});
