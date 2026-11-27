import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { RunOverviewPage } from '../../support/pages/run/run-overview-page';
import { breadcrumbEntries, dismissErrorDialog, errorDialog, pageTitle } from '../../support/ui';

const UNKNOWN_PREFIX = 'e2e-no-such-token';
const PIN = '1234';
const softExpect = expect.configure({ soft: true });
const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

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

    test('page and accessible runs table', async ({ page, apiAs, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const runOverview = new RunOverviewPage(page);
        await runOverview.open();

        await test.step('shows the page title and the breadcrumbs', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Training Run Overview');
            await expect.soft(breadcrumbEntries(page), 'breadcrumbs').toHaveText([/^Home/, 'Training Runs']);
            await checkpoint(page, 'run overview');
        });

        await test.step('shows the columns Title, Time Slot and Completed Levels, with Actions once there are runs', async () => {
            const columns = ['Title', 'Time Slot', 'Completed Levels'];
            const hasRuns = (await runOverview.table.rows.count()) > 0;
            await expect
                .soft(runOverview.table.root.getByRole('columnheader'), 'column headers')
                .toHaveText(hasRuns ? [...columns, 'Actions'] : columns);
        });

        await test.step('lists the runs the backend reports as accessible, or the empty message', async () => {
            await expect
                .soft(async () => {
                    await runOverview.open();
                    const accessibleRuns = await apiAs('trainee').training.getAll<unknown>('/training-runs/accessible');
                    if (accessibleRuns.length === 0) {
                        await expect(runOverview.table.emptyState).toContainText('You have not accessed any training runs yet', {
                            timeout: 2_000,
                        });
                    } else {
                        await expect(runOverview.table.rows).toHaveCount(accessibleRuns.length, { timeout: 2_000 });
                    }
                }, 'runs table against the accessible runs of the backend')
                .toPass({ timeout: 30_000 });
            await checkpoint(page, 'runs table');
        });

        await test.step('enables exactly one of Resume and Access Results on every row', async () => {
            for (const row of await runOverview.table.rows.all()) {
                const resume = runOverview.table.rowAction(row, 'open_in_new');
                const results = runOverview.table.rowAction(row, 'assessment');
                await expect.soft(resume, 'Resume action of the row').toHaveCount(1);
                await expect.soft(results, 'Access Results action of the row').toHaveCount(1);
                expect
                    .soft((await resume.isEnabled()) !== (await results.isEnabled()), 'exactly one action is enabled')
                    .toBe(true);
            }
        });

        await test.step('shows the paginator range matching the listed rows', async () => {
            const rowCount = await runOverview.table.rows.count();
            await expect
                .soft(runOverview.table.rangeLabel, 'paginator range')
                .toHaveText(rowCount === 0 ? /^\s*0 of 0\s*$/ : new RegExp(`^\\s*1 – ${rowCount} of ${rowCount}\\s*$`));
        });

        await test.step('offers page sizes in the paginator', async () => {
            await runOverview.table.openPageSizeList();
            await expect.soft(page.getByRole('option'), 'page size options').toHaveText(['10', '15', '25', '50', '100']);
            await page.keyboard.press('Escape');
            await expect(page.getByRole('option')).toHaveCount(0);
        });

        await test.step('has no filter above the table', async () => {
            await expect.soft(page.locator('crczp-table-panel .panel-filter'), 'filter above the table').toHaveCount(0);
        });

        await test.step('opens the MITRE ATT&CK Techniques page from the control above the table', async () => {
            await runOverview.mitreControl.click();
            await expect.soft(page, 'address after the MITRE control').toHaveURL(/\/mitre-techniques$/);
        });
    });

    test('access token form', async ({ page, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const runOverview = new RunOverviewPage(page);
        await runOverview.open();

        const clearFields = async (): Promise<void> => {
            await runOverview.prefixInput.fill('');
            await runOverview.pinInput.fill('');
        };
        const fieldError = (message: string) => runOverview.fieldErrors.filter({ hasText: message });

        await test.step('starts empty with the Access button disabled', async () => {
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue('');
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue('');
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
            await expect.soft(runOverview.fieldErrors, 'validation messages').toHaveCount(0);
            await checkpoint(page, 'empty form');
        });

        await test.step('rejects an empty prefix with a message', async () => {
            await runOverview.touch('prefix');
            await expect.soft(fieldError('Prefix cannot be empty'), 'empty prefix message').toBeVisible();
        });

        await test.step('rejects an empty PIN with a message', async () => {
            await runOverview.touch('pin');
            await expect.soft(fieldError('PIN cannot be empty'), 'empty PIN message').toBeVisible();
        });

        await test.step('enables Access once a prefix and a 4 digit PIN are entered', async () => {
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await expect.soft(runOverview.accessButton, 'Access button').toBeEnabled();
        });

        await test.step('keeps Access disabled with a PIN but no prefix', async () => {
            await clearFields();
            await runOverview.pinInput.fill(PIN);
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('keeps Access disabled with a prefix but no PIN', async () => {
            await clearFields();
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('rejects a whitespace-only prefix with a message', async () => {
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await expect.soft(fieldError('Prefix cannot be empty'), 'empty prefix message gone').toHaveCount(0);
            await runOverview.prefixInput.fill('   ');
            await runOverview.touch('prefix');
            await expect.soft(fieldError('Prefix cannot be empty'), 'empty prefix message').toBeVisible();
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('rejects a PIN with letters as not numeric', async () => {
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await expect.soft(fieldError('PIN must be numeric'), 'numeric message gone').toHaveCount(0);
            await runOverview.pinInput.fill('ab12');
            await runOverview.touch('pin');
            await expect.soft(fieldError('PIN must be numeric'), 'numeric message').toBeVisible();
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('rejects a PIN shorter than 4 digits with a message', async () => {
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await expect.soft(fieldError('PIN must contain 4 digits'), 'length message gone').toHaveCount(0);
            await runOverview.pinInput.fill('12');
            await runOverview.touch('pin');
            await expect.soft(fieldError('PIN must contain 4 digits'), 'length message').toBeVisible();
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('stops accepting digits after the 4th of the PIN', async () => {
            await clearFields();
            await runOverview.pinInput.pressSequentially('123456');
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue('1234');
        });

        await test.step('clears the prefix with its clear button', async () => {
            await clearFields();
            await expect.soft(runOverview.clearButtonOf('prefix'), 'prefix clear button while empty').toHaveCount(0);
            await runOverview.prefixInput.fill(UNKNOWN_PREFIX);
            await runOverview.clearButtonOf('prefix').click();
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue('');
            await expect.soft(runOverview.clearButtonOf('prefix'), 'prefix clear button after clearing').toHaveCount(0);
        });

        await test.step('clears the PIN with its clear button', async () => {
            await clearFields();
            await expect.soft(runOverview.clearButtonOf('pin'), 'PIN clear button while empty').toHaveCount(0);
            await runOverview.pinInput.fill(PIN);
            await runOverview.clearButtonOf('pin').click();
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue('');
            await expect.soft(runOverview.accessButton, 'Access button').toBeDisabled();
        });

        await test.step('splits a pasted full token into prefix and PIN', async () => {
            await clearFields();
            await runOverview.paste('prefix', `${UNKNOWN_PREFIX}-${PIN}`);
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue(UNKNOWN_PREFIX);
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue(PIN);
            await expect.soft(runOverview.accessButton, 'Access button').toBeEnabled();
            await expect.soft(runOverview.accessButton, 'Access button focus').toBeFocused();
        });

        await test.step('splits a full token pasted into the PIN field the same way', async () => {
            await clearFields();
            await runOverview.paste('pin', `${UNKNOWN_PREFIX}-${PIN}`);
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue(UNKNOWN_PREFIX);
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue(PIN);
        });

        await test.step('trims whitespace around a pasted token parts', async () => {
            await clearFields();
            await runOverview.paste('prefix', `  ${UNKNOWN_PREFIX} - ${PIN}  `);
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue(UNKNOWN_PREFIX);
            await expect.soft(runOverview.pinInput, 'PIN field').toHaveValue(PIN);
        });

        await test.step('moves focus to the PIN field when a dash is typed in the prefix', async () => {
            await clearFields();
            await runOverview.prefixInput.pressSequentially('abc-');
            await expect.soft(runOverview.pinInput, 'PIN field focus').toBeFocused();
            await expect.soft(runOverview.prefixInput, 'prefix field').toHaveValue('abc');
        });
    });

    test('access token submission', async ({ page, shared, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const runOverview = new RunOverviewPage(page);
        await runOverview.open();

        await test.step('reports an unknown token in an error dialog and stays on the overview', async () => {
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await runOverview.accessButton.click();
            await expect.soft(errorDialog(page), 'error dialog').toContainText('no active training session');
            await checkpoint(page, 'unknown token');
            await dismissErrorDialog(page);
            await expect.soft(page, 'address after the rejection').toHaveURL(/\/run$/);
            await expect.soft(pageTitle(page), 'page title after the rejection').toHaveText('Training Run Overview');
        });

        await test.step('allows another attempt after a rejected token without editing a field', async () => {
            await runOverview.accessButton.click();
            await dismissErrorDialog(page);
            await expect.soft(runOverview.accessButton, 'Access button').toBeEnabled();
        });

        const sentTokens = await interceptAccessRequests(page);

        await test.step('sends prefix and PIN joined by a dash when Access is clicked', async () => {
            await runOverview.open();
            sentTokens.length = 0;
            await runOverview.fillToken(UNKNOWN_PREFIX, PIN);
            await runOverview.accessButton.click();
            await softExpect.poll(() => sentTokens, { message: 'token sent' }).toEqual([`${UNKNOWN_PREFIX}-${PIN}`]);
        });

        await test.step('sends accented and markup characters of a prefix unchanged', async () => {
            await runOverview.open();
            sentTokens.length = 0;
            await runOverview.fillToken('Žluťoučký kůň<b>x</b>', PIN);
            await runOverview.accessButton.click();
            await softExpect.poll(() => sentTokens, { message: 'token sent' }).toEqual([`Žluťoučký kůň<b>x</b>-${PIN}`]);
        });

        await test.step('sends a token without the whitespace typed around its prefix', async () => {
            await runOverview.open();
            sentTokens.length = 0;
            const [prefix, pin] = shared.trainingInstance.accessToken.split(/-(?=[^-]*$)/);
            await runOverview.fillToken(`  ${prefix}  `, pin ?? PIN);
            await runOverview.accessButton.click();
            await softExpect.poll(() => sentTokens, { message: 'token sent' }).toEqual([shared.trainingInstance.accessToken]);
        });
    });
});
