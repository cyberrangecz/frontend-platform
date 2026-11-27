import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
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
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

/**
 * Asserts that two reads of one column, taken in opposite sort directions, list the distinct values
 * both reads contain in exactly opposite order. Consecutive equal values are collapsed first, since
 * rows tied on the sorted column, such as users without an email, may appear in any number and order.
 * Values present in only one read, such as a user another test creates between the reads, are left
 * out of the comparison.
 */
function expectOppositeOrder<Value>(ascending: Value[], descending: Value[], what: string): void {
    const collapseRuns = (values: Value[]): Value[] =>
        values.filter((value, index) => index === 0 || value !== values[index - 1]);
    const distinctAscending = collapseRuns(ascending);
    const distinctDescending = collapseRuns(descending);
    const inAscending = new Set(distinctAscending);
    const inDescending = new Set(distinctDescending);
    const sharedAscending = distinctAscending.filter((value) => inDescending.has(value));
    const sharedDescending = distinctDescending.filter((value) => inAscending.has(value));
    expect.soft(sharedDescending, what).toEqual([...sharedAscending].reverse());
}

/** Reads one preview file into the open import dialog. */
function jsonFile(name: string, content: string): { name: string; mimeType: string; buffer: Buffer } {
    return { name, mimeType: 'application/json', buffer: Buffer.from(content) };
}

/** Closes the import dialog with its Cancel control. */
async function cancelImportDialog(dialog: FileUploadDialog): Promise<void> {
    await dialog.cancelButton.click();
    await expect(dialog.root).toHaveCount(0);
}

/** Opens the import dialog from the user overview. */
async function openImportDialog(overview: UserOverviewPage, page: Page): Promise<FileUploadDialog> {
    await overview.importButton.click();
    return new FileUploadDialog(page);
}

