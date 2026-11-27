import { expect, test } from '../../support/fixtures';
import {
    definitionSourceFor,
    findDefinitions,
    removeDefinitions,
    type DefinitionSource,
    type SandboxDefinitionRecord,
} from '../../support/pages/sandbox-definition/definition-source';
import { SandboxDefinitionCreatePage } from '../../support/pages/sandbox-definition/sandbox-definition-create.page';
import { SandboxDefinitionOverviewPage } from '../../support/pages/sandbox-definition/sandbox-definition-overview.page';
import {
    breadcrumbLink,
    breadcrumbs,
    dismissErrorDialog,
    errorDialog,
    pageTitle,
    waitForNotification,
    waitForPageReady,
} from '../../support/ui';

const LITERAL_TEXT_REVISIONS = ['Žluťoučký kůň', '<b>x</b>'];
const MISSING_REPOSITORY_URL =
    'https://github.com/cyberrangecz/does-not-exist-e2e.git';

test.describe('/sandbox-definition/create', () => {
    test.use({ account: 'sandboxDesigner' });

    test.describe('sandbox designer', () => {
        test('checks the create form and its validation', async ({
            page,
            shared,
            apiAs,
            browserKey,
            checkpoint,
        }) => {
            test.slow();
            const create = new SandboxDefinitionCreatePage(page);

            await test.step('opens with empty fields, no errors and a disabled Create button', async () => {
                await create.open();

                await expect
                    .soft(pageTitle(page), 'page title')
                    .toHaveText('Create Sandbox Definition');
                await expect
                    .soft(breadcrumbs(page), 'breadcrumbs')
                    .toContainText('Create');
                await expect
                    .soft(create.input('Git URL'), 'Git URL value')
                    .toHaveValue('');
                await expect
                    .soft(create.input('Revision'), 'revision value')
                    .toHaveValue('');
                await expect
                    .soft(create.errors('Git URL'), 'Git URL errors')
                    .toHaveCount(0);
                await expect
                    .soft(create.errors('Revision'), 'revision errors')
                    .toHaveCount(0);
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
                await checkpoint(page, 'create form opened');
            });

            await test.step('reports an empty Git URL', async () => {
                await create.open();
                await create
                    .input('Revision')
                    .fill(shared.sandboxDefinition.rev);

                await create.touch('Git URL');

                await expect
                    .soft(create.errors('Git URL'), 'Git URL error')
                    .toHaveText('Git URL cannot be empty');
                await expect
                    .soft(create.errors('Revision'), 'revision errors')
                    .toHaveCount(0);
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
                await checkpoint(page, 'git url error shown');
            });

            await test.step('reports an empty revision', async () => {
                await create.open();
                await create
                    .input('Git URL')
                    .fill(shared.sandboxDefinition.url);

                await create.touch('Revision');

                await expect
                    .soft(create.errors('Revision'), 'revision error')
                    .toHaveText('Revision cannot be empty');
                await expect
                    .soft(create.errors('Git URL'), 'Git URL errors')
                    .toHaveCount(0);
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
            });

            await test.step('reports both fields when both are left empty', async () => {
                await create.open();

                await create.touch('Git URL');
                await create.touch('Revision');

                await expect
                    .soft(create.errors('Git URL'), 'Git URL error')
                    .toHaveText('Git URL cannot be empty');
                await expect
                    .soft(create.errors('Revision'), 'revision error')
                    .toHaveText('Revision cannot be empty');
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
            });

            await test.step('rejects a whitespace-only Git URL', async () => {
                await create.open();
                await create
                    .input('Revision')
                    .fill(shared.sandboxDefinition.rev);

                await create.input('Git URL').fill('   ');
                await create.touch('Git URL');

                await expect
                    .soft(create.errors('Git URL'), 'Git URL error')
                    .toHaveText('Git URL cannot be empty');
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
            });

            await test.step('rejects a whitespace-only revision', async () => {
                await create.open();
                await create
                    .input('Git URL')
                    .fill(shared.sandboxDefinition.url);

                await create.input('Revision').fill('   ');
                await create.touch('Revision');

                await expect
                    .soft(create.errors('Revision'), 'revision error')
                    .toHaveText('Revision cannot be empty');
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
            });

            await test.step('rejects a malformed Git URL in the form', async () => {
                await create.open();

                await create.input('Git URL').fill('not a url');
                await create
                    .input('Revision')
                    .fill(shared.sandboxDefinition.rev);
                await create.touch('Git URL');

                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
                await expect
                    .soft(create.errors('Git URL'), 'Git URL error')
                    .toBeVisible();
            });

            await test.step('the clear button of the Git URL empties it and reports it', async () => {
                await create.open();
                await create
                    .input('Git URL')
                    .fill(shared.sandboxDefinition.url);

                await create.clearButton('Git URL').click();

                await expect
                    .soft(create.input('Git URL'), 'Git URL value')
                    .toHaveValue('');
                await expect
                    .soft(create.errors('Git URL'), 'Git URL error')
                    .toHaveText('Git URL cannot be empty');
            });

            await test.step('the clear button of the revision empties it and reports it', async () => {
                await create.open();
                await create
                    .input('Revision')
                    .fill(shared.sandboxDefinition.rev);

                await create.clearButton('Revision').click();

                await expect
                    .soft(create.input('Revision'), 'revision value')
                    .toHaveValue('');
                await expect
                    .soft(create.errors('Revision'), 'revision error')
                    .toHaveText('Revision cannot be empty');
            });

            await test.step('does not submit with Enter while the form is invalid', async () => {
                await create.open();
                await create
                    .input('Git URL')
                    .fill(shared.sandboxDefinition.url);

                await create.input('Git URL').press('Enter');

                await expect
                    .soft(page, 'page URL')
                    .toHaveURL(/\/sandbox-definition\/create$/);
                await expect
                    .soft(errorDialog(page), 'error dialog')
                    .toHaveCount(0);
                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeDisabled();
            });

            await test.step('enables Create once both fields hold a value', async () => {
                await create.open();

                await create.fillSource(shared.sandboxDefinition);

                await expect
                    .soft(create.createButton, 'Create button')
                    .toBeEnabled();
                await expect
                    .soft(create.errors('Git URL'), 'Git URL errors')
                    .toHaveCount(0);
                await expect
                    .soft(create.errors('Revision'), 'revision errors')
                    .toHaveCount(0);
            });

            await test.step('leaving through the breadcrumb creates nothing', async () => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'unsaved');
                await create.open();
                await create.fillSource(source);

                await breadcrumbLink(page, 'Sandbox Definitions').click();

                await expect(page).toHaveURL(/\/sandbox-definition$/);
                await waitForPageReady(page);
                expect(
                    await findDefinitions(sandbox, source),
                    'definitions registered from the unsaved source',
                ).toEqual([]);
            });
        });

        test('creates definitions through the form and rejects a duplicate', async ({
            page,
            apiAs,
            browserKey,
            checkpoint,
        }) => {
            test.slow();
            const sandbox = apiAs('sandboxDesigner').sandbox;
            const created = definitionSourceFor(browserKey, 'create');
            const enterSubmitted = definitionSourceFor(
                browserKey,
                'enterSubmit',
            );
            const trimmed = definitionSourceFor(browserKey, 'trimmed');
            for (const source of [created, enterSubmitted, trimmed]) {
                await removeDefinitions(sandbox, source);
            }
            const create = new SandboxDefinitionCreatePage(page);

            await test.step('creates a definition from a git URL and revision and lists it', async () => {
                await create.open();
                await create.fillSource(created);
                await checkpoint(page, 'form filled');

                await create.createButton.click();

                const notification = await waitForNotification(
                    page,
                    'Sandbox definition was successfully created',
                );
                expect(notification.kind).toBe('success');
                await expect(page).toHaveURL(/\/sandbox-definition$/);
                const [definition] = await findDefinitions(sandbox, created);
                expect(definition).toBeDefined();
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.table.waitUntilLoaded();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(definition!.id);
                await expect(overview.titleCell(row)).toHaveText(
                    `${definition!.name} (${created.rev})`,
                );
                await checkpoint(page, 'definition listed');
            });

            await test.step('submits with Enter in the revision field when the form is valid', async () => {
                await create.open();
                await create.fillSource(enterSubmitted);

                await create.input('Revision').press('Enter');

                await waitForNotification(
                    page,
                    'Sandbox definition was successfully created',
                );
                await expect(page).toHaveURL(/\/sandbox-definition$/);
                await expect
                    .poll(
                        async () =>
                            (await findDefinitions(sandbox, enterSubmitted))
                                .length,
                    )
                    .toBe(1);
            });

            await test.step('trims spaces around the Git URL and the revision', async () => {
                await create.open();
                await create.fillSource({
                    url: `  ${trimmed.url}  `,
                    rev: `  ${trimmed.rev}  `,
                });

                await create.createButton.click();

                await waitForNotification(
                    page,
                    'Sandbox definition was successfully created',
                );
                await expect
                    .poll(
                        async () =>
                            (await findDefinitions(sandbox, trimmed)).length,
                    )
                    .toBe(1);
            });

            await test.step('rejects a definition that already exists', async () => {
                await create.open();
                await create.fillSource(created);

                await create.createButton.click();

                await expect(errorDialog(page)).toContainText(
                    /already exists/i,
                );
                await checkpoint(page, 'duplicate rejected');
                await dismissErrorDialog(page);
                await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
                expect(await findDefinitions(sandbox, created)).toHaveLength(1);
            });
        });

        test('rejects creations the sandbox service refuses', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            test.slow();
            const create = new SandboxDefinitionCreatePage(page);
            await create.open();

            async function submitRefusedSource(
                source: DefinitionSource,
            ): Promise<void> {
                await create.fillSource(source);
                await create.createButton.click();
            }

            await test.step('rejects a revision the repository does not hold', async () => {
                const missingRevision = uniqueName('missing-rev');

                await submitRefusedSource({
                    url: shared.sandboxDefinition.url,
                    rev: missingRevision,
                });

                await expect
                    .soft(errorDialog(page), 'error dialog')
                    .toContainText('Unable to process the repository');
                await dismissErrorDialog(page);
                await expect
                    .soft(page, 'page URL')
                    .toHaveURL(/\/sandbox-definition\/create$/);
                const definitions =
                    await apiAs(
                        'sandboxDesigner',
                    ).sandbox.getAll<SandboxDefinitionRecord>('/definitions');
                expect
                    .soft(
                        definitions.filter(
                            (definition) => definition.rev === missingRevision,
                        ),
                        'definitions registered with the missing revision',
                    )
                    .toEqual([]);
            });

            await test.step('rejects a repository that does not exist', async () => {
                await submitRefusedSource({
                    url: MISSING_REPOSITORY_URL,
                    rev: shared.sandboxDefinition.rev,
                });

                await expect
                    .soft(errorDialog(page), 'error dialog')
                    .toContainText('Unable to process the repository');
                await dismissErrorDialog(page);
                await expect
                    .soft(page, 'page URL')
                    .toHaveURL(/\/sandbox-definition\/create$/);
            });

            for (const revision of LITERAL_TEXT_REVISIONS) {
                await test.step(`shows the revision "${revision}" as literal text in the error`, async () => {
                    await submitRefusedSource({
                        url: shared.sandboxDefinition.url,
                        rev: revision,
                    });

                    await expect
                        .soft(errorDialog(page), 'error dialog')
                        .toBeVisible();
                    await expect
                        .soft(
                            errorDialog(page).locator('b'),
                            'markup rendered in the error',
                        )
                        .toHaveCount(0);
                    await dismissErrorDialog(page);
                    await expect
                        .soft(page, 'page URL')
                        .toHaveURL(/\/sandbox-definition\/create$/);
                });
            }
        });
    });
});
