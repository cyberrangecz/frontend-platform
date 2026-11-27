import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import {
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
} from '../../support/scenario/shared-training-loader';
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
    const label = scope
        .page()
        .locator('.key-field, .icon-label')
        .filter({ hasText: key });
    return scope.locator('.data-field').filter({ has: label }).first();
}

test.describe('linear-definition.detail', () => {
    test.use({ account: 'trainingDesigner' });

    test('checks the detail page of a full definition', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const title = uniqueName('detail-full');
        const definition = await importFullDefinition(
            apiAs('trainingDesigner'),
            title,
        );
        await openDetail(page, definition.id);
        const info = page.locator('crczp-training-definition-info');
        const levels = page.locator('crczp-training-definition-levels');
        const headers = page.locator(
            'crczp-level-detail mat-expansion-panel-header',
        );

        await test.step('shows the page title, breadcrumbs, title, description, level count, duration and state', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toContainText(`Detail of ${title}`);
            await expect
                .soft(
                    breadcrumbLink(page, 'Training Definitions'),
                    'breadcrumb',
                )
                .toBeVisible();
            await expect
                .soft(info.getByRole('heading', { level: 2 }), 'title heading')
                .toHaveText(title);
            await expect
                .soft(info, 'description')
                .toContainText(
                    'Shared training definition of the e2e suite run.',
                );
            await expect
                .soft(dataField(info, 'Number of Levels'), 'level count')
                .toContainText('6');
            await expect
                .soft(dataField(info, 'Estimated Duration'), 'duration')
                .toContainText(/\d+/);
            await expect
                .soft(dataField(info, 'State'), 'state')
                .toContainText(/unreleased/i);
            await expect
                .soft(dataField(info, 'Last Edited'), 'last edit')
                .toContainText(/\d/);
            await checkpoint(page, 'detail loaded');
        });

        await test.step('shows the notes and learning outcomes after the Notes panel is expanded', async () => {
            const header = expansionPanelHeader(page, 'Notes');
            await expect
                .soft(header, 'Notes panel starts collapsed')
                .toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect
                .soft(header, 'Notes panel expanded')
                .toHaveAttribute('aria-expanded', 'true');
            await expect
                .soft(info.getByText('Instructor notes'), 'notes heading')
                .toBeVisible();
            await expect
                .soft(info.getByText('A terminal'), 'note text')
                .toBeVisible();
            await expect
                .soft(info.getByText('Learning outcomes'), 'outcomes heading')
                .toBeVisible();
            await expect
                .soft(info.getByText('A finished training run'), 'outcome text')
                .toBeVisible();
            await header.click();
            await expect
                .soft(header, 'Notes panel collapsed again')
                .toHaveAttribute('aria-expanded', 'false');
        });

        await test.step('counts the levels of each type', async () => {
            await expect
                .soft(
                    levels.getByRole('heading', {
                        name: 'Levels',
                        exact: true,
                    }),
                    'levels heading',
                )
                .toBeVisible();
            await expect
                .soft(levels.locator('.level-count'), 'level counts')
                .toHaveText(['1', '1', '3', '1']);
        });

        await test.step('lists the levels numbered in order with their titles', async () => {
            const levelHeadings = page.locator(
                'crczp-level-detail mat-expansion-panel-header h3',
            );
            await expect
                .soft(levelHeadings, 'level panel count')
                .toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length);
            for (const [
                index,
                levelTitle,
            ] of SHARED_TRAINING_LEVEL_ORDER.entries()) {
                await expect
                    .soft(
                        levelHeadings.nth(index),
                        `number of level ${index + 1}`,
                    )
                    .toContainText(`${index + 1}.`);
                await expect
                    .soft(
                        levelHeadings.nth(index),
                        `title of level ${index + 1}`,
                    )
                    .toContainText(levelTitle);
            }
            await checkpoint(page, 'levels listed');
        });

        await test.step('expands and collapses a single level panel', async () => {
            const panel = levelPanel(page, new RegExp(TITLES.info));
            const header = panel.locator('mat-expansion-panel-header');
            await expect
                .soft(header, 'panel starts collapsed')
                .toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect
                .soft(header, 'panel expanded')
                .toHaveAttribute('aria-expanded', 'true');
            await expect
                .soft(panel, 'info content')
                .toContainText('This training is played by the e2e suite.');
            await header.click();
            await expect
                .soft(header, 'panel collapsed again')
                .toHaveAttribute('aria-expanded', 'false');
        });

        await test.step('shows the passkey and both contents of an access level', async () => {
            const panel = levelPanel(page, new RegExp(TITLES.access));
            await panel.locator('mat-expansion-panel-header').click();
            await expect
                .soft(dataField(panel, 'Passkey'), 'passkey')
                .toContainText('e2e-access');
            await expect
                .soft(dataField(panel, 'Cloud Content'), 'cloud content')
                .toContainText('Connect to the sandbox');
            await expect
                .soft(dataField(panel, 'Local Content'), 'local content')
                .toContainText('Start the local sandbox');
        });

        await test.step('shows the scoring, answer, hints and solution of a training level', async () => {
            const panel = levelPanel(page, new RegExp(TITLES.firstTraining));
            await panel.locator('mat-expansion-panel-header').click();
            await expect
                .soft(dataField(panel, 'Answer:'), 'answer')
                .toContainText('e2e-flag-one');
            await expect
                .soft(dataField(panel, 'Points'), 'points')
                .toContainText('20');
            await expect
                .soft(
                    dataField(panel, 'Incorrect Answer Limit'),
                    'incorrect answer limit',
                )
                .toContainText('5');
            await expect
                .soft(
                    dataField(panel, 'Solution reveal grants 0 points'),
                    'solution reveal',
                )
                .toContainText(/true/i);
            await expect.soft(panel, 'first hint').toContainText('Look around');
            await expect
                .soft(panel, 'second hint')
                .toContainText('Read the file');
            await expect
                .soft(panel, 'solution')
                .toContainText('Submit e2e-flag-one.');
            await expect
                .soft(
                    dataField(panel, 'MITRE ATT&CK Techniques'),
                    'techniques field',
                )
                .toBeVisible();
        });

        await test.step('shows the type, instructions and every question of an assessment level', async () => {
            const panel = levelPanel(page, new RegExp(TITLES.assessment));
            await panel.locator('mat-expansion-panel-header').click();
            await expect
                .soft(dataField(panel, 'Type'), 'assessment type')
                .toContainText(/test/i);
            await expect
                .soft(dataField(panel, 'Questions count'), 'question count')
                .toContainText('3');
            await expect
                .soft(dataField(panel, 'Instructions'), 'instructions')
                .toContainText('Answer every question.');
            await expect
                .soft(panel, 'free form question')
                .toContainText('Which transport protocol is reliable?');
            await expect.soft(panel, 'accepted answer').toContainText('tcp');
            await expect
                .soft(panel, 'multiple choice question')
                .toContainText('Which protocol gives a remote shell?');
            for (const choice of ['SSH', 'DNS', 'NTP']) {
                await expect
                    .soft(panel.getByText(choice).first(), `choice ${choice}`)
                    .toBeVisible();
            }
            await expect
                .soft(panel, 'matching question')
                .toContainText('Match each port with its protocol.');
            await expect
                .soft(panel, 'first statement')
                .toContainText('Port 22');
            await expect
                .soft(panel, 'second statement')
                .toContainText('Port 80');
            await checkpoint(page, 'assessment level detail');
        });

        await test.step('expands every level panel with Expand All and collapses them with Collapse All', async () => {
            await control(page, 'Expand All').click();
            for (const header of await headers.all()) {
                await expect
                    .soft(header, 'panel expanded by Expand All')
                    .toHaveAttribute('aria-expanded', 'true');
            }
            await checkpoint(page, 'all levels expanded');
            await control(page, 'Collapse All').click();
            for (const header of await headers.all()) {
                await expect
                    .soft(header, 'panel collapsed by Collapse All')
                    .toHaveAttribute('aria-expanded', 'false');
            }
        });
    });

    test('checks the detail page of an empty definition with special characters', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const title = `${SPECIAL_TEXT} ${uniqueName('detail-special')}`;
        const definition = await createEmptyDefinition(
            apiAs('trainingDesigner'),
            title,
            {
                description: SPECIAL_TEXT,
            },
        );
        await openDetail(page, definition.id);
        const info = page.locator('crczp-training-definition-info');

        await test.step('keeps special characters of title and description as literal text', async () => {
            await expect
                .soft(info.getByRole('heading', { level: 2 }), 'title heading')
                .toHaveText(title);
            await expect
                .soft(info, 'description text')
                .toContainText(SPECIAL_TEXT);
            await expect
                .soft(info.locator('b'), 'no bold element')
                .toHaveCount(0);
        });

        await test.step('shows when the definition was last edited as a date and time', async () => {
            await expect
                .soft(dataField(info, 'Last Edited'), 'last edit')
                .toContainText(/\d{1,2} \w{3} \d{4} \d{1,2}:\d{2}/);
        });

        await test.step('states that there are no notes and no outcomes when none were entered', async () => {
            await expansionPanelHeader(page, 'Notes').click();
            await expect
                .soft(info.getByText('There are no notes'), 'no notes text')
                .toBeVisible();
            await expect
                .soft(
                    info.getByText('There are no outcomes'),
                    'no outcomes text',
                )
                .toBeVisible();
        });

        await test.step('lists no level panel for a definition without levels', async () => {
            await expect
                .soft(page.locator('crczp-level-detail'), 'level panels')
                .toHaveCount(0);
            await expect
                .soft(
                    page.locator(
                        'crczp-training-definition-levels .level-count',
                    ),
                    'level counts',
                )
                .toHaveText(['0', '0', '0', '0']);
        });
    });
});
