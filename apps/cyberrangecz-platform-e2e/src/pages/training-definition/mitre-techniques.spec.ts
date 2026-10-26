import { expect, test } from '../../support/fixtures';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    createEmptyDefinition,
    definitionWithTechnique,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import { breadcrumbEntries, dismissErrorDialog, errorDialog, pageTitle } from '../../support/ui';

const MATRIX_TIMEOUT = 30_000;

test.describe('mitre-techniques', () => {
    test.use({ account: 'trainingDesigner' });

    test('shows the page title, breadcrumbs and the matrix description', async ({ page, checkpoint }) => {
        await page.goto('/mitre-techniques');
        await expect(pageTitle(page)).toHaveText('MITRE ATT&CK Techniques');
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, 'MITRE ATT&CK Techniques']);
        await expect(page.locator('crczp-mitre-techniques .description')).toContainText(
            'The MITRE ATT&CK matrix contains a set of techniques',
        );
        await checkpoint(page, 'mitre page');
    });

    test('renders every tactic column of the matrix without an error dialog', async ({ page, checkpoint }) => {
        await page.goto('/mitre-techniques');
        const matrix = page.locator('crczp-mitre-techniques');
        for (const tactic of ['Reconnaissance', 'Resource Development', 'Initial Access', 'Execution', 'Persistence']) {
            await expect(matrix.getByText(tactic, { exact: true }).first()).toBeVisible({ timeout: MATRIX_TIMEOUT });
        }
        await expect(matrix.locator('crczp-logo-spinner')).toHaveCount(0);
        await expect(errorDialog(page)).toHaveCount(0);
        await checkpoint(
            page,
            'matrix rendered',
            'MITRE ATT&CK matrix with one column per tactic, starting with Reconnaissance, Resource Development, Initial Access, Execution and Persistence, each column listing technique cells',
        );
    });

    test('offers no played / all switch to a designer', async ({ page }) => {
        await page.goto('/mitre-techniques');
        await expect(page.locator('crczp-mitre-techniques').getByText('Reconnaissance').first()).toBeVisible({
            timeout: MATRIX_TIMEOUT,
        });
        await expect(page.locator('crczp-mitre-techniques mat-slide-toggle')).toHaveCount(0);
    });

    test('lists a training definition that uses a technique in the matrix legend', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const title = uniqueName('mitre-legend');
        const api = apiAs('trainingDesigner');
        const definition = await importDefinitionBody(api, definitionWithTechnique(title, 'TA0009.T1005'));
        await api.training.put(`/training-definitions/${definition.id}/states/RELEASED`, {});
        await page.goto('/mitre-techniques');
        await expect(
            page.locator('crczp-mitre-techniques').getByText(`${title} (${definition.id})`).first(),
        ).toBeAttached({ timeout: MATRIX_TIMEOUT });
        await checkpoint(
            page,
            'legend with the definition',
            `MITRE ATT&CK matrix whose legend lists the training definition '${title} (${definition.id})', which uses technique T1005 of tactic TA0009`,
        );
    });

    test('leaves a training definition without techniques out of the matrix legend', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const title = uniqueName('mitre-no-technique');
        await createEmptyDefinition(apiAs('trainingDesigner'), title);
        await page.goto('/mitre-techniques');
        await expect(page.locator('crczp-mitre-techniques').getByText('Reconnaissance').first()).toBeVisible({
            timeout: MATRIX_TIMEOUT,
        });
        await expect(page.locator('crczp-mitre-techniques').getByText(title)).toHaveCount(0);
    });

    test('is reached from the MITRE ATT&CK Techniques control of the definition overview', async ({ page }) => {
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        await overview.mitreButton.click();
        await expect(page).toHaveURL(/\/mitre-techniques$/);
        await expect(pageTitle(page)).toHaveText('MITRE ATT&CK Techniques');
    });

    test('explains a failed matrix request without the request address and stops the spinner', async ({
        page,
        checkpoint,
    }) => {
        await page.route('**/mitre-matrix-visualisation*', (route) =>
            route.fulfill({ status: 500, contentType: 'text/plain', body: 'matrix unavailable' }),
        );
        await page.goto('/mitre-techniques');
        await expect(errorDialog(page)).toBeVisible({ timeout: MATRIX_TIMEOUT });
        await checkpoint(page, 'matrix request failed');
        await expect(errorDialog(page)).not.toContainText(/https?:\/\//);
        await dismissErrorDialog(page);
        await expect(page.locator('crczp-mitre-techniques crczp-logo-spinner')).toHaveCount(0);
    });
});
