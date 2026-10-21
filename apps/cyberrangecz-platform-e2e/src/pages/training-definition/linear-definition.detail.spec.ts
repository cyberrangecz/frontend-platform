import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { expectRedirectedAway } from '../../support/route-guard';
import { SHARED_TRAINING_LEVEL_ORDER, SHARED_TRAINING_LEVEL_TITLES } from '../../support/scenario/shared-training-loader';
import {
    createEmptyDefinition,
    importFullDefinition,
} from '../../support/pages/training-definition/training-definition-data';
import {
    breadcrumbLink,
    control,
    expansionPanelHeader,
    pageTitle,
    waitForPageReady,
} from '../../support/ui';

const TITLES = SHARED_TRAINING_LEVEL_TITLES;
const SPECIAL_TEXT = 'Žluťoučký kůň <b>x</b>';

async function openDetail(page: Page, definitionId: number): Promise<void> {
    await page.goto(`/linear-definition/${definitionId}/detail`);
    await waitForPageReady(page);
    await page.locator('crczp-training-definition-info').waitFor();
}

function levelPanel(page: Page, heading: string | RegExp): Locator {
    return page.locator('crczp-level-detail mat-expansion-panel').filter({
        has: page.getByRole('heading', { name: heading }),
    });
}

function dataField(scope: Locator, key: string): Locator {
    const label = scope.page().locator('.key-field, .icon-label').filter({ hasText: key });
    return scope.locator('.data-field').filter({ has: label }).first();
}

