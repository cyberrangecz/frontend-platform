import { expect, test } from '../../support/fixtures';
import { breadcrumbEntries, expectNoErrorDialog, expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

test.describe('mitre-techniques', () => {
    test.use({ account: 'trainee' });

    test('shows the page title, breadcrumbs and the matrix description', async ({ page, checkpoint }) => {
        await page.goto('/mitre-techniques');
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText('MITRE ATT&CK Techniques');
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, 'MITRE ATT&CK Techniques']);
        await expect(page.locator('crczp-mitre-techniques .description')).toContainText(
            'The MITRE ATT&CK matrix contains a set of techniques',
        );
        await checkpoint(page, 'mitre page');
    });

    test('renders the matrix tactics without an error dialog', async ({ page, checkpoint }) => {
        await page.goto('/mitre-techniques');
        const matrix = page.locator('crczp-mitre-techniques');
        await expect(matrix.getByText('Reconnaissance').first()).toBeVisible({ timeout: 30_000 });
        await expect(matrix.getByText('Initial Access').first()).toBeVisible();
        await expect(matrix.locator('crczp-logo-spinner')).toHaveCount(0);
        await expectNoErrorDialog(page);
        await checkpoint(
            page,
            'matrix rendered',
            'MITRE ATT&CK matrix with one column per tactic, starting with Reconnaissance and Initial Access, each column listing technique cells',
        );
    });

    test('offers no played / all switch on the trainee route', async ({ page }) => {
        await page.goto('/mitre-techniques');
        await waitForPageReady(page);
        await expect(page.locator('crczp-mitre-techniques mat-slide-toggle')).toHaveCount(0);
    });

    test('is reached from the MITRE ATT&CK Techniques control of the run overview', async ({ page }) => {
        await page.goto('/run');
        await waitForPageReady(page);
        await page.getByRole('button', { name: 'MITRE ATT&CK Techniques' }).click();
        await expectUrlWhileLoading(page, /\/mitre-techniques$/);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText('MITRE ATT&CK Techniques');
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
