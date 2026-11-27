import { expect, test } from '../../support/fixtures';
import {
    createEmptyDefinition,
    definitionWithTechnique,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import {
    breadcrumbEntries,
    dismissErrorDialog,
    errorDialog,
    pageTitle,
} from '../../support/ui';

const MATRIX_TIMEOUT = 30_000;

test.describe('mitre-techniques', () => {
    test.use({ account: 'trainingDesigner' });

    test('checks the MITRE ATT&CK Techniques page on one matrix load', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const api = apiAs('trainingDesigner');
        const usedTitle = uniqueName('mitre-legend');
        const usedDefinition = await importDefinitionBody(
            api,
            definitionWithTechnique(usedTitle, 'TA0009.T1005'),
        );
        await api.training.put(
            `/training-definitions/${usedDefinition.id}/states/RELEASED`,
            {},
        );
        const unusedTitle = uniqueName('mitre-no-technique');
        await createEmptyDefinition(api, unusedTitle);
        const matrix = page.locator('crczp-mitre-techniques');
        await page.goto('/mitre-techniques');

        await test.step('shows the page title, breadcrumbs and the matrix description', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toHaveText('MITRE ATT&CK Techniques');
            await expect
                .soft(breadcrumbEntries(page), 'breadcrumbs')
                .toHaveText([/^Home/, 'MITRE ATT&CK Techniques']);
            await expect
                .soft(matrix.locator('.description'), 'matrix description')
                .toContainText(
                    'The MITRE ATT&CK matrix contains a set of techniques',
                );
            await checkpoint(page, 'mitre page');
        });

        await test.step('renders every tactic column of the matrix without an error dialog', async () => {
            for (const tactic of [
                'Reconnaissance',
                'Resource Development',
                'Initial Access',
                'Execution',
                'Persistence',
            ]) {
                await expect
                    .soft(
                        matrix.getByText(tactic, { exact: true }).first(),
                        `tactic column ${tactic}`,
                    )
                    .toBeVisible({ timeout: MATRIX_TIMEOUT });
            }
            await expect
                .soft(matrix.locator('crczp-logo-spinner'), 'no spinner')
                .toHaveCount(0);
            await expect
                .soft(errorDialog(page), 'no error dialog')
                .toHaveCount(0);
            await checkpoint(
                page,
                'matrix rendered',
                'MITRE ATT&CK matrix with one column per tactic, starting with Reconnaissance, Resource Development, Initial Access, Execution and Persistence, each column listing technique cells',
            );
        });

        await test.step('offers no played / all switch to a designer', async () => {
            await expect
                .soft(
                    matrix.getByText('Reconnaissance').first(),
                    'matrix is loaded',
                )
                .toBeVisible({ timeout: MATRIX_TIMEOUT });
            await expect
                .soft(
                    matrix.locator('mat-slide-toggle'),
                    'no played / all switch',
                )
                .toHaveCount(0);
        });

        await test.step('lists a training definition that uses a technique in the matrix legend', async () => {
            await expect
                .soft(
                    matrix
                        .getByText(`${usedTitle} (${usedDefinition.id})`)
                        .first(),
                    'legend entry',
                )
                .toBeAttached({ timeout: MATRIX_TIMEOUT });
            await checkpoint(
                page,
                'legend with the definition',
                `MITRE ATT&CK matrix whose legend lists the training definition '${usedTitle} (${usedDefinition.id})', which uses technique T1005 of tactic TA0009`,
            );
        });

        await test.step('leaves a training definition without techniques out of the matrix legend', async () => {
            await expect
                .soft(
                    matrix.getByText(unusedTitle),
                    'definition without techniques',
                )
                .toHaveCount(0);
        });
    });

    test('explains a failed matrix request without the request address and stops the spinner', async ({
        page,
        checkpoint,
    }) => {
        await page.route('**/mitre-matrix-visualisation*', (route) =>
            route.fulfill({
                status: 500,
                contentType: 'text/plain',
                body: 'matrix unavailable',
            }),
        );
        await page.goto('/mitre-techniques');
        await expect(errorDialog(page)).toBeVisible({
            timeout: MATRIX_TIMEOUT,
        });
        await checkpoint(page, 'matrix request failed');
        await expect(errorDialog(page)).not.toContainText(/https?:\/\//);
        await dismissErrorDialog(page);
        await expect(
            page.locator('crczp-mitre-techniques crczp-logo-spinner'),
        ).toHaveCount(0);
    });
});
