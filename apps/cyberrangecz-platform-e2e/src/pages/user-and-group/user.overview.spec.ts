import { writeFile } from 'node:fs/promises';
import type { ApiClient } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { ADMINISTRATION_LINKS, ROLES_WITHOUT_ADMINISTRATION } from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    countUsers,
    findUserBySubject,
    MEMBER_SUBJECTS,
    memberDisplayName,
} from '../../support/pages/user-and-group/group-data';
import { UserOverviewPage } from '../../support/pages/user-and-group/user-pages';
import {
    captureDownload,
    ConfirmationDialog,
    errorDialog,
    FileUploadDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

/**
 * Imports one new user through the import dialog, with a file in the import format of the users
 * endpoint (`users` entries carrying `sub` and `iss`), issued by the same provider as the seed users.
 */
async function importUser(
    overview: UserOverviewPage,
    api: ApiClient,
    filePath: string,
    login: string,
): Promise<void> {
    const issuer = (await findUserBySubject(api, MEMBER_SUBJECTS[0]))?.iss;
    expect(issuer, 'the seed user carries an issuer').toBeTruthy();
    await writeFile(filePath, JSON.stringify({
            users: [{ sub: login, iss: issuer, given_name: login, family_name: 'Imported', full_name: `${login} Imported` }],
        }));
    await overview.importButton.click();
    const dialog = new FileUploadDialog(overview.page);
    await dialog.chooseFiles(filePath);
    await dialog.confirmButton.click();
    const notification = await waitForNotification(overview.page, 'Users were imported');
    expect(notification.kind).toBe('success');
    await expect(dialog.root).toHaveCount(0);
}

test.describe('user.overview', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /user`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/user', { absentLinks: ADMINISTRATION_LINKS });
            });
        }

        test('sends a signed-out visitor to the login page', async ({ openAs }) => {
            const page = await openAs('anonymous');
            await page.goto('/user');
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test.describe('table', () => {
        test('shows the title, the columns and the controls', async ({ page, checkpoint }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await expect(pageTitle(page)).toHaveText('User Overview');
            for (const header of ['Id', 'Name', 'Login', 'Issuer', 'Email']) {
                await expect(overview.table.headerCell(header)).toBeVisible();
            }
            await expect(overview.deleteButton).toBeDisabled();
            await expect(overview.credentialsButton).toBeEnabled();
            await expect(overview.importButton).toBeEnabled();
            await expect(overview.filterInput).toBeVisible();
            await checkpoint(page, 'user overview loaded');
        });

        test('reports the total number of users the service knows', async ({ page, apiAs }) => {
            const overview = new UserOverviewPage(page);
            await expect(async () => {
                const total = await countUsers(apiAs('userAdministrator').userAndGroup);
                await overview.open();
                await expect(overview.table.rangeLabel).toHaveText(new RegExp(`of ${total}\\s*$`), { timeout: 2_000 });
            }).toPass();
        });

        test('shows the seed users with their login and name', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[0]));
            await expect(overview.rowOf(MEMBER_SUBJECTS[0])).toHaveCount(1);
        });
    });

    test.describe('filter', () => {
        test('narrows the list to the users matching the text', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[2]));
            await expect(overview.table.rows).toHaveCount(1);
            await expect(overview.table.rows.first()).toContainText(MEMBER_SUBJECTS[2]);
        });

        test('shows the empty state when no user matches', async ({ page, checkpoint }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy('zzzz-nobody-0f3a9c');
            await expect(overview.table.rows).toHaveCount(0);
            await expect(overview.table.emptyState).toHaveText(/No users found/);
            await checkpoint(page, 'filter without matches');
        });

        test('handles special characters and markup in the filter as literal text', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy('<b>%_\\"\'</b>');
            await expect(overview.table.rows).toHaveCount(0);
            await expect(overview.table.emptyState).toBeVisible();
        });

        test('restores the full list when the filter is cleared', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy('zzzz-nobody-0f3a9c');
            await expect(overview.table.rows).toHaveCount(0);
            await overview.filterBy('');
            await expect(overview.table.rows.first()).toBeVisible();
        });
    });

    test.describe('sorting', () => {
        test('sorts by id in both directions', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.table.selectPageSize(100);
            await overview.table.sortTo('Id', 'ascending');
            const ascending = (await overview.table.columnTexts('Id')).map(Number);
            expect(ascending).toEqual([...ascending].sort((left, right) => left - right));
            await overview.table.sortTo('Id', 'descending');
            const descending = (await overview.table.columnTexts('Id')).map(Number);
            expect(descending).toEqual([...ascending].reverse());
        });

        for (const header of ['Login', 'Email']) {
            test(`sorts by ${header.toLowerCase()} in both directions`, async ({ page }) => {
                const overview = new UserOverviewPage(page);
                await overview.open();
                await overview.table.selectPageSize(100);
                await overview.table.sortTo(header, 'ascending');
                const ascending = await overview.table.columnTexts(header);
                await overview.table.sortTo(header, 'descending');
                const descending = await overview.table.columnTexts(header);
                expect(descending).toEqual([...ascending].reverse());
            });
        }

        test('starts sorted by name, family name first, ascending', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await expect(overview.table.headerCell('Name')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('marks the sorted name and issuer columns', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.table.sortTo('Name', 'descending');
            await overview.table.sortTo('Issuer', 'ascending');
            await expect(overview.table.headerCell('Issuer')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('lists every user exactly once when paging through the default order', async ({
            page,
            apiAs,
        }) => {
            const overview = new UserOverviewPage(page);
            await expect(async () => {
                const total = await countUsers(apiAs('userAdministrator').userAndGroup);
                await overview.open();
                await overview.table.selectPageSize(25);
                const seen: string[] = [];
                for (let pageNumber = 0; ; pageNumber++) {
                    await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*${pageNumber * 25 + 1}\\s*[–-]`));
                    await overview.table.waitUntilLoaded();
                    seen.push(...(await overview.table.columnTexts('Id')));
                    if (await overview.table.nextPageButton.isDisabled()) {
                        break;
                    }
                    await overview.table.nextPageButton.click();
                }
                expect(new Set(seen).size).toBe(seen.length);
                expect(seen).toHaveLength(total);
            }).toPass();
        });
    });

    test.describe('paging', () => {
        test('offers the page sizes 10, 15, 25, 50 and 100', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.table.pageSizeSelect.click({ force: true });
            await expect(page.getByRole('option')).toHaveText(['10', '15', '25', '50', '100']);
        });

        test('moves between the first, next, previous and last page', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.table.selectPageSize(10);
            await expect(overview.table.rows).toHaveCount(10);
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
            await expect(overview.table.previousPageButton).toBeDisabled();
            await overview.table.nextPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*11\s*[–-]\s*20 of \d+\s*$/);
            await overview.table.previousPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
            await overview.table.lastPageButton.click();
            await expect(overview.table.nextPageButton).toBeDisabled();
            await overview.table.firstPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });
    });

    test.describe('navigation', () => {
        test('opens the user detail with the name link', async ({ page, apiAs }) => {
            const [record] = (
                await apiAs('userAdministrator').userAndGroup.getAll<{ id: number; sub: string }>('/users')
            ).filter((user) => user.sub === MEMBER_SUBJECTS[0]);
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[0]));
            await overview.rowOf(MEMBER_SUBJECTS[0]).getByRole('link').first().click();
            await expect(page).toHaveURL(new RegExp(`/user/${record?.id}$`));
        });
    });

    test.describe('deleting', () => {
        test('labels the delete control with the number of selected users', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy('User2');
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[0])).check();
            await expect(overview.deleteButton).toHaveText(/Delete \(1\)/);
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).check();
            await expect(overview.deleteButton).toHaveText(/Delete \(2\)/);
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).uncheck();
            await expect(overview.deleteButton).toHaveText(/Delete \(1\)/);
        });

        test('asks for confirmation before deleting one user and keeps the user on cancel', async ({
            page,
            apiAs,
            checkpoint,
        }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[0]));
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[0])).check();
            await overview.deleteButton.click();

            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect(dialog.message).toHaveText('Do you want to delete selected user?');
            await checkpoint(page, 'delete user confirmation');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(overview.rowOf(MEMBER_SUBJECTS[0])).toBeVisible();
            expect(await findUserBySubject(apiAs('userAdministrator').userAndGroup, MEMBER_SUBJECTS[0])).toBeDefined();
        });

        test('asks for confirmation before deleting several users and keeps them on cancel', async ({
            page,
            apiAs,
        }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.filterBy('User2');
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[0])).check();
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).check();
            await overview.deleteButton.click();

            const dialog = new ConfirmationDialog(page, /^Delete Users$/);
            await expect(dialog.message).toHaveText('Do you want to delete 2 selected users?');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            const api = apiAs('userAdministrator').userAndGroup;
            for (const subject of [MEMBER_SUBJECTS[0], MEMBER_SUBJECTS[1]]) {
                expect(await findUserBySubject(api, subject)).toBeDefined();
            }
        });
    });

    test.describe('import', () => {
        test('opens the import dialog with Confirm disabled until a file is chosen', async ({
            page,
            checkpoint,
        }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            await overview.importButton.click();
            const dialog = new FileUploadDialog(page);
            await expect(dialog.title).toHaveText('Import Users');
            await expect(dialog.root).toContainText('Select a file to import users');
            await expect(dialog.confirmButton).toBeDisabled();
            await checkpoint(page, 'import dialog');
        });

        test('enables Confirm once a file is chosen and closes without importing on Cancel', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            const importRequests: string[] = [];
            page.on('request', (request) => {
                if (request.method() === 'POST' && /\/users\//.test(request.url())) {
                    importRequests.push(request.url());
                }
            });
            await overview.importButton.click();
            const dialog = new FileUploadDialog(page);
            await dialog.chooseFiles({
                name: 'users.json',
                mimeType: 'application/json',
                buffer: Buffer.from('[]'),
            });
            await expect(dialog.chosenFiles).toHaveCount(1);
            await expect(dialog.confirmButton).toBeEnabled();
            await dialog.cancelButton.click();
            await expect(dialog.root).toHaveCount(0);
            expect(importRequests).toHaveLength(0);
        });
    });

    test.describe('imported user', () => {
        test('lists an imported user and deletes it after confirmation', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }, testInfo) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const login = uniqueName('import-delete');
            const overview = new UserOverviewPage(page);
            await overview.open();
            await importUser(overview, api, testInfo.outputPath('users.json'), login);
            await overview.filterBy(login);
            await expect(overview.rowOf(login)).toHaveCount(1);
            expect(await findUserBySubject(api, login)).toBeDefined();
            await checkpoint(page, 'imported user listed');

            await overview.deleteActionOf(login).click();
            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect(dialog.message).toHaveText('Do you want to delete selected user?');
            await dialog.confirm();

            const notification = await waitForNotification(page, 'Selected users were deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(login)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            expect(await findUserBySubject(api, login)).toBeUndefined();
        });

        test('keeps an imported user when its delete confirmation is cancelled', async ({
            page,
            apiAs,
            uniqueName,
        }, testInfo) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const login = uniqueName('import-keep');
            const overview = new UserOverviewPage(page);
            await overview.open();
            await importUser(overview, api, testInfo.outputPath('users.json'), login);
            await overview.filterBy(login);
            await overview.deleteActionOf(login).click();

            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect(dialog.message).toHaveText('Do you want to delete selected user?');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(overview.rowOf(login)).toHaveCount(1);
            expect(await findUserBySubject(api, login)).toBeDefined();
        });
    });

    test.describe('credentials', () => {
        test('downloads the initial users file', async ({ page }) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            const download = await captureDownload(page, () => overview.credentialsButton.click());
            expect(download.fileName).toBe('oidc-initial-users.yaml');
            expect(download.size).toBeGreaterThan(0);
        });
    });
});
