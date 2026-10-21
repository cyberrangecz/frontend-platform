import { expect, test } from '../../support/fixtures';
import {
    definitionSourceFor,
    ensureDefinition,
    findDefinitions,
    removeDefinitions,
    type SandboxDefinitionRecord,
} from '../../support/pages/sandbox-definition/definition-source';
import { ROLES_WITHOUT_ACCESS, SANDBOX_DEFINITION_LINKS } from '../../support/pages/sandbox-definition/roles-without-access';
import { expectRedirectedAway } from '../../support/route-guard';
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
const MISSING_REPOSITORY_URL = 'https://github.com/cyberrangecz/does-not-exist-e2e.git';

test.describe('/sandbox-definition/create', () => {
    test.use({ account: 'sandboxDesigner' });

    test.describe('sandbox designer', () => {
        test('opens with empty fields, no errors and a disabled Create button', async ({ page, checkpoint }) => {
            const create = new SandboxDefinitionCreatePage(page);
            await create.open();

            await expect(pageTitle(page)).toHaveText('Create Sandbox Definition');
            await expect(breadcrumbs(page)).toContainText('Create');
            await expect(create.input('Git URL')).toHaveValue('');
            await expect(create.input('Revision')).toHaveValue('');
            await expect(create.errors('Git URL')).toHaveCount(0);
            await expect(create.errors('Revision')).toHaveCount(0);
            await expect(create.createButton).toBeDisabled();
            await checkpoint(page, 'create form opened');
        });

        test.describe('validation', () => {
            test('reports an empty Git URL', async ({ page, shared, checkpoint }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Revision').fill(shared.sandboxDefinition.rev);

                await create.touch('Git URL');

                await expect(create.errors('Git URL')).toHaveText('Git URL cannot be empty');
                await expect(create.errors('Revision')).toHaveCount(0);
                await expect(create.createButton).toBeDisabled();
                await checkpoint(page, 'git url error shown');
            });

            test('reports an empty revision', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Git URL').fill(shared.sandboxDefinition.url);

                await create.touch('Revision');

                await expect(create.errors('Revision')).toHaveText('Revision cannot be empty');
                await expect(create.errors('Git URL')).toHaveCount(0);
                await expect(create.createButton).toBeDisabled();
            });

            test('reports both fields when both are left empty', async ({ page }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();

                await create.touch('Git URL');
                await create.touch('Revision');

                await expect(create.errors('Git URL')).toHaveText('Git URL cannot be empty');
                await expect(create.errors('Revision')).toHaveText('Revision cannot be empty');
                await expect(create.createButton).toBeDisabled();
            });

            test('rejects a whitespace-only Git URL', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Revision').fill(shared.sandboxDefinition.rev);

                await create.input('Git URL').fill('   ');
                await create.touch('Git URL');

                await expect(create.errors('Git URL')).toHaveText('Git URL cannot be empty');
                await expect(create.createButton).toBeDisabled();
            });

            test('rejects a whitespace-only revision', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Git URL').fill(shared.sandboxDefinition.url);

                await create.input('Revision').fill('   ');
                await create.touch('Revision');

                await expect(create.errors('Revision')).toHaveText('Revision cannot be empty');
                await expect(create.createButton).toBeDisabled();
            });

            test('enables Create once both fields hold a value', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();

                await create.fillSource(shared.sandboxDefinition);

                await expect(create.createButton).toBeEnabled();
                await expect(create.errors('Git URL')).toHaveCount(0);
                await expect(create.errors('Revision')).toHaveCount(0);
            });

            test('rejects a malformed Git URL in the form', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();

                await create.input('Git URL').fill('not a url');
                await create.input('Revision').fill(shared.sandboxDefinition.rev);
                await create.touch('Git URL');

                await expect(create.createButton).toBeDisabled();
                await expect(create.errors('Git URL')).toBeVisible();
            });
        });

        test.describe('clearing fields', () => {
            test('the clear button of the Git URL empties it and reports it', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Git URL').fill(shared.sandboxDefinition.url);

                await create.clearButton('Git URL').click();

                await expect(create.input('Git URL')).toHaveValue('');
                await expect(create.errors('Git URL')).toHaveText('Git URL cannot be empty');
            });

            test('the clear button of the revision empties it and reports it', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Revision').fill(shared.sandboxDefinition.rev);

                await create.clearButton('Revision').click();

                await expect(create.input('Revision')).toHaveValue('');
                await expect(create.errors('Revision')).toHaveText('Revision cannot be empty');
            });
        });

        test.describe('creating', () => {
            test('creates a definition from a git URL and revision and lists it', async ({
                page,
                apiAs,
                browserKey,
                checkpoint,
            }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'create');
                await removeDefinitions(sandbox, source);
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource(source);
                await checkpoint(page, 'form filled');

                await create.createButton.click();

                const notification = await waitForNotification(page, 'Sandbox definition was successfully created');
                expect(notification.kind).toBe('success');
                await expect(page).toHaveURL(/\/sandbox-definition$/);
                const [created] = await findDefinitions(sandbox, source);
                expect(created).toBeDefined();
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.table.waitUntilLoaded();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(created!.id);
                await expect(overview.titleCell(row)).toHaveText(`${created!.name} (${source.rev})`);
                await checkpoint(page, 'definition listed');
            });

            test('submits with Enter in the revision field when the form is valid', async ({
                page,
                apiAs,
                browserKey,
            }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'enterSubmit');
                await removeDefinitions(sandbox, source);
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource(source);

                await create.input('Revision').press('Enter');

                await waitForNotification(page, 'Sandbox definition was successfully created');
                await expect(page).toHaveURL(/\/sandbox-definition$/);
                await expect.poll(async () => (await findDefinitions(sandbox, source)).length).toBe(1);
            });

            test('does not submit with Enter while the form is invalid', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.input('Git URL').fill(shared.sandboxDefinition.url);

                await create.input('Git URL').press('Enter');

                await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
                await expect(errorDialog(page)).toHaveCount(0);
                await expect(create.createButton).toBeDisabled();
            });

            test('trims spaces around the Git URL and the revision', async ({ page, apiAs, browserKey }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'trimmed');
                await removeDefinitions(sandbox, source);
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource({ url: `  ${source.url}  `, rev: `  ${source.rev}  ` });

                await create.createButton.click();

                await waitForNotification(page, 'Sandbox definition was successfully created');
                await expect.poll(async () => (await findDefinitions(sandbox, source)).length).toBe(1);
            });

            test('leaving through the breadcrumb creates nothing', async ({ page, apiAs, browserKey }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'unsaved');
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource(source);

                await breadcrumbLink(page, 'Sandbox Definitions').click();

                await expect(page).toHaveURL(/\/sandbox-definition$/);
                await waitForPageReady(page);
                expect(await findDefinitions(sandbox, source)).toEqual([]);
            });
        });

        test.describe('rejected creation', () => {
            test('rejects a definition that already exists', async ({ page, apiAs, browserKey, checkpoint }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'duplicate');
                await ensureDefinition(sandbox, source);
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource(source);

                await create.createButton.click();

                await expect(errorDialog(page)).toContainText(/already exists/i);
                await checkpoint(page, 'duplicate rejected');
                await dismissErrorDialog(page);
                await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
                expect(await findDefinitions(sandbox, source)).toHaveLength(1);
            });

            test('rejects a revision the repository does not hold', async ({ page, apiAs, shared, uniqueName }) => {
                const missingRevision = uniqueName('missing-rev');
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource({ url: shared.sandboxDefinition.url, rev: missingRevision });

                await create.createButton.click();

                await expect(errorDialog(page)).toContainText('Unable to process the repository');
                await dismissErrorDialog(page);
                await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
                const definitions = await apiAs('sandboxDesigner').sandbox.getAll<SandboxDefinitionRecord>('/definitions');
                expect(definitions.filter((definition) => definition.rev === missingRevision)).toEqual([]);
            });

            test('rejects a repository that does not exist', async ({ page, shared }) => {
                const create = new SandboxDefinitionCreatePage(page);
                await create.open();
                await create.fillSource({ url: MISSING_REPOSITORY_URL, rev: shared.sandboxDefinition.rev });

                await create.createButton.click();

                await expect(errorDialog(page)).toContainText('Unable to process the repository');
                await dismissErrorDialog(page);
                await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
            });

            for (const revision of LITERAL_TEXT_REVISIONS) {
                test(`shows the revision "${revision}" as literal text in the error`, async ({ page, shared }) => {
                    const create = new SandboxDefinitionCreatePage(page);
                    await create.open();
                    await create.fillSource({ url: shared.sandboxDefinition.url, rev: revision });

                    await create.createButton.click();

                    await expect(errorDialog(page)).toBeVisible();
                    await expect(errorDialog(page).locator('b')).toHaveCount(0);
                    await dismissErrorDialog(page);
                    await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
                });
            }
        });
    });

    test.describe('accounts without the sandbox designer role', () => {
        for (const role of ROLES_WITHOUT_ACCESS) {
            test(`sends the ${role} account away from /sandbox-definition/create`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, SandboxDefinitionCreatePage.PATH, { absentLinks: SANDBOX_DEFINITION_LINKS });
            });
        }
    });
});
