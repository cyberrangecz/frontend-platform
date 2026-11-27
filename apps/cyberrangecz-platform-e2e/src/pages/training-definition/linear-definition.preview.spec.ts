import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
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

    test('checks the preview of a full definition', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const definition = await importFullDefinition(
            apiAs('trainingDesigner'),
            uniqueName('preview-full'),
        );
        await openPreview(page, definition.id);
        const level = activeLevel(page);
        const levelHeading = level.getByRole('heading', { level: 1 });
        const topologyPlaceholder = level.getByRole('img', {
            name: 'Topology placeholder',
        });

        await test.step('shows the Preview breadcrumb, the stepper hint and one step per level', async () => {
            await expect
                .soft(breadcrumbEntries(page).last(), 'last breadcrumb')
                .toHaveText('Preview');
            await expect
                .soft(
                    page.getByText('*Use stepper to navigate between levels.'),
                    'stepper hint',
                )
                .toBeVisible();
            await expect
                .soft(steps(page), 'step count')
                .toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length);
            await checkpoint(page, 'preview loaded');
        });

        await test.step('opens on the first level', async () => {
            await expect
                .soft(levelHeading, 'first level title')
                .toHaveText(TITLES.info);
            await expect
                .soft(level, 'first level content')
                .toContainText('This training is played by the e2e suite.');
        });

        await test.step('shows the level of each clicked step', async () => {
            for (const [
                index,
                levelTitle,
            ] of SHARED_TRAINING_LEVEL_ORDER.entries()) {
                await steps(page).nth(index).click();
                await expect
                    .soft(levelHeading, `title of step ${index + 1}`)
                    .toHaveText(levelTitle);
            }
            await steps(page).nth(LEVEL_INDEX.info).click();
            await expect
                .soft(levelHeading, 'title after returning to the first step')
                .toHaveText(TITLES.info);
        });

        await test.step('shows both contents and the placeholder topology of an access level', async () => {
            await steps(page).nth(LEVEL_INDEX.access).click();
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Local content:' }),
                    'local content heading',
                )
                .toBeVisible();
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Cloud content:' }),
                    'cloud content heading',
                )
                .toBeVisible();
            await expect
                .soft(level, 'local content')
                .toContainText('Start the local sandbox');
            await expect
                .soft(level, 'cloud content')
                .toContainText('Connect to the sandbox');
            await expect
                .soft(topologyPlaceholder, 'topology placeholder')
                .toBeVisible();
            await checkpoint(page, 'access level preview');
        });

        await test.step('shows content, every hint and the solution of a training level', async () => {
            await steps(page).nth(LEVEL_INDEX.firstTraining).click();
            await expect
                .soft(level, 'level content')
                .toContainText(
                    `Find the flag of the level "${TITLES.firstTraining}" and submit it.`,
                );
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Level hints:' }),
                    'hints heading',
                )
                .toBeVisible();
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Hint 1' }),
                    'first hint heading',
                )
                .toBeVisible();
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Hint 2' }),
                    'second hint heading',
                )
                .toBeVisible();
            await expect
                .soft(level, 'first hint')
                .toContainText('List the home directory.');
            await expect
                .soft(level, 'second hint')
                .toContainText('The flag sits in flag.txt.');
            await expect
                .soft(
                    level.getByRole('heading', { name: 'Solution:' }),
                    'solution heading',
                )
                .toBeVisible();
            await expect
                .soft(level, 'solution')
                .toContainText('Submit e2e-flag-one.');
            await expect
                .soft(topologyPlaceholder, 'topology placeholder')
                .toBeVisible();
            await checkpoint(page, 'training level preview');
        });

        await steps(page).nth(LEVEL_INDEX.assessment).click();
        const freeFormAnswer = level.getByRole('textbox', { name: 'Answer' });
        const clearButton = level.getByRole('button', { name: 'Clear' });
        const choices = level.getByRole('checkbox');
        const radios = level.getByRole('radio');

        await test.step('shows the instructions and the three questions numbered', async () => {
            await expect
                .soft(level, 'instructions')
                .toContainText('Answer every question.');
            for (const [index, text] of [
                'Which transport protocol is reliable?',
                'Which protocol gives a remote shell?',
                'Match each port with its protocol.',
            ].entries()) {
                await expect
                    .soft(level, `number of question ${index + 1}`)
                    .toContainText(`Question ${index + 1}:`);
                await expect
                    .soft(level, `text of question ${index + 1}`)
                    .toContainText(text);
            }
            await expect
                .soft(level.getByText('Answer required'), 'required marks')
                .toHaveCount(3);
            await checkpoint(page, 'assessment preview');
        });

        await test.step('types an answer into a free form question and clears it with the clear button', async () => {
            await expect
                .soft(clearButton, 'no clear button on an empty answer')
                .toHaveCount(0);
            await freeFormAnswer.fill('tcp');
            await expect
                .soft(freeFormAnswer, 'typed answer')
                .toHaveValue('tcp');
            await clearButton.click();
            await expect.soft(freeFormAnswer, 'cleared answer').toHaveValue('');
            await expect
                .soft(clearButton, 'no clear button after clearing')
                .toHaveCount(0);
        });

        await test.step('keeps special characters of a typed answer as literal text', async () => {
            await freeFormAnswer.fill(SPECIAL_TEXT);
            await expect
                .soft(freeFormAnswer, 'typed special answer')
                .toHaveValue(SPECIAL_TEXT);
            await expect
                .soft(level.locator('mat-form-field b'), 'no bold element')
                .toHaveCount(0);
        });

        await test.step('toggles the choices of a multiple choice question independently', async () => {
            await expect.soft(choices, 'choice count').toHaveCount(3);
            await choices.nth(0).check();
            await choices.nth(2).check();
            await expect
                .soft(choices.nth(0), 'first choice checked')
                .toBeChecked();
            await expect
                .soft(choices.nth(1), 'second choice unchecked')
                .not.toBeChecked();
            await expect
                .soft(choices.nth(2), 'third choice checked')
                .toBeChecked();
            await choices.nth(0).uncheck();
            await expect
                .soft(choices.nth(0), 'first choice unchecked')
                .not.toBeChecked();
        });

        await test.step('matches each statement of an extended matching question to one option', async () => {
            await expect.soft(radios, 'radio count').toHaveCount(4);
            await radios.nth(0).check();
            await radios.nth(3).check();
            await expect
                .soft(radios.nth(0), 'first radio checked')
                .toBeChecked();
            await expect
                .soft(radios.nth(3), 'fourth radio checked')
                .toBeChecked();
            await radios.nth(1).check();
            await expect
                .soft(radios.nth(1), 'second radio checked')
                .toBeChecked();
            await expect
                .soft(radios.nth(0), 'first radio unchecked by the second')
                .not.toBeChecked();
        });

        await test.step('keeps the choices of a question unchanged after switching to another level and back', async () => {
            await steps(page).nth(LEVEL_INDEX.info).click();
            await steps(page).nth(LEVEL_INDEX.assessment).click();
            await expect
                .soft(choices, 'choice count after switching back')
                .toHaveCount(3);
            await expect
                .soft(choices.nth(0), 'first choice after switching back')
                .not.toBeChecked();
            await expect
                .soft(choices.nth(2), 'third choice after switching back')
                .toBeChecked();
        });
    });

    test('shows a level title with special characters as literal text', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const body = sharedTrainingImport(uniqueName('preview-special'));
        const specialBody = {
            ...body,
            levels: body.levels.map((level) =>
                level.level_type === 'INFO_LEVEL'
                    ? { ...level, title: SPECIAL_TEXT }
                    : level,
            ),
        };
        const definition = await importDefinitionBody(
            apiAs('trainingDesigner'),
            specialBody,
        );
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
        const definition = await createEmptyDefinition(
            apiAs('trainingDesigner'),
            uniqueName('preview-empty'),
        );
        await openPreview(page, definition.id);
        await expect(
            page.getByText('There are no levels in this training definition'),
        ).toBeVisible();
        await expect(steps(page)).toHaveCount(0);
        await checkpoint(page, 'empty preview');
    });
});
