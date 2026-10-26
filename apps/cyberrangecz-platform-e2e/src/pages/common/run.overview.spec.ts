import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { RunOverviewPage } from '../../support/pages/run/run-overview-page';
import { breadcrumbEntries, dismissErrorDialog, errorDialog, pageTitle } from '../../support/ui';

const UNKNOWN_PREFIX = 'e2e-no-such-token';
const PIN = '1234';

/** Records the access token of every request that tries to enter a run, and keeps it from reaching the backend. */
async function interceptAccessRequests(page: Page): Promise<string[]> {
    const sentTokens: string[] = [];
    await page.route(
        (url) => url.searchParams.has('accessToken'),
        async (route) => {
            sentTokens.push(new URL(route.request().url()).searchParams.get('accessToken') ?? '');
            await route.abort();
        },
    );
    return sentTokens;
}

test.describe('run.overview', () => {
    test.use({ account: 'trainee' });

    test('shows the page title and the breadcrumbs', async ({ page, checkpoint }) => {
        const runOverview = new RunOverviewPage(page);
        await runOverview.open();
        await expect(pageTitle(page)).toHaveText('Training Run Overview');
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, 'Training Runs']);
        await checkpoint(page, 'run overview');
    });

    test.describe('accessible runs table', () => {
        test('shows the columns Title, Time Slot and Completed Levels, with Actions once there are runs', async ({
            page,
        }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.table.waitUntilLoaded();
            const columns = ['Title', 'Time Slot', 'Completed Levels'];
            const hasRuns = (await runOverview.table.rows.count()) > 0;
            await expect(runOverview.table.root.getByRole('columnheader')).toHaveText(
                hasRuns ? [...columns, 'Actions'] : columns,
            );
        });

        test('lists the runs the backend reports as accessible, or the empty message', async ({
            page,
            apiAs,
            checkpoint,
        }) => {
            const runOverview = new RunOverviewPage(page);
            await expect(async () => {
                await runOverview.open();
                await runOverview.table.waitUntilLoaded();
                const accessibleRuns = await apiAs('trainee').training.getAll<unknown>('/training-runs/accessible');
                if (accessibleRuns.length === 0) {
                    await expect(runOverview.table.emptyState).toContainText('You have not accessed any training runs yet', {
                        timeout: 2_000,
                    });
                } else {
                    await expect(runOverview.table.rows).toHaveCount(accessibleRuns.length, { timeout: 2_000 });
                }
            }).toPass();
            await checkpoint(page, 'runs table');
        });

        test('enables exactly one of Resume and Access Results on every row', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.table.waitUntilLoaded();
            for (const row of await runOverview.table.rows.all()) {
                const resume = runOverview.table.rowAction(row, 'open_in_new');
                const results = runOverview.table.rowAction(row, 'assessment');
                await expect(resume).toHaveCount(1);
                await expect(results).toHaveCount(1);
                expect((await resume.isEnabled()) !== (await results.isEnabled())).toBe(true);
            }
        });

        test('shows the paginator range matching the listed rows', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.table.waitUntilLoaded();
            const rowCount = await runOverview.table.rows.count();
            await expect(runOverview.table.rangeLabel).toHaveText(
                rowCount === 0 ? /^\s*0 of 0\s*$/ : new RegExp(`^\\s*1 – ${rowCount} of ${rowCount}\\s*$`),
            );
        });

        test('offers page sizes in the paginator', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.table.waitUntilLoaded();
            await runOverview.table.openPageSizeList();
            await expect(page.getByRole('option')).toHaveText(['10', '15', '25', '50', '100']);
        });

        test('has no filter above the table', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await expect(page.locator('sentinel-filter-free-input')).toHaveCount(0);
        });
    });

    test('opens the MITRE ATT&CK Techniques page from the control above the table', async ({ page }) => {
        const runOverview = new RunOverviewPage(page);
        await runOverview.open();
        await runOverview.mitreControl.click();
        await expect(page).toHaveURL(/\/mitre-techniques$/);
    });

    test.describe('access token form', () => {
        test('starts empty with the Access button disabled', async ({ page, checkpoint }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await expect(runOverview.prefixInput).toHaveValue('');
            await expect(runOverview.pinInput).toHaveValue('');
            await expect(runOverview.accessButton).toBeDisabled();
            await expect(runOverview.fieldErrors).toHaveCount(0);
            await checkpoint(page, 'empty form');
        });

        test('enables Access once a prefix and a 4 digit PIN are entered', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await expect(runOverview.accessButton).toBeEnabled();
        });

        test('keeps Access disabled with a PIN but no prefix', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.pinInput.fill(PIN);
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('keeps Access disabled with a prefix but no PIN', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('rejects an empty prefix with a message', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.touch('prefix');
            await expect(runOverview.fieldErrors.filter({ hasText: 'Prefix cannot be empty' })).toBeVisible();
        });

        test('rejects a whitespace-only prefix with a message', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken('   ', PIN);
            await runOverview.touch('prefix');
            await expect(runOverview.fieldErrors.filter({ hasText: 'Prefix cannot be empty' })).toBeVisible();
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('rejects an empty PIN with a message', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.touch('pin');
            await expect(runOverview.fieldErrors.filter({ hasText: 'PIN cannot be empty' })).toBeVisible();
        });

        test('rejects a PIN with letters as not numeric', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await runOverview.pinInput.fill('ab12');
            await runOverview.touch('pin');
            await expect(runOverview.fieldErrors.filter({ hasText: 'PIN must be numeric' })).toBeVisible();
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('rejects a PIN shorter than 4 digits with a message', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await runOverview.pinInput.fill('12');
            await runOverview.touch('pin');
            await expect(runOverview.fieldErrors.filter({ hasText: 'PIN must contain 4 digits' })).toBeVisible();
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('stops accepting digits after the 4th of the PIN', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.pinInput.pressSequentially('123456');
            await expect(runOverview.pinInput).toHaveValue('1234');
        });

        test('clears the prefix with its clear button', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await expect(runOverview.clearButtonOf('prefix')).toHaveCount(0);
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await runOverview.clearButtonOf('prefix').click();
            await expect(runOverview.prefixInput).toHaveValue('');
            await expect(runOverview.clearButtonOf('prefix')).toHaveCount(0);
        });

        test('clears the PIN with its clear button', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await expect(runOverview.clearButtonOf('pin')).toHaveCount(0);
            await runOverview.pinInput.fill(PIN);
            await runOverview.clearButtonOf('pin').click();
            await expect(runOverview.pinInput).toHaveValue('');
            await expect(runOverview.accessButton).toBeDisabled();
        });

        test('splits a pasted full token into prefix and PIN', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.paste('prefix', `${UNKNOWN_PREFIX}-${PIN}`);
            await expect(runOverview.prefixInput).toHaveValue(UNKNOWN_PREFIX);
            await expect(runOverview.pinInput).toHaveValue(PIN);
            await expect(runOverview.accessButton).toBeEnabled();
            await expect(runOverview.accessButton).toBeFocused();
        });

        test('splits a full token pasted into the PIN field the same way', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.paste('pin', `${UNKNOWN_PREFIX}-${PIN}`);
            await expect(runOverview.prefixInput).toHaveValue(UNKNOWN_PREFIX);
            await expect(runOverview.pinInput).toHaveValue(PIN);
        });

        test('trims whitespace around a pasted token parts', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.paste('prefix', `  ${UNKNOWN_PREFIX} - ${PIN}  `);
            await expect(runOverview.prefixInput).toHaveValue(UNKNOWN_PREFIX);
            await expect(runOverview.pinInput).toHaveValue(PIN);
        });

        test('moves focus to the PIN field when a dash is typed in the prefix', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.prefixInput.pressSequentially('abc-');
            await expect(runOverview.pinInput).toBeFocused();
            await expect(runOverview.prefixInput).toHaveValue('abc');
        });

        test('sends prefix and PIN joined by a dash when Access is clicked', async ({ page }) => {
            const sentTokens = await interceptAccessRequests(page);
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await runOverview.accessButton.click();
            await expect.poll(() => sentTokens).toEqual([`${UNKNOWN_PREFIX}-${PIN}`]);
        });

        test('sends accented and markup characters of a prefix unchanged', async ({ page }) => {
            const sentTokens = await interceptAccessRequests(page);
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken('Žluťoučký kůň<b>x</b>', PIN);
            await runOverview.accessButton.click();
            await expect.poll(() => sentTokens).toEqual([`Žluťoučký kůň<b>x</b>-${PIN}`]);
        });

        test('sends a token without the whitespace typed around its prefix', async ({ page, shared }) => {
            const sentTokens = await interceptAccessRequests(page);
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            const [prefix, pin] = shared.trainingInstance.accessToken.split(/-(?=[^-]*$)/);
            await runOverview.fillToken(`  ${prefix}  `, pin ?? PIN);
            await runOverview.accessButton.click();
            await expect.poll(() => sentTokens).toEqual([shared.trainingInstance.accessToken]);
        });

        test('reports an unknown token in an error dialog and stays on the overview', async ({
            page,
            checkpoint,
        }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await runOverview.accessButton.click();
            await expect(errorDialog(page)).toContainText('no active training session');
            await checkpoint(page, 'unknown token');
            await dismissErrorDialog(page);
            await expect(page).toHaveURL(/\/run$/);
            await expect(pageTitle(page)).toHaveText('Training Run Overview');
        });

        test('allows another attempt after a rejected token without editing a field', async ({ page }) => {
            const runOverview = new RunOverviewPage(page);
            await runOverview.open();
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await runOverview.accessButton.click();
            await dismissErrorDialog(page);
            await expect(runOverview.accessButton).toBeEnabled();
        });
    });
});
