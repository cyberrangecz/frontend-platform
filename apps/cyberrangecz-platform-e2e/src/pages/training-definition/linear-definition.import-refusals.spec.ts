import type { Page } from '@playwright/test';
import { ApiError, type Api } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    fetchDefinitionByTitle,
    fetchDefinitionDetailByTitle,
} from '../../support/pages/training-definition/training-definition-data';
import { trainingImportWithoutAttachments } from '../../support/scenario/shared-training-loader';
import { errorDialog, FileUploadDialog } from '../../support/ui';

const IMPORT_HEADLINE = /The training definition could not be imported/;
const ADAPTIVE_DEPRECATION = /Adaptive training has been deprecated in version v2026\.08/;
const UNRECOGNIZED_FIELD_NAME = /Field "name" in the top level of the file is not a recognized field/;
const NOT_A_DEFINITION_FORM = /The submitted content does not have the required form/;
const NO_REQUEST_OBSERVATION_MILLISECONDS = 1_000;
const IMPORT_PATH = '/imports/training-definitions';

/** A trimmed adaptive definition document holding one phase of each type, as the adaptive demo library ships it. */
function adaptiveDocument(title: string) {
    return {
        title,
        description: 'Adaptive demo content',
        prerequisites: [],
        outcomes: ['Scanning ports with nmap'],
        state: 'UNRELEASED',
        estimated_duration: 10,
        phases: [
            { title: 'Info', phase_type: 'INFO', order: 0, content: '# Demo summary' },
            {
                title: 'Pre-game assessment',
                phase_type: 'QUESTIONNAIRE',
                order: 1,
                questionnaire_type: 'ADAPTIVE',
                questions: [
                    {
                        order: 0,
                        text: 'What is your level of skill in zip and unzip files in CLI?',
                        question_type: 'RFQ',
                        choices: [
                            { text: 'High', correct: true, order: 0 },
                            { text: 'None', correct: false, order: 1 },
                        ],
                    },
                ],
                phase_relations: [{ order: 0, question_orders: [0], success_rate: 50, phase_order: 3 }],
            },
            {
                title: 'Get access',
                phase_type: 'ACCESS',
                order: 2,
                passkey: 'start',
                cloud_content: 'Access the sandbox',
                local_content: 'Start the local sandbox',
            },
            {
                title: 'Finding open ports',
                phase_type: 'TRAINING',
                order: 3,
                estimated_duration: 10,
                allowed_commands: 0,
                allowed_wrong_answers: 10,
                tasks: [
                    {
                        title: 'Finding open ports',
                        order: 0,
                        content: 'Find the open ports',
                        answer: 'open',
                        incorrect_answer_limit: 5,
                        solution: 'Run nmap',
                    },
                ],
                decision_matrix: [],
                mitre_techniques: [],
                expected_commands: ['nmap'],
            },
        ],
    } satisfies Record<string, unknown>;
}

/** A document that passes the import dialog's preview and carries one extra field at the root. */
function documentWithUnknownRootField(title: string) {
    return { ...trainingImportWithoutAttachments(title), unknown_root_field: 'x' } satisfies Record<string, unknown>;
}

/** A document that passes the import dialog's preview and carries one extra field on its level. */
function documentWithUnknownLevelField(title: string) {
    return {
        ...trainingImportWithoutAttachments(title),
        levels: [
            { level_type: 'INFO_LEVEL', title: 'Briefing', estimated_duration: 1, content: 'x', unknown_level_field: 1 },
        ],
    } satisfies Record<string, unknown>;
}

/** A document that passes the import dialog's preview and gives a text where a level expects a whole number. */
function documentWithWrongValueType(title: string) {
    return {
        ...trainingImportWithoutAttachments(title),
        levels: [
            {
                level_type: 'TRAINING_LEVEL',
                title: 'Flag',
                estimated_duration: 5,
                content: 'x',
                solution: 'x',
                answer: 'flag',
                incorrect_answer_limit: 'many',
            },
        ],
    } satisfies Record<string, unknown>;
}

/** Asserts an import answered 400 with an error message matching every given rule. */
async function expectRefusal(attempt: Promise<unknown>, ...reasons: RegExp[]): Promise<void> {
    const refusal = await attempt.then(
        () => undefined,
        (error: unknown) => error,
    );
    if (!(refusal instanceof ApiError)) {
        throw new Error('the import is refused');
    }
    expect(refusal.status).toBe(400);
    const { message } = JSON.parse(refusal.responseBody) as { message: string };
    for (const reason of reasons) {
        expect(message).toMatch(reason);
    }
}

async function expectNothingStored(api: Api, title: string): Promise<void> {
    expect(await fetchDefinitionByTitle(api, title)).toBeUndefined();
}

