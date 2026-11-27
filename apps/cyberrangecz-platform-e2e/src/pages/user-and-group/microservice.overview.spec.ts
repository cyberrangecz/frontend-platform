import { expect, test } from '../../support/fixtures';
import { MicroserviceOverviewPage } from '../../support/pages/user-and-group/microservice-pages';
import { expectUrlWhileLoading, pageTitle } from '../../support/ui';

test.use({ origin: 'deployed', account: 'userAdministrator' });

const KNOWN_MICROSERVICES = ['guacamole-service', 'sandbox-service', 'training', 'user-and-group'];

test.describe('microservice.overview', () => {
    test('sends a signed-out visitor to the login page', async ({ openAs }) => {
        const page = await openAs('anonymous');
        await page.goto('/microservice');
        await expectUrlWhileLoading(page, /\/login/);
    });

    test('checks the microservice overview', async ({ page, checkpoint }) => {
        test.setTimeout(180_000);
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();

        await test.step('shows the title, the columns and the Register control', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Microservice Overview');
            for (const header of ['Id', 'Name', 'Endpoint']) {
                await expect.soft(overview.table.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(overview.registerButton, 'Register').toBeEnabled();
            await expect.soft(overview.filterInput, 'filter').toBeVisible();
            await checkpoint(page, 'microservice overview loaded');
        });

        await test.step('lists the platform microservices', async () => {
            const names = await overview.table.columnTexts('Name');
            for (const known of KNOWN_MICROSERVICES) {
                expect.soft(names, `microservice ${known}`).toContain(known);
            }
        });

        await test.step('offers no row selection', async () => {
            await expect.soft(overview.table.selectAllCheckbox, 'select all').toHaveCount(0);
        });

        await test.step('filters the list by name', async () => {
            await overview.filterBy('sandbox');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(1);
            await expect.soft(overview.table.rows.first(), 'matching row').toContainText('sandbox-service');
        });

        await test.step('shows the empty state when no microservice matches the filter', async () => {
            await overview.filterBy('zzzz-no-such-service');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(0);
            await expect.soft(overview.table.emptyState, 'empty state').toHaveText(/No microservices are registered/);
            await checkpoint(page, 'filter without matches');
        });

        await test.step('handles special characters and markup in the filter as literal text', async () => {
            await overview.filterBy('<b>%_\\"\'</b>');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(0);
            await expect.soft(overview.table.emptyState, 'empty state').toBeVisible();
            await overview.filterBy('');
        });

        for (const header of ['Name', 'Endpoint']) {
            await test.step(`sorts by ${header.toLowerCase()} in both directions`, async () => {
                await overview.table.sortTo(header, 'ascending');
                const ascending = await overview.table.columnTexts(header);
                expect.soft(ascending, `ascending ${header.toLowerCase()}`).toEqual([...ascending].sort());
                await overview.table.sortTo(header, 'descending');
                expect.soft(await overview.table.columnTexts(header), `descending ${header.toLowerCase()}`).toEqual(
                    [...ascending].reverse(),
                );
            });
        }

        await test.step('sorts by id in both directions', async () => {
            await overview.table.sortTo('Id', 'ascending');
            const ascending = (await overview.table.columnTexts('Id')).map(Number);
            expect.soft(ascending, 'ascending ids').toEqual([...ascending].sort((left, right) => left - right));
            await overview.table.sortTo('Id', 'descending');
            expect.soft((await overview.table.columnTexts('Id')).map(Number), 'descending ids').toEqual(
                [...ascending].reverse(),
            );
        });

        await test.step('pages the list by the chosen page size', async () => {
            await overview.table.selectPageSize(10);
            await expect.soft(overview.table.rangeLabel, 'range').toHaveText(/^\s*1\s*[–-]\s*\d+ of \d+\s*$/);
            await expect.soft(overview.table.previousPageButton, 'previous').toBeDisabled();
            await expect.soft(overview.table.nextPageButton, 'next').toBeDisabled();
        });

        await test.step('opens the registration form with Register', async () => {
            await overview.registerButton.click();
            await expect(page).toHaveURL(/\/microservice\/create$/);
        });
    });
});
