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

    test('shows the title, the columns and the Register control', async ({ page, checkpoint }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await expect(pageTitle(page)).toHaveText('Microservice Overview');
        for (const header of ['Id', 'Name', 'Endpoint']) {
            await expect(overview.table.headerCell(header)).toBeVisible();
        }
        await expect(overview.registerButton).toBeEnabled();
        await expect(overview.filterInput).toBeVisible();
        await checkpoint(page, 'microservice overview loaded');
    });

    test('lists the platform microservices', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        const names = await overview.table.columnTexts('Name');
        for (const known of KNOWN_MICROSERVICES) {
            expect(names).toContain(known);
        }
    });

    test('offers no row selection', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await expect(overview.table.selectAllCheckbox).toHaveCount(0);
    });

    test('filters the list by name', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.filterBy('sandbox');
        await expect(overview.table.rows).toHaveCount(1);
        await expect(overview.table.rows.first()).toContainText('sandbox-service');
    });

    test('shows the empty state when no microservice matches the filter', async ({ page, checkpoint }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.filterBy('zzzz-no-such-service');
        await expect(overview.table.rows).toHaveCount(0);
        await expect(overview.table.emptyState).toHaveText(/No microservices are registered/);
        await checkpoint(page, 'filter without matches');
    });

    test('handles special characters and markup in the filter as literal text', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.filterBy('<b>%_\\"\'</b>');
        await expect(overview.table.rows).toHaveCount(0);
        await expect(overview.table.emptyState).toBeVisible();
    });

    for (const header of ['Name', 'Endpoint']) {
        test(`sorts by ${header.toLowerCase()} in both directions`, async ({ page }) => {
            const overview = new MicroserviceOverviewPage(page);
            await overview.open();
            await overview.table.sortTo(header, 'ascending');
            const ascending = await overview.table.columnTexts(header);
            expect(ascending).toEqual([...ascending].sort());
            await overview.table.sortTo(header, 'descending');
            expect(await overview.table.columnTexts(header)).toEqual([...ascending].reverse());
        });
    }

    test('sorts by id in both directions', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.table.sortTo('Id', 'ascending');
        const ascending = (await overview.table.columnTexts('Id')).map(Number);
        expect(ascending).toEqual([...ascending].sort((left, right) => left - right));
        await overview.table.sortTo('Id', 'descending');
        expect((await overview.table.columnTexts('Id')).map(Number)).toEqual([...ascending].reverse());
    });

    test('pages the list by the chosen page size', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.table.selectPageSize(10);
        await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*\d+ of \d+\s*$/);
        await expect(overview.table.previousPageButton).toBeDisabled();
        await expect(overview.table.nextPageButton).toBeDisabled();
    });

    test('opens the registration form with Register', async ({ page }) => {
        const overview = new MicroserviceOverviewPage(page);
        await overview.open();
        await overview.registerButton.click();
        await expect(page).toHaveURL(/\/microservice\/create$/);
    });
});