test.describe('user.overview', () => {
    test('checks the user table, filter and navigation', async ({ page, apiAs, checkpoint }) => {
        test.setTimeout(180_000);
        const overview = new UserOverviewPage(page);
        await overview.open();

        await test.step('shows the title, the columns and the controls', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('User Overview');
            for (const header of ['Id', 'Name', 'Login', 'Issuer', 'Email']) {
                await expect.soft(overview.table.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(overview.deleteButton, 'Delete').toBeDisabled();
            await expect.soft(overview.credentialsButton, 'Get Users Credentials').toBeEnabled();
            await expect.soft(overview.importButton, 'Import Users').toBeEnabled();
            await expect.soft(overview.filterInput, 'filter').toBeVisible();
            await checkpoint(page, 'user overview loaded');
        });

        await test.step('shows the seed users with their login and name', async () => {
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[0]));
            await expect.soft(overview.rowOf(MEMBER_SUBJECTS[0]), 'seed user row').toHaveCount(1);
        });

        await test.step('narrows the list to the users matching the text', async () => {
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[2]));
            await expect.soft(overview.table.rows, 'rows').toHaveCount(1);
            await expect.soft(overview.table.rows.first(), 'matching row').toContainText(MEMBER_SUBJECTS[2]);
        });

        await test.step('shows the empty state when no user matches', async () => {
            await overview.filterBy('zzzz-nobody-0f3a9c');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(0);
            await expect.soft(overview.table.emptyState, 'empty state').toHaveText(/No users found/);
            await checkpoint(page, 'filter without matches');
        });

        await test.step('handles special characters and markup in the filter as literal text', async () => {
            await overview.filterBy('<b>%_\\"\'</b>');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(0);
            await expect.soft(overview.table.emptyState, 'empty state').toBeVisible();
        });

        await test.step('restores the full list when the filter is cleared', async () => {
            await overview.filterBy('');
            await expect.soft(overview.table.rows.first(), 'first row').toBeVisible();
        });

        await test.step('downloads the initial users file', async () => {
            const download = await captureDownload(page, () => overview.credentialsButton.click());
            expect.soft(download.fileName, 'file name').toBe('oidc-initial-users.yaml');
            expect.soft(download.size, 'file size').toBeGreaterThan(0);
        });

        await test.step('opens the user detail with the name link', async () => {
            const [record] = (
                await apiAs('userAdministrator').userAndGroup.getAll<{ id: number; sub: string }>('/users')
            ).filter((user) => user.sub === MEMBER_SUBJECTS[0]);
            await overview.filterBy(memberDisplayName(MEMBER_SUBJECTS[0]));
            await overview.rowOf(MEMBER_SUBJECTS[0]).getByRole('link').first().click();
            await expect(page).toHaveURL(new RegExp(`/user/${record?.id}$`));
        });

        await test.step('reports the total number of users the service knows', async () => {
            await expect(async () => {
                const total = await countUsers(apiAs('userAdministrator').userAndGroup);
                await overview.open();
                await expect(overview.table.rangeLabel).toHaveText(new RegExp(`of ${total}\\s*$`), { timeout: 2_000 });
            }).toPass();
        });
    });

    test('checks sorting and paging of the user table', async ({ page, apiAs }) => {
        test.setTimeout(240_000);
        const overview = new UserOverviewPage(page);
        await overview.open();

        await test.step('starts sorted by name, family name first, ascending', async () => {
            await expect.soft(overview.table.headerCell('Name'), 'Name column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('offers the page sizes 10, 15, 25, 50 and 100', async () => {
            await overview.table.pageSizeSelect.click({ force: true });
            await expect.soft(page.getByRole('option'), 'page sizes').toHaveText(['10', '15', '25', '50', '100']);
            await page.keyboard.press('Escape');
        });

        await test.step('moves between the first, next, previous and last page', async () => {
            await overview.table.selectPageSize(10);
            await expect.soft(overview.table.rows, 'rows').toHaveCount(10);
            await expect.soft(overview.table.rangeLabel, 'first page range').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
            await expect.soft(overview.table.previousPageButton, 'previous on the first page').toBeDisabled();
            await overview.table.nextPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'second page range').toHaveText(/^\s*11\s*[–-]\s*20 of \d+\s*$/);
            await overview.table.previousPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'back on the first page').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
            await overview.table.lastPageButton.click();
            await expect.soft(overview.table.nextPageButton, 'next on the last page').toBeDisabled();
            await overview.table.firstPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'first page again').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });

        await test.step('sorts by id in both directions', async () => {
            await overview.table.selectPageSize(100);
            await overview.table.sortTo('Id', 'ascending');
            const ascending = (await overview.table.columnTexts('Id')).map(Number);
            expect.soft(ascending, 'ascending ids').toEqual([...ascending].sort((left, right) => left - right));
            await overview.table.sortTo('Id', 'descending');
            const descending = (await overview.table.columnTexts('Id')).map(Number);
            expectOppositeOrder(ascending, descending, 'descending ids');
        });

        for (const header of ['Login', 'Email']) {
            await test.step(`sorts by ${header.toLowerCase()} in both directions`, async () => {
                await overview.table.sortTo(header, 'ascending');
                const ascending = await overview.table.columnTexts(header);
                await overview.table.sortTo(header, 'descending');
                const descending = await overview.table.columnTexts(header);
                expectOppositeOrder(ascending, descending, `descending ${header.toLowerCase()}s`);
            });
        }

        await test.step('marks the sorted name and issuer columns', async () => {
            await overview.table.sortTo('Name', 'descending');
            await overview.table.sortTo('Issuer', 'ascending');
            await expect.soft(overview.table.headerCell('Issuer'), 'Issuer column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('lists every user exactly once when paging through the default order', async () => {
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

    test('checks user selection and cancelled deletion', async ({ page, apiAs, checkpoint }) => {
        const api = apiAs('userAdministrator').userAndGroup;
        const overview = new UserOverviewPage(page);
        await overview.open();
        await overview.filterBy('User2');

        await test.step('labels the delete control with the number of selected users', async () => {
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[0])).check();
            await expect.soft(overview.deleteButton, 'one selected').toHaveText(/Delete \(1\)/);
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).check();
            await expect.soft(overview.deleteButton, 'two selected').toHaveText(/Delete \(2\)/);
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).uncheck();
            await expect.soft(overview.deleteButton, 'one selected again').toHaveText(/Delete \(1\)/);
        });

        await test.step('asks for confirmation before deleting several users and keeps them on cancel', async () => {
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).check();
            await overview.deleteButton.click();

            const dialog = new ConfirmationDialog(page, /^Delete Users$/);
            await expect.soft(dialog.message, 'dialog message').toHaveText('Do you want to delete 2 selected users?');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            for (const subject of [MEMBER_SUBJECTS[0], MEMBER_SUBJECTS[1]]) {
                expect.soft(await findUserBySubject(api, subject), `${subject} still exists`).toBeDefined();
            }
        });

        await test.step('asks for confirmation before deleting one user and keeps the user on cancel', async () => {
            await overview.table.rowCheckbox(overview.rowOf(MEMBER_SUBJECTS[1])).uncheck();
            await overview.deleteButton.click();

            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect.soft(dialog.message, 'dialog message').toHaveText('Do you want to delete selected user?');
            await checkpoint(page, 'delete user confirmation');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect.soft(overview.rowOf(MEMBER_SUBJECTS[0]), 'row of the user').toBeVisible();
            expect.soft(await findUserBySubject(api, MEMBER_SUBJECTS[0]), 'user still exists').toBeDefined();
        });
    });

    test('checks the import dialog previews', async ({ page, checkpoint }) => {
        test.setTimeout(180_000);
        const overview = new UserOverviewPage(page);
        await overview.open();

        await test.step('opens the import dialog with Confirm disabled until a file is chosen', async () => {
            const dialog = await openImportDialog(overview, page);
            await expect.soft(dialog.title, 'dialog title').toHaveText('Import users');
            await expect.soft(dialog.root, 'dialog text').toContainText('Select one or more files to import users');
            await expect.soft(dialog.confirmButton, 'Confirm').toBeDisabled();
            await checkpoint(page, 'import dialog');
            await cancelImportDialog(dialog);
        });

        await test.step('enables Confirm once a file is chosen and closes without importing on Cancel', async () => {
            const importRequests: string[] = [];
            const recordRequest = (request: { method(): string; url(): string }): void => {
                if (request.method() === 'POST' && /\/users\//.test(request.url())) {
                    importRequests.push(request.url());
                }
            };
            page.on('request', recordRequest);
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(
                jsonFile('users.json', JSON.stringify({ users: [{ sub: 'first-preview', iss: 'https://issuer.example' }] })),
            );
            await expect.soft(dialog.chosenFiles, 'chosen files').toHaveCount(1);
            await expect.soft(dialog.confirmButton, 'Confirm').toBeEnabled();
            await cancelImportDialog(dialog);
            page.off('request', recordRequest);
            expect.soft(importRequests, 'import requests').toHaveLength(0);
        });

        await test.step('shows one preview card per listed user', async () => {
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(
                jsonFile(
                    'users.json',
                    JSON.stringify({
                        users: [
                            { sub: 'first-preview', iss: 'https://issuer.example', full_name: 'First Preview' },
                            { sub: 'second-preview', iss: 'https://issuer.example' },
                        ],
                    }),
                ),
            );
            await expect.soft(dialog.userCards, 'cards').toHaveCount(2);
            await expect.soft(dialog.userCards.first(), 'first card').toContainText('First Preview');
            await expect.soft(dialog.userCards.last(), 'last card').toContainText('second-preview');
            await expect.soft(dialog.confirmButton, 'Confirm').toBeEnabled();
            await cancelImportDialog(dialog);
        });

        await test.step('shows the subject and issuer on each card, falling back to the subject as the name', async () => {
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(
                jsonFile(
                    'users.json',
                    JSON.stringify({
                        users: [
                            { sub: 'named-preview', iss: 'https://issuer.example', full_name: 'Named Preview' },
                            { sub: 'unnamed-preview', iss: 'https://issuer.example' },
                        ],
                    }),
                ),
            );
            await expect.soft(dialog.userCards.first().locator('.user-import-card-name'), 'first card name').toHaveText('Named Preview');
            await expect.soft(dialog.userCards.first().locator('.user-import-card-identity'), 'first card identity').toHaveText(
                'named-preview · https://issuer.example',
            );
            await expect.soft(dialog.userCards.last().locator('.user-import-card-name'), 'last card name').toHaveText('unnamed-preview');
            await expect.soft(dialog.userCards.last().locator('.user-import-card-identity'), 'last card identity').toHaveText(
                'unnamed-preview · https://issuer.example',
            );
            await cancelImportDialog(dialog);
        });

        await test.step('shows the first 50 cards and counts the users beyond them', async () => {
            const dialog = await openImportDialog(overview, page);
            const users = Array.from({ length: 53 }, (_, index) => ({
                sub: `bulk-preview-${index}`,
                iss: 'https://issuer.example',
            }));
            await dialog.chooseFiles(jsonFile('users.json', JSON.stringify({ users })));
            await expect.soft(dialog.userCards, 'cards').toHaveCount(50);
            await expect.soft(dialog.root, 'dialog text').toContainText('and 3 more');
            await expect.soft(dialog.confirmButton, 'Confirm').toBeEnabled();
            await cancelImportDialog(dialog);
        });

        await test.step('rejects a file that is not well-formed JSON, leaving Confirm disabled', async () => {
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(jsonFile('broken.json', '{ this is not json'));
            await expect.soft(dialog.rejections, 'rejection').toHaveText(/The file is not well-formed JSON/);
            await expect.soft(dialog.userCards, 'cards').toHaveCount(0);
            await expect.soft(dialog.confirmButton, 'Confirm').toBeDisabled();
            await cancelImportDialog(dialog);
        });

        await test.step('rejects a file without users and a user without an issuer, leaving Confirm disabled', async () => {
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(jsonFile('empty.json', '[]'));
            await expect.soft(dialog.rejections, 'rejection of an empty file').toHaveText(/The file lists no users/);
            await expect.soft(dialog.confirmButton, 'Confirm after an empty file').toBeDisabled();
            await cancelImportDialog(dialog);

            await openImportDialog(overview, page);
            await dialog.chooseFiles(jsonFile('no-issuer.json', JSON.stringify({ users: [{ sub: 'first-preview' }] })));
            await expect.soft(dialog.rejections, 'rejection of a user without issuer').toHaveText(/User 1 has no subject or issuer/);
            await expect.soft(dialog.userCards, 'cards').toHaveCount(0);
            await expect.soft(dialog.confirmButton, 'Confirm after a user without issuer').toBeDisabled();
            await cancelImportDialog(dialog);
        });
    });

    test('imports users, then keeps and deletes them', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const issuer = (await findUserBySubject(api, MEMBER_SUBJECTS[0]))?.iss;
        expect(issuer, 'the seed user carries an issuer').toBeTruthy();
        const logins = [uniqueName('import-card-a'), uniqueName('import-card-b')] as const;
        const overview = new UserOverviewPage(page);
        await overview.open();

        await test.step('imports every user its cards list', async () => {
            const dialog = await openImportDialog(overview, page);
            await dialog.chooseFiles(
                jsonFile(
                    'users.json',
                    JSON.stringify({
                        users: logins.map((login) => ({
                            sub: login,
                            iss: issuer,
                            given_name: login,
                            family_name: 'Imported',
                            full_name: `${login} Imported`,
                        })),
                    }),
                ),
            );
            await expect(dialog.userCards).toHaveCount(2);
            await dialog.confirmButton.click();
            expect((await waitForNotification(page, 'Users were imported')).kind).toBe('success');
            await expect(dialog.root).toHaveCount(0);
            for (const login of logins) {
                expect(await findUserBySubject(api, login), `${login} was imported`).toBeDefined();
            }
        });

        await test.step('keeps an imported user when its delete confirmation is cancelled', async () => {
            await overview.filterBy(logins[0]);
            await overview.deleteActionOf(logins[0]).click();

            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect(dialog.message).toHaveText('Do you want to delete selected user?');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(overview.rowOf(logins[0])).toHaveCount(1);
            expect(await findUserBySubject(api, logins[0])).toBeDefined();
        });

        await test.step('lists an imported user and deletes it after confirmation', async () => {
            await expect(overview.rowOf(logins[0])).toHaveCount(1);
            expect(await findUserBySubject(api, logins[0])).toBeDefined();
            await checkpoint(page, 'imported user listed');

            await overview.deleteActionOf(logins[0]).click();
            const dialog = new ConfirmationDialog(page, /^Delete User$/);
            await expect(dialog.message).toHaveText('Do you want to delete selected user?');
            await dialog.confirm();

            const notification = await waitForNotification(page, 'Selected users were deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(logins[0])).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            expect(await findUserBySubject(api, logins[0])).toBeUndefined();
        });

        await test.step('deletes the second imported user as well', async () => {
            await overview.filterBy(logins[1]);
            await overview.deleteActionOf(logins[1]).click();
            await new ConfirmationDialog(page, /^Delete User$/).confirm();

            const notification = await waitForNotification(page, 'Selected users were deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(logins[1])).toHaveCount(0);
            expect(await findUserBySubject(api, logins[1])).toBeUndefined();
        });
    });
});
