import { expect, test } from '../../support/fixtures';
import { breadcrumbEntries, dismissErrorDialogs, expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('mitre-techniques', () => {
    test.use({ account: 'trainee' });

    test('mitre page', async ({ page, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        await page.goto('/mitre-techniques');
        await waitForPageReady(page);

        await test.step('shows the page title, breadcrumbs and the matrix description', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('MITRE ATT&CK Techniques');
            await expect
                .soft(breadcrumbEntries(page), 'breadcrumbs')
                .toHaveText([/^Home/, 'MITRE ATT&CK Techniques']);
            await expect
                .soft(page.locator('crczp-mitre-techniques .description'), 'matrix description')
                .toContainText('The MITRE ATT&CK matrix contains a set of techniques');
            await checkpoint(page, 'mitre page');
        });

        await test.step('offers no played / all switch on the trainee route', async () => {
            await expect
                .soft(page.locator('crczp-mitre-techniques mat-slide-toggle'), 'played / all switch')
                .toHaveCount(0);
        });

        await test.step('renders the matrix tactics without an error dialog', async () => {
            const matrix = page.locator('crczp-mitre-techniques');
            await expect
                .soft(matrix.getByText('Reconnaissance').first(), 'Reconnaissance tactic')
                .toBeVisible({ timeout: 30_000 });
            await expect.soft(matrix.getByText('Initial Access').first(), 'Initial Access tactic').toBeVisible();
            await expect.soft(matrix.locator('crczp-logo-spinner'), 'matrix loading spinner').toHaveCount(0);
            expect.soft(await dismissErrorDialogs(page), 'error dialogs that opened').toBe(0);
            await checkpoint(
                page,
                'matrix rendered',
                'MITRE ATT&CK matrix with one column per tactic, starting with Reconnaissance and Initial Access, each column listing technique cells',
            );
        });

        await test.step('is reached from the MITRE ATT&CK Techniques control of the run overview', async () => {
            await page.goto('/run');
            await waitForPageReady(page);
            await page.getByRole('button', { name: 'MITRE ATT&CK Techniques' }).click();
            await expectUrlWhileLoading(page, /\/mitre-techniques$/);
            await waitForPageReady(page);
            await expect.soft(pageTitle(page), 'page title after the control').toHaveText('MITRE ATT&CK Techniques');
        });
    });

    test.describe('as training designer', () => {
        test.use({ account: 'trainingDesigner' });

        test('opens for a designer too', async ({ page }) => {
            await page.goto('/mitre-techniques');
            await waitForPageReady(page);
            await expect(pageTitle(page)).toHaveText('MITRE ATT&CK Techniques');
            await expect(page).toHaveURL(/\/mitre-techniques$/);
        });
    });

    test.describe('as user administrator', () => {
        test.use({ account: 'userAdministrator' });

        test('opens for any account that holds the training trainee role', async ({ page }) => {
            await page.goto('/mitre-techniques');
            await expect(page).toHaveURL(/\/mitre-techniques$/);
        });
    });
});