test.describe('linear-definition.detail', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('definition information', () => {
        test('shows the page title, breadcrumbs, title, description, level count, duration and state', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const title = uniqueName('detail-info');
            const definition = await importFullDefinition(apiAs('trainingDesigner'), title);
            await openDetail(page, definition.id);
            const info = page.locator('crczp-training-definition-info');
            await expect(pageTitle(page)).toContainText(`Detail of ${title}`);
            await expect(breadcrumbLink(page, 'Training Definitions')).toBeVisible();
            await expect(info.getByRole('heading', { level: 2 })).toHaveText(title);
            await expect(info).toContainText('Shared training definition of the e2e suite run.');
            await expect(dataField(info, 'Number of Levels')).toContainText('6');
            await expect(dataField(info, 'Estimated Duration')).toContainText(/\d+/);
            await expect(dataField(info, 'State')).toContainText(/unreleased/i);
            await expect(dataField(info, 'Last Edited')).toContainText(/\d/);
            await checkpoint(page, 'detail loaded');
        });

        test('shows when the definition was last edited as a date and time', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('detail-editor'));
            await openDetail(page, definition.id);
            const info = page.locator('crczp-training-definition-info');
            await expect(dataField(info, 'Last Edited')).toContainText(/\d{1,2} \w{3} \d{4} \d{1,2}:\d{2}/);
        });

        test('keeps special characters of title and description as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const title = `${SPECIAL_TEXT} ${uniqueName('detail-special')}`;
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), title, {
                description: SPECIAL_TEXT,
            });
            await openDetail(page, definition.id);
            const info = page.locator('crczp-training-definition-info');
            await expect(info.getByRole('heading', { level: 2 })).toHaveText(title);
            await expect(info).toContainText(SPECIAL_TEXT);
            await expect(info.locator('b')).toHaveCount(0);
        });

        test('shows the notes and learning outcomes after the Notes panel is expanded', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-notes'));
            await openDetail(page, definition.id);
            const header = expansionPanelHeader(page, 'Notes');
            await expect(header).toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            const info = page.locator('crczp-training-definition-info');
            await expect(info.getByText('Instructor notes')).toBeVisible();
            await expect(info.getByText('A terminal')).toBeVisible();
            await expect(info.getByText('Learning outcomes')).toBeVisible();
            await expect(info.getByText('A finished training run')).toBeVisible();
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
        });

        test('states that there are no notes and no outcomes when none were entered', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('detail-no-notes'));
            await openDetail(page, definition.id);
            await expansionPanelHeader(page, 'Notes').click();
            const info = page.locator('crczp-training-definition-info');
            await expect(info.getByText('There are no notes')).toBeVisible();
            await expect(info.getByText('There are no outcomes')).toBeVisible();
        });
    });

    test.describe('levels', () => {
        test('counts the levels of each type', async ({ page, apiAs, uniqueName }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-counts'));
            await openDetail(page, definition.id);
            const levels = page.locator('crczp-training-definition-levels');
            await expect(levels.getByRole('heading', { name: 'Levels', exact: true })).toBeVisible();
            await expect(levels.locator('.level-count')).toHaveText(['1', '1', '3', '1']);
        });

        test('lists the levels numbered in order with their titles', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-order'));
            await openDetail(page, definition.id);
            const headings = page.locator('crczp-level-detail mat-expansion-panel-header h3');
            await expect(headings).toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length);
            const expected = SHARED_TRAINING_LEVEL_ORDER;
            for (const [index, levelTitle] of expected.entries()) {
                await expect(headings.nth(index)).toContainText(`${index + 1}.`);
                await expect(headings.nth(index)).toContainText(levelTitle);
            }
            await checkpoint(page, 'levels listed');
        });

        test('lists no level panel for a definition without levels', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('detail-no-levels'));
            await openDetail(page, definition.id);
            await expect(page.locator('crczp-level-detail')).toHaveCount(0);
            await expect(page.locator('crczp-training-definition-levels .level-count')).toHaveText(['0', '0', '0', '0']);
        });

        test('expands every level panel with Expand All and collapses them with Collapse All', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-expand-all'));
            await openDetail(page, definition.id);
            const headers = page.locator('crczp-level-detail mat-expansion-panel-header');
            await control(page, 'Expand All').click();
            for (const header of await headers.all()) {
                await expect(header).toHaveAttribute('aria-expanded', 'true');
            }
            await checkpoint(page, 'all levels expanded');
            await control(page, 'Collapse All').click();
            for (const header of await headers.all()) {
                await expect(header).toHaveAttribute('aria-expanded', 'false');
            }
        });

        test('expands and collapses a single level panel', async ({ page, apiAs, uniqueName }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-expand-one'));
            await openDetail(page, definition.id);
            const panel = levelPanel(page, new RegExp(TITLES.info));
            const header = panel.locator('mat-expansion-panel-header');
            await expect(header).toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            await expect(panel).toContainText('This training is played by the e2e suite.');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
        });

        test('shows the passkey and both contents of an access level', async ({ page, apiAs, uniqueName }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-access'));
            await openDetail(page, definition.id);
            const panel = levelPanel(page, new RegExp(TITLES.access));
            await panel.locator('mat-expansion-panel-header').click();
            await expect(dataField(panel, 'Passkey')).toContainText('e2e-access');
            await expect(dataField(panel, 'Cloud Content')).toContainText('Connect to the sandbox');
            await expect(dataField(panel, 'Local Content')).toContainText('Start the local sandbox');
        });

        test('shows the scoring, answer, hints and solution of a training level', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-training'));
            await openDetail(page, definition.id);
            const panel = levelPanel(page, new RegExp(TITLES.firstTraining));
            await panel.locator('mat-expansion-panel-header').click();
            await expect(dataField(panel, 'Answer:')).toContainText('e2e-flag-one');
            await expect(dataField(panel, 'Points')).toContainText('20');
            await expect(dataField(panel, 'Incorrect Answer Limit')).toContainText('5');
            await expect(dataField(panel, 'Solution Penalized')).toContainText(/true/i);
            await expect(panel).toContainText('Look around');
            await expect(panel).toContainText('Read the file');
            await expect(panel).toContainText('Submit e2e-flag-one.');
            await expect(dataField(panel, 'MITRE ATT&CK Techniques')).toBeVisible();
        });

        test('shows the type, instructions and every question of an assessment level', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('detail-assessment'));
            await openDetail(page, definition.id);
            const panel = levelPanel(page, new RegExp(TITLES.assessment));
            await panel.locator('mat-expansion-panel-header').click();
            await expect(dataField(panel, 'Type')).toContainText(/test/i);
            await expect(dataField(panel, 'Questions count')).toContainText('3');
            await expect(dataField(panel, 'Instructions')).toContainText('Answer every question.');
            await expect(panel).toContainText('Which transport protocol is reliable?');
            await expect(panel).toContainText('tcp');
            await expect(panel).toContainText('Which protocol gives a remote shell?');
            for (const choice of ['SSH', 'DNS', 'NTP']) {
                await expect(panel.getByText(choice).first()).toBeVisible();
            }
            await expect(panel).toContainText('Match each port with its protocol.');
            await expect(panel).toContainText('Port 22');
            await expect(panel).toContainText('Port 80');
            await checkpoint(page, 'assessment level detail');
        });
    });

    test.describe('access by role', () => {
        for (const role of ['trainingOrganizer', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-definition/:id/detail`, async ({ openAs, shared }) => {
                await expectRedirectedAway(openAs, role, `/linear-definition/${shared.trainingDefinition.id}/detail`);
            });
        }
    });
});
