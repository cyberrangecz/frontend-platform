import { strToU8 } from 'fflate';
import { type Api, ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    definitionWithInfoLevel,
    exportDefinitionAnswer,
    fetchDefinitionByTitle,
    fetchDefinitionDetailByTitle,
    importDefinitionArchive,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import {
    ATTACHMENT_LIST,
    ATTACHMENTS,
    referencesOf,
    textFixtureNamed,
} from '../../support/scenario/attachment-fixtures';
import {
    archiveEntriesOf,
    ATTACHMENT_FOLDER,
    METADATA_ENTRY,
    withoutEntry,
    ZIP_MEDIA_TYPE,
    zipOf,
} from '../../support/scenario/definition-archive';
import { trainingImportWithoutAttachments } from '../../support/scenario/shared-training-loader';
import {
    dismissErrorDialog,
    errorDialog,
    FileUploadDialog,
    waitForNotification,
} from '../../support/ui';

const MISSING_HASH = '1'.repeat(64);

/** Most entries an archive may hold, as the server and the import dialog both enforce. */
const MAXIMAL_ENTRIES = 1000;

/** Levels of every kind with durations adding up to 170 minutes; a game level counts as a training level. */
const MIXED_LEVELS = [
    {
        level_type: 'INFO_LEVEL',
        title: 'Info one',
        estimated_duration: 30,
        content: 'first',
    },
    {
        level_type: 'INFO_LEVEL',
        title: 'Info two',
        estimated_duration: 45,
        content: 'second',
    },
    {
        level_type: 'ASSESSMENT_LEVEL',
        title: 'Assessment',
        estimated_duration: 60,
    },
    { level_type: 'TRAINING_LEVEL', title: 'Training', estimated_duration: 15 },
    { level_type: 'GAME_LEVEL', title: 'Game', estimated_duration: 20 },
    { level_type: 'ACCESS_LEVEL', title: 'Access', estimated_duration: 0 },
] as const;

/** A document whose own duration disagrees with its levels, which are the only source of the shown duration. */
function mixedLevelsDocument(title: string): Record<string, unknown> {
    return {
        ...definitionWithInfoLevel(title, 'unused'),
        estimated_duration: 9999,
        levels: MIXED_LEVELS,
    };
}

/** A document of one info level lasting the given minutes. */
function documentLasting(
    title: string,
    minutes: number,
): Record<string, unknown> {
    return {
        ...definitionWithInfoLevel(title, 'unused'),
        levels: [
            {
                level_type: 'INFO_LEVEL',
                title: 'Briefing',
                estimated_duration: minutes,
                content: 'x',
            },
        ],
    };
}

/** Asserts an import answered 400 with a reason matching the rule, and that it stored no definition. */
async function expectRefused(
    api: Api,
    title: string,
    attempt: Promise<unknown>,
    reason?: RegExp,
) {
    const error = await attempt.then(
        () => undefined,
        (caught: unknown) => caught,
    );
    expect(error, 'the import is refused').toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    if (reason) {
        expect((error as ApiError).responseBody).toMatch(reason);
    }
    expect(await fetchDefinitionByTitle(api, title)).toBeUndefined();
}

const DOCUMENTS_WITHOUT_EXPECTED_DATA = [
    {
        name: 'without a list of levels',
        document: (title: string) => ({ title, description: 'no levels' }),
        reason: /The file has no list of levels/,
    },
    {
        name: 'with a level of an unknown type',
        document: (title: string) => ({
            title,
            levels: [
                {
                    level_type: 'MYSTERY_LEVEL',
                    title: 'Odd',
                    estimated_duration: 1,
                },
            ],
        }),
        reason: /Level 1 has no known level type/,
    },
    {
        name: 'with a level that has no duration',
        document: (title: string) => ({
            title,
            levels: [
                {
                    level_type: 'INFO_LEVEL',
                    title: 'Fine',
                    estimated_duration: 1,
                    content: 'x',
                },
                { level_type: 'INFO_LEVEL', title: 'Timeless', content: 'x' },
            ],
        }),
        reason: /Level 2 has no estimated duration/,
    },
];

const ARCHIVES_BREAKING_THE_LAYOUT = [
    {
        name: 'more entries than the cap',
        entries: (title: string) => {
            const entries = archiveEntriesOf(
                definitionWithInfoLevel(title, ATTACHMENTS.image.reference),
                [ATTACHMENTS.image],
            );
            const fillerCount =
                MAXIMAL_ENTRIES + 1 - Object.keys(entries).length;
            for (let index = 0; index < fillerCount; index++) {
                entries[`${ATTACHMENT_FOLDER}filler-${index}.txt`] = strToU8(
                    `filler ${index}`,
                );
            }
            return entries;
        },
        reason: /more than 1000 entries/,
    },
    {
        name: '2 entries whose names differ only in case',
        entries: (title: string) => ({
            ...archiveEntriesOf(
                definitionWithInfoLevel(title, ATTACHMENTS.image.reference),
                [ATTACHMENTS.image],
            ),
            [`${ATTACHMENT_FOLDER}DIAGRAM.PNG`]: strToU8(
                'same name in another case',
            ),
        }),
        reason: /has the entry ".+" twice/,
    },
    {
        name: 'several definition documents at its root',
        entries: (title: string) => ({
            ...archiveEntriesOf(
                definitionWithInfoLevel(title, ATTACHMENTS.image.reference),
                [ATTACHMENTS.image],
            ),
            [`${title}-second.json`]: strToU8(
                JSON.stringify(definitionWithInfoLevel(`${title}-second`, 'x')),
            ),
        }),
        reason: /more than 1 definition document/,
    },
];

test.describe('linear-definition.archive', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('export', { tag: '@api' }, () => {
        test('answers a ZIP laid out as the export format when the definition has files', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-export-zip');
            const clashing = textFixtureNamed(
                ATTACHMENTS.image.fileName,
                'a second file named like the image',
            );
            const files = [ATTACHMENTS.image, clashing, ATTACHMENTS.other];
            const definition = await importDefinitionBody(
                api,
                definitionWithInfoLevel(title, referencesOf(files)),
                files,
            );

            const answer = await exportDefinitionAnswer(api, definition.id);
            expect(answer.kind).toBe('zip');
            if (answer.kind !== 'zip') {
                return;
            }
            expect(answer.fileName).toBe(`${title}.zip`);
            expect(Object.keys(answer.archive.entries).sort()).toEqual(
                [
                    `${title}.json`,
                    METADATA_ENTRY,
                    `${ATTACHMENT_FOLDER}diagram (1).png`,
                    `${ATTACHMENT_FOLDER}diagram.png`,
                    `${ATTACHMENT_FOLDER}payload.bin`,
                ].sort(),
            );
            expect(answer.document['title']).toBe(title);
            expect(answer.document).not.toHaveProperty('attachments');
            expect(
                Object.values(answer.archive.metadata)
                    .map(({ fileName }) => fileName)
                    .sort(),
            ).toEqual(['diagram.png', 'diagram.png', 'payload.bin']);
            expect(
                Buffer.from(answer.archive.files['payload.bin']!).equals(
                    ATTACHMENTS.other.bytes,
                ),
            ).toBe(true);
        });

        test('answers plain JSON for a definition without files and imports it back as JSON', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-export-json');
            const source = await importDefinitionBody(
                api,
                trainingImportWithoutAttachments(title),
            );

            const answer = await exportDefinitionAnswer(api, source.id);
            expect(answer.kind).toBe('json');
            expect(answer.document['title']).toBe(title);
            expect(answer.document).not.toHaveProperty('attachments');

            const importedTitle = uniqueName('archive-import-json');
            await importDefinitionBody(api, {
                ...answer.document,
                title: importedTitle,
            });
            const imported = await fetchDefinitionDetailByTitle(
                api,
                importedTitle,
            );
            const original = await fetchDefinitionDetailByTitle(api, title);
            expect(
                imported.levels?.map(({ title: levelTitle }) => levelTitle),
            ).toEqual(
                original.levels?.map(({ title: levelTitle }) => levelTitle),
            );
        });
    });

    test.describe('refused ZIP imports', { tag: '@api' }, () => {
        function validEntries(title: string) {
            return archiveEntriesOf(
                definitionWithInfoLevel(title, ATTACHMENTS.image.reference),
                [ATTACHMENTS.image],
            );
        }

        test('accepts the well-formed archive the refusals below start from', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-valid');
            await importDefinitionArchive(api, zipOf(validEntries(title)));
            expect(await fetchDefinitionByTitle(api, title)).toBeDefined();
        });

        test('refuses an entry whose path escapes the attachments folder', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-escape');
            const entries = {
                ...validEntries(title),
                [`${ATTACHMENT_FOLDER}../../evil.png`]: ATTACHMENTS.image.bytes,
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /nested entry/i,
            );
        });

        test('refuses an archive without attachments.json', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-no-metadata');
            const entries = withoutEntry(validEntries(title), METADATA_ENTRY);
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /attachments\.json/,
            );
        });

        test('refuses a file that attachments.json does not list', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-unlisted');
            const entries = {
                ...validEntries(title),
                [`${ATTACHMENT_FOLDER}extra.txt`]: strToU8('unlisted'),
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /extra\.txt/,
            );
        });

        test('refuses a listed entry that has no file', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-missing-file');
            const entries = withoutEntry(
                validEntries(title),
                `${ATTACHMENT_FOLDER}${ATTACHMENTS.image.fileName}`,
            );
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /name no file/,
            );
        });

        test('refuses a content reference whose file is not in the archive', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-dangling-zip');
            const document = definitionWithInfoLevel(
                title,
                `${ATTACHMENTS.image.reference}\n\n![gone](attachment:${MISSING_HASH})`,
            );
            const entries = archiveEntriesOf(document, [ATTACHMENTS.image]);
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
            );
        });

        test('refuses an archive of more entries than the cap', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-too-many');
            const entries = validEntries(title);
            const fillerCount =
                MAXIMAL_ENTRIES + 1 - Object.keys(entries).length;
            for (let index = 0; index < fillerCount; index++) {
                entries[`${ATTACHMENT_FOLDER}filler-${index}.txt`] = strToU8(
                    `filler ${index}`,
                );
            }
            expect(Object.keys(entries)).toHaveLength(MAXIMAL_ENTRIES + 1);
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /more than 1000 entries/,
            );
        });

        test('refuses 2 entries whose names differ only in case', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-case-clash');
            const entries = {
                ...validEntries(title),
                [`${ATTACHMENT_FOLDER}Diagram.PNG`]: strToU8(
                    'same name in another case',
                ),
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /twice/,
            );
        });

        test('refuses an archive with several definition documents at its root', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-two-documents');
            const otherTitle = uniqueName('archive-two-documents-other');
            const entries = {
                ...validEntries(title),
                [`${otherTitle}.json`]: strToU8(
                    JSON.stringify(
                        definitionWithInfoLevel(otherTitle, 'second'),
                    ),
                ),
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /more than one definition document/,
            );
            expect(
                await fetchDefinitionByTitle(api, otherTitle),
            ).toBeUndefined();
        });

        test('refuses a folder entry', async ({ apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-folder');
            const entries = {
                ...validEntries(title),
                [ATTACHMENT_FOLDER]: new Uint8Array(0),
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /folder entry/,
            );
        });

        test('refuses an unexpected entry at the root', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-unexpected-root');
            const entries = {
                ...validEntries(title),
                'notes.txt': strToU8('not part of the layout'),
            };
            await expectRefused(
                api,
                title,
                importDefinitionArchive(api, zipOf(entries)),
                /unexpected entry/,
            );
        });

        test('refuses a plain JSON import whose content references a file it does not bring', async ({
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('archive-dangling-json');
            const document = definitionWithInfoLevel(
                title,
                `![gone](attachment:${MISSING_HASH})`,
            );
            await expectRefused(
                api,
                title,
                api.training.post('/imports/training-definitions', document),
            );
        });
    });

    test('checks the import dialog preview and its uploads', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const importRequests: string[] = [];
        page.on('request', (request) => {
            if (
                request.method() === 'POST' &&
                request.url().includes('/imports/training-definitions')
            ) {
                importRequests.push(request.url());
            }
        });
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        const dialog = new FileUploadDialog(page);
        const openFreshDialog = async (): Promise<void> => {
            if (await dialog.root.isVisible()) {
                await dialog.cancelButton.click();
                await expect(dialog.root).toBeHidden();
            }
            await overview.uploadButton.click();
            await expect(dialog.root).toBeVisible();
        };
        const expectNoNewImportRequest = (
            importRequestCountBefore: number,
        ): void => {
            expect
                .soft(importRequests, 'import requests sent')
                .toHaveLength(importRequestCountBefore);
        };

        await test.step('shows the level counts per kind, the duration summed from the levels and the format', async () => {
            const title = uniqueName('archive-card-details');
            await openFreshDialog();
            await dialog.chooseFiles({
                name: `${title}.json`,
                mimeType: 'application/json',
                buffer: Buffer.from(JSON.stringify(mixedLevelsDocument(title))),
            });

            const card = dialog.definitionCards.first();
            await expect.soft(card, 'card title').toContainText(title);
            await expect
                .soft(
                    card.locator('.training-definition-import-card-badge'),
                    'format badge',
                )
                .toHaveText(/^JSON · /);
            const expectedCounts = {
                Info: '2',
                Assessment: '1',
                Training: '2',
                Access: '1',
            };
            for (const [label, count] of Object.entries(expectedCounts)) {
                await expect
                    .soft(
                        card
                            .locator('.training-definition-import-card-level')
                            .filter({
                                has: page.locator(
                                    '.training-definition-import-card-level-label',
                                    {
                                        hasText: new RegExp(`^${label}$`),
                                    },
                                ),
                            })
                            .locator(
                                '.training-definition-import-card-level-count',
                            ),
                        `${label} levels`,
                    )
                    .toHaveText(count);
            }
            await expect
                .soft(
                    card.locator('.training-definition-import-card-detail'),
                    'detail rows',
                )
                .toHaveCount(1);
            await expect
                .soft(
                    card.locator(
                        '.training-definition-import-card-detail span',
                    ),
                    'duration',
                )
                .toHaveText('2 h 50 min');
        });

        await test.step('writes the duration in minutes, whole hours, or hours and minutes', async () => {
            await openFreshDialog();
            const expectedDurations = [
                { minutes: 45, text: '45 min' },
                { minutes: 60, text: '1 h' },
                { minutes: 90, text: '1 h 30 min' },
            ];
            for (const { minutes, text } of expectedDurations) {
                const title = uniqueName(`archive-card-duration-${minutes}`);
                await dialog.chooseFiles({
                    name: `${title}.json`,
                    mimeType: 'application/json',
                    buffer: Buffer.from(
                        JSON.stringify(documentLasting(title, minutes)),
                    ),
                });
                const card = dialog.definitionCards.filter({ hasText: title });
                await expect
                    .soft(card, `card of ${minutes} minutes`)
                    .toHaveCount(1);
                await expect
                    .soft(
                        card.locator(
                            '.training-definition-import-card-detail span',
                        ),
                        `duration of ${minutes} minutes`,
                    )
                    .toHaveText(text);
            }
        });

        await test.step('shows the same level counts, the duration and one attachment for a ZIP', async () => {
            const title = uniqueName('archive-card-zip-details');
            const entries = archiveEntriesOf(mixedLevelsDocument(title), [
                ATTACHMENTS.image,
            ]);
            await openFreshDialog();
            await dialog.chooseFiles({
                name: `${title}.zip`,
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf(entries),
            });

            const card = dialog.definitionCards.first();
            await expect
                .soft(
                    card.locator('.training-definition-import-card-badge'),
                    'format badge',
                )
                .toHaveText(/^ZIP · /);
            await expect
                .soft(
                    card.locator(
                        '.training-definition-import-card-level-count',
                    ),
                    'level counts',
                )
                .toHaveText(['2', '1', '2', '1']);
            const details = card.locator(
                '.training-definition-import-card-detail',
            );
            await expect.soft(details, 'detail rows').toHaveCount(2);
            await expect
                .soft(details.first(), 'duration')
                .toContainText('2 h 50 min');
            await expect
                .soft(details.last(), 'attachment summary')
                .toContainText(/^\s*attach_file\s+1 attachment,/);
        });

        for (const {
            name,
            document,
            reason,
        } of DOCUMENTS_WITHOUT_EXPECTED_DATA) {
            await test.step(`rejects a definition file ${name} and uploads nothing`, async () => {
                const importRequestCountBefore = importRequests.length;
                await openFreshDialog();
                await dialog.chooseFiles({
                    name: 'definition.json',
                    mimeType: 'application/json',
                    buffer: Buffer.from(
                        JSON.stringify(
                            document(uniqueName('archive-card-soft')),
                        ),
                    ),
                });
                await expect
                    .soft(dialog.rejections, 'rejection')
                    .toHaveText(reason);
                await expect
                    .soft(dialog.definitionCards, 'cards')
                    .toHaveCount(0);
                await expect
                    .soft(dialog.confirmButton, 'Confirm')
                    .toBeDisabled();
                expectNoNewImportRequest(importRequestCountBefore);
            });
        }

        for (const { name, entries, reason } of ARCHIVES_BREAKING_THE_LAYOUT) {
            await test.step(`rejects a ZIP with ${name} and uploads nothing`, async () => {
                const title = uniqueName('archive-card-layout');
                const importRequestCountBefore = importRequests.length;
                await openFreshDialog();
                await dialog.chooseFiles({
                    name: `${title}.zip`,
                    mimeType: ZIP_MEDIA_TYPE,
                    buffer: zipOf(entries(title)),
                });
                await expect
                    .soft(dialog.rejections, 'rejection')
                    .toHaveText(reason);
                await expect
                    .soft(dialog.definitionCards, 'cards')
                    .toHaveCount(0);
                await expect
                    .soft(dialog.confirmButton, 'Confirm')
                    .toBeDisabled();
                expectNoNewImportRequest(importRequestCountBefore);
            });
        }

        await test.step('replaces the card and the rejection when another file is chosen', async () => {
            const title = uniqueName('archive-card-replaced');
            await openFreshDialog();
            await dialog.chooseFiles({
                name: 'broken.zip',
                mimeType: ZIP_MEDIA_TYPE,
                buffer: Buffer.from('this is not a zip archive'),
            });
            await expect
                .soft(dialog.rejections, 'rejection of the broken file')
                .toHaveCount(1);
            await expect
                .soft(dialog.confirmButton, 'Confirm with a broken file')
                .toBeDisabled();

            await dialog.removeFile('broken.zip');

            await dialog.chooseFiles({
                name: `${title}.zip`,
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf(
                    archiveEntriesOf(
                        definitionWithInfoLevel(
                            title,
                            ATTACHMENTS.image.reference,
                        ),
                        [ATTACHMENTS.image],
                    ),
                ),
            });
            await expect
                .soft(dialog.definitionCards, 'cards after replacing')
                .toHaveCount(1);
            await expect
                .soft(dialog.rejections, 'rejections after replacing')
                .toHaveCount(0);
            await expect
                .soft(dialog.confirmButton, 'Confirm after replacing')
                .toBeEnabled();
        });

        await test.step('rejects a file that is not a readable ZIP and leaves Confirm disabled', async () => {
            await openFreshDialog();
            await dialog.chooseFiles({
                name: 'broken.zip',
                mimeType: ZIP_MEDIA_TYPE,
                buffer: Buffer.from('this is not a zip archive'),
            });
            await expect
                .soft(dialog.rejections, 'rejection')
                .toHaveText(/not a readable ZIP archive/);
            await expect.soft(dialog.definitionCards, 'cards').toHaveCount(0);
            await expect.soft(dialog.confirmButton, 'Confirm').toBeDisabled();
        });

        await test.step('rejects a ZIP without attachments.json with its reason and uploads nothing', async () => {
            const title = uniqueName('archive-card-no-metadata');
            const entries = withoutEntry(
                archiveEntriesOf(
                    definitionWithInfoLevel(title, ATTACHMENTS.image.reference),
                    [ATTACHMENTS.image],
                ),
                METADATA_ENTRY,
            );
            const importRequestCountBefore = importRequests.length;
            await openFreshDialog();
            await dialog.chooseFiles({
                name: `${title}.zip`,
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf(entries),
            });
            await expect
                .soft(dialog.rejections, 'rejection')
                .toHaveText(/no readable attachments\.json/);
            await expect.soft(dialog.confirmButton, 'Confirm').toBeDisabled();
            expectNoNewImportRequest(importRequestCountBefore);
        });

        await test.step('rejects a ZIP without a definition document', async () => {
            await openFreshDialog();
            await dialog.chooseFiles({
                name: 'no-document.zip',
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf({ [METADATA_ENTRY]: strToU8('{}') }),
            });
            await expect
                .soft(dialog.rejections, 'rejection')
                .toHaveText(/no definition document/);
            await expect.soft(dialog.confirmButton, 'Confirm').toBeDisabled();
        });

        await test.step('shows one card for a ZIP with its format badge and attachment summary, and uploads it', async () => {
            const title = uniqueName('archive-card');
            const entries = archiveEntriesOf(
                definitionWithInfoLevel(title, referencesOf(ATTACHMENT_LIST)),
                ATTACHMENT_LIST,
            );
            await openFreshDialog();
            await dialog.chooseFiles({
                name: `${title}.zip`,
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf(entries),
            });

            await expect
                .soft(dialog.definitionCards, 'definition cards')
                .toHaveCount(1);
            const card = dialog.definitionCards.first();
            await expect.soft(card, 'card title').toContainText(title);
            await expect.soft(card, 'format badge').toContainText('ZIP');
            await expect
                .soft(card, 'attachment summary')
                .toContainText(`${ATTACHMENT_LIST.length} attachments`);
            await expect.soft(dialog.rejections, 'rejections').toHaveCount(0);

            await dialog.confirmButton.click();
            expect
                .soft(
                    (
                        await waitForNotification(
                            page,
                            'Training definition was uploaded',
                        )
                    ).kind,
                    'upload notification kind',
                )
                .toBe('success');
            await expect
                .soft.poll(
                    () =>
                        fetchDefinitionByTitle(apiAs('trainingDesigner'), title),
                    { message: 'uploaded definition' },
                )
                .toBeDefined();
        });

        await test.step('shows the error and creates nothing when the server refuses an archive the preview accepted', async () => {
            const title = uniqueName('archive-card-dangling');
            const document = definitionWithInfoLevel(
                title,
                `${ATTACHMENTS.image.reference}\n\n![gone](attachment:${MISSING_HASH})`,
            );
            await overview.goto();
            await openFreshDialog();
            await dialog.chooseFiles({
                name: `${title}.zip`,
                mimeType: ZIP_MEDIA_TYPE,
                buffer: zipOf(archiveEntriesOf(document, [ATTACHMENTS.image])),
            });
            await expect(dialog.definitionCards).toHaveCount(1);
            await dialog.confirmButton.click();

            await expect
                .soft(errorDialog(page), 'error dialog')
                .toContainText('Uploading training definition');
            await dismissErrorDialog(page);
            expect(
                await fetchDefinitionByTitle(apiAs('trainingDesigner'), title),
                'refused definition',
            ).toBeUndefined();
        });
    });
});