test.describe('linear-definition.import-refusals', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('API', () => {
        test('refuses an adaptive definition as deprecated and stores nothing', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-adaptive');
            await expectRefusal(
                api.training.post(IMPORT_PATH, adaptiveDocument(title)),
                IMPORT_HEADLINE,
                ADAPTIVE_DEPRECATION,
            );
            await expectNothingStored(api, title);
        });

        test('refuses an unknown root field by naming it and stores nothing', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-root-field');
            await expectRefusal(
                api.training.post(IMPORT_PATH, documentWithUnknownRootField(title)),
                IMPORT_HEADLINE,
                /unknown_root_field/,
            );
            await expectNothingStored(api, title);
        });

        test('refuses an unknown level field by naming it and stores nothing', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-level-field');
            await expectRefusal(
                api.training.post(IMPORT_PATH, documentWithUnknownLevelField(title)),
                IMPORT_HEADLINE,
                /unknown_level_field/,
            );
            await expectNothingStored(api, title);
        });

        test('refuses a wrong value type by naming the field and stores nothing', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-wrong-type');
            await expectRefusal(
                api.training.post(IMPORT_PATH, documentWithWrongValueType(title)),
                IMPORT_HEADLINE,
                /incorrect_answer_limit/,
            );
            await expectNothingStored(api, title);
        });

        test('refuses a JSON object with unrelated keys by naming the first one and stores nothing', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-unrelated-keys');
            await expectRefusal(
                api.training.post(IMPORT_PATH, { title, name: 'not a definition', items: [1, 2, 3] }),
                IMPORT_HEADLINE,
                UNRECOGNIZED_FIELD_NAME,
            );
            await expectNothingStored(api, title);
        });

        test('refuses a JSON array as not having the required form', async ({ apiAs }) => {
            await expectRefusal(
                apiAs('trainingDesigner').training.post(IMPORT_PATH, [{ title: 'in a list' }]),
                IMPORT_HEADLINE,
                NOT_A_DEFINITION_FORM,
            );
        });

        test('imports a definition carrying the tolerated legacy fields', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('refusal-legacy-fields');
            const document = {
                ...trainingImportWithoutAttachments(title),
                starting_level: 0,
                prerequisities: ['A terminal'],
                levels: [
                    {
                        id: 1,
                        max_score: 0,
                        level_type: 'INFO_LEVEL',
                        title: 'Briefing',
                        estimated_duration: 1,
                        content: 'legacy shaped',
                    },
                ],
            };
            await api.training.post(IMPORT_PATH, document);
            const stored = await fetchDefinitionDetailByTitle(api, title);
            expect(stored.levels?.map((level) => level.title)).toEqual(['Briefing']);
        });
    });

    test.describe('import dialog', () => {
        async function openDialog(page: Page): Promise<FileUploadDialog> {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            return new FileUploadDialog(page);
        }

        function recordImportRequests(page: Page): string[] {
            const importRequests: string[] = [];
            page.on('request', (request) => {
                if (request.method() === 'POST' && request.url().includes(IMPORT_PATH)) {
                    importRequests.push(request.url());
                }
            });
            return importRequests;
        }

        test('rejects an adaptive definition file as deprecated and sends nothing', async ({ page, uniqueName }) => {
            const importRequests = recordImportRequests(page);
            const dialog = await openDialog(page);
            await dialog.chooseFiles({
                name: 'adaptive.json',
                mimeType: 'application/json',
                buffer: Buffer.from(JSON.stringify(adaptiveDocument(uniqueName('refusal-ui-adaptive')))),
            });
            await expect(dialog.rejections).toHaveText(ADAPTIVE_DEPRECATION);
            await expect(dialog.definitionCards).toHaveCount(0);
            await expect(dialog.confirmButton).toBeDisabled();
            await page.waitForTimeout(NO_REQUEST_OBSERVATION_MILLISECONDS);
            expect(importRequests, 'no import request was sent').toHaveLength(0);
        });

        const serverRefusals = [
            {
                name: 'an unknown root field',
                document: documentWithUnknownRootField,
                field: /unknown_root_field/,
            },
            {
                name: 'an unknown level field',
                document: documentWithUnknownLevelField,
                field: /unknown_level_field/,
            },
            {
                name: 'a wrong value type',
                document: documentWithWrongValueType,
                field: /incorrect_answer_limit/,
            },
        ];
        for (const { name, document, field } of serverRefusals) {
            test(`shows the server's line naming the problem for a file with ${name} and stores nothing`, async ({
                page,
                apiAs,
                uniqueName,
            }) => {
                const title = uniqueName('refusal-ui-server');
                const dialog = await openDialog(page);
                await dialog.chooseFiles({
                    name: `${title}.json`,
                    mimeType: 'application/json',
                    buffer: Buffer.from(JSON.stringify(document(title))),
                });
                await expect(dialog.definitionCards).toHaveCount(1);
                await expect(dialog.rejections).toHaveCount(0);
                await dialog.confirmButton.click();

                const errors = errorDialog(page);
                await expect(errors).toBeVisible();
                await expect(errors).toContainText(`Uploading training definition ${title}.json`);
                await expect(errors).toContainText(IMPORT_HEADLINE);
                await expect(errors).toContainText(field);
                await expectNothingStored(apiAs('trainingDesigner'), title);
            });
        }
    });
});
