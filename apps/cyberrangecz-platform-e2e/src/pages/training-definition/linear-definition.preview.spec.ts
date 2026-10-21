import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    sharedTrainingImport,
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
} from '../../support/scenario/shared-training-loader';
import {
    createEmptyDefinition,
    importDefinitionBody,
    importFullDefinition,
} from '../../support/pages/training-definition/training-definition-data';
import { breadcrumbEntries, waitForPageReady } from '../../support/ui';

const TITLES = SHARED_TRAINING_LEVEL_TITLES;
const SPECIAL_TEXT = 'Žluťoučký kůň <b>x</b>';
const LEVEL_INDEX = {
    info: 0,
    access: 1,
    firstTraining: 2,
    secondTraining: 3,
    variantTraining: 4,
    assessment: 5,
} as const;

async function openPreview(page: Page, definitionId: number): Promise<void> {
    await page.goto(`/linear-definition/${definitionId}/preview`);
    await waitForPageReady(page);
}

function steps(page: Page) {
    return page.locator('sentinel-stepper button');
}

function activeLevel(page: Page) {
    return page.locator('crczp-abstract-level');
}

test.describe('linear-definition.preview', () => {
    test.use({ account: 'trainingDesigner' });

    test('shows the Preview breadcrumb, the stepper hint and one step per level', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-loaded'));
        await openPreview(page, definition.id);
        await expect(breadcrumbEntries(page).last()).toHaveText('Preview');
        await expect(page.getByText('*Use stepper to navigate between levels.')).toBeVisible();
        await expect(steps(page)).toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length);
        await checkpoint(page, 'preview loaded');
    });

    test('opens on the first level', async ({ page, apiAs, uniqueName }) => {
        const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-first'));
        await openPreview(page, definition.id);
        await expect(activeLevel(page).getByRole('heading', { level: 1 })).toHaveText(TITLES.info);
        await expect(activeLevel(page)).toContainText('This training is played by the e2e suite.');
    });

    test('shows the level of each clicked step', async ({ page, apiAs, uniqueName }) => {
        const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-steps'));
        await openPreview(page, definition.id);
        for (const [index, levelTitle] of SHARED_TRAINING_LEVEL_ORDER.entries()) {
            await steps(page).nth(index).click();
            await expect(activeLevel(page).getByRole('heading', { level: 1 })).toHaveText(levelTitle);
        }
        await steps(page).nth(LEVEL_INDEX.info).click();
        await expect(activeLevel(page).getByRole('heading', { level: 1 })).toHaveText(TITLES.info);
    });

    test('shows both contents and the placeholder topology of an access level', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-access'));
        await openPreview(page, definition.id);
        await steps(page).nth(LEVEL_INDEX.access).click();
        const level = activeLevel(page);
        await expect(level.getByRole('heading', { name: 'Local content:' })).toBeVisible();
        await expect(level.getByRole('heading', { name: 'Cloud content:' })).toBeVisible();
        await expect(level).toContainText('Start the local sandbox');
        await expect(level).toContainText('Connect to the sandbox');
        await expect(level.getByRole('img', { name: 'Topology placeholder' })).toBeVisible();
        await checkpoint(page, 'access level preview');
    });

    test('shows content, every hint and the solution of a training level', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-training'));
        await openPreview(page, definition.id);
        await steps(page).nth(LEVEL_INDEX.firstTraining).click();
        const level = activeLevel(page);
        await expect(level).toContainText(`Find the flag of the level "${TITLES.firstTraining}" and submit it.`);
        await expect(level.getByRole('heading', { name: 'Level hints:' })).toBeVisible();
        await expect(level.getByRole('heading', { name: 'Hint 1' })).toBeVisible();
        await expect(level.getByRole('heading', { name: 'Hint 2' })).toBeVisible();
        await expect(level).toContainText('List the home directory.');
        await expect(level).toContainText('The flag sits in flag.txt.');
        await expect(level.getByRole('heading', { name: 'Solution:' })).toBeVisible();
        await expect(level).toContainText('Submit e2e-flag-one.');
        await expect(level.getByRole('img', { name: 'Topology placeholder' })).toBeVisible();
        await checkpoint(page, 'training level preview');
    });

    test.describe('assessment level', () => {
        async function openAssessment(page: Page, definitionId: number): Promise<void> {
            await openPreview(page, definitionId);
            await steps(page).nth(LEVEL_INDEX.assessment).click();
        }

        test('shows the instructions and the three questions numbered', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-assessment'));
            await openAssessment(page, definition.id);
            const level = activeLevel(page);
            await expect(level).toContainText('Answer every question.');
            for (const [index, text] of [
                'Which transport protocol is reliable?',
                'Which protocol gives a remote shell?',
                'Match each port with its protocol.',
            ].entries()) {
                await expect(level).toContainText(`Question ${index + 1}:`);
                await expect(level).toContainText(text);
            }
            await expect(level.getByText('Answer required')).toHaveCount(3);
            await checkpoint(page, 'assessment preview');
        });

        test('types an answer into a free form question and clears it with the clear button', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-ffq'));
            await openAssessment(page, definition.id);
            const answer = activeLevel(page).getByRole('textbox', { name: 'Answer' });
            await expect(activeLevel(page).getByRole('button', { name: 'Clear' })).toHaveCount(0);
            await answer.fill('tcp');
            await expect(answer).toHaveValue('tcp');
            await activeLevel(page).getByRole('button', { name: 'Clear' }).click();
            await expect(answer).toHaveValue('');
            await expect(activeLevel(page).getByRole('button', { name: 'Clear' })).toHaveCount(0);
        });

        test('keeps special characters of a typed answer as literal text', async ({ page, apiAs, uniqueName }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-ffq-special'));
            await openAssessment(page, definition.id);
            const answer = activeLevel(page).getByRole('textbox', { name: 'Answer' });
            await answer.fill(SPECIAL_TEXT);
            await expect(answer).toHaveValue(SPECIAL_TEXT);
            await expect(activeLevel(page).locator('mat-form-field b')).toHaveCount(0);
        });

        test('toggles the choices of a multiple choice question independently', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-mcq'));
            await openAssessment(page, definition.id);
            const choices = activeLevel(page).getByRole('checkbox');
            await expect(choices).toHaveCount(3);
            await choices.nth(0).check();
            await choices.nth(2).check();
            await expect(choices.nth(0)).toBeChecked();
            await expect(choices.nth(1)).not.toBeChecked();
            await expect(choices.nth(2)).toBeChecked();
            await choices.nth(0).uncheck();
            await expect(choices.nth(0)).not.toBeChecked();
        });

        test('matches each statement of an extended matching question to one option', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-emi'));
            await openAssessment(page, definition.id);
            const radios = activeLevel(page).getByRole('radio');
            await expect(radios).toHaveCount(4);
            await radios.nth(0).check();
            await radios.nth(3).check();
            await expect(radios.nth(0)).toBeChecked();
            await expect(radios.nth(3)).toBeChecked();
            await radios.nth(1).check();
            await expect(radios.nth(1)).toBeChecked();
            await expect(radios.nth(0)).not.toBeChecked();
        });

        test('keeps the choices of a question unchanged after switching to another level and back', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await importFullDefinition(apiAs('trainingDesigner'), uniqueName('preview-return'));
            await openAssessment(page, definition.id);
            await steps(page).nth(LEVEL_INDEX.info).click();
            await steps(page).nth(LEVEL_INDEX.assessment).click();
            await expect(activeLevel(page).getByRole('checkbox')).toHaveCount(3);
        });
    });

    test('shows a level title with special characters as literal text', async ({ page, apiAs, uniqueName }) => {
        const body = sharedTrainingImport(uniqueName('preview-special'));
        const specialBody = {
            ...body,
            levels: body.levels.map((level) =>
                level.level_type === 'INFO_LEVEL' ? { ...level, title: SPECIAL_TEXT } : level,
            ),
        };
        const definition = await importDefinitionBody(apiAs('trainingDesigner'), specialBody);
        await openPreview(page, definition.id);
        const heading = activeLevel(page).getByRole('heading', { level: 1 });
        await expect(heading).toHaveText(SPECIAL_TEXT);
        await expect(heading.locator('b')).toHaveCount(0);
    });

    test('states that a definition without levels has nothing to preview', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('preview-empty'));
        await openPreview(page, definition.id);
        await expect(page.getByText('There are no levels in this training definition')).toBeVisible();
        await expect(steps(page)).toHaveCount(0);
        await checkpoint(page, 'empty preview');
    });

    test.describe('access by role', () => {
        for (const role of ['trainingOrganizer', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-definition/:id/preview`, async ({ openAs, shared }) => {
                await expectRedirectedAway(openAs, role, `/linear-definition/${shared.trainingDefinition.id}/preview`);
            });
        }
    });
});
