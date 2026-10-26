import { expect, test } from '../../support/fixtures';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { PoolFormPage } from '../../support/pages/pool/pool-form-page';
import {
    findPoolByComment,
    readPool,
    sharedDefinitionLabel,
} from '../../support/pages/pool/pool-data';
import {
    breadcrumbLink,
    ConfirmationDialog,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool.create', () => {
    test('shows an empty form whose Create control is disabled', async ({ page, checkpoint }) => {
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await expect(pageTitle(page)).toHaveText('Create Pool');
        await expect(page.getByText('Create Sandbox Pool')).toBeVisible();
        await expect(form.sizeInput).toHaveValue('1');
        await expect(form.commentInput).toHaveValue('');
        await expect(form.notifyCheckbox).not.toBeChecked();
        await expect(form.definitionSelect).toBeEnabled();
        await expect(form.submitButton('Create')).toBeDisabled();
        await checkpoint(page, 'create form opened');
    });

    test('lists the shared sandbox definition and filters the list by the typed text', async ({
        page,
        apiAs,
        shared,
    }) => {
        const label = await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared);
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.definitionSelect.click();
        await expect(page.getByRole('option', { name: label, exact: true }).first()).toBeVisible();
        await page.getByPlaceholder('Search Sandbox Definitions').fill(label);
        await expect(page.getByRole('option', { name: label, exact: true }).first()).toBeVisible();
    });

    test('shows a no-results entry when no sandbox definition matches the search', async ({ page }) => {
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.definitionSelect.click();
        await page.getByPlaceholder('Search Sandbox Definitions').fill('no definition has this text');
        await expect(page.getByRole('option', { name: 'No Sandbox Definitions' })).toBeDisabled();
    });

    test('keeps Create disabled until a sandbox definition is chosen', async ({
        page,
        apiAs,
        shared,
    }) => {
        const label = await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared);
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.enterSize('2');
        await expect(form.submitButton('Create')).toBeDisabled();
        await form.chooseDefinition(label);
        await expect(form.submitButton('Create')).toBeEnabled();
    });

    test('creates a pool with the entered size, definition, comment and e-mail setting', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const comment = uniqueName('create-full');
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.enterSize('4');
        await form.chooseDefinition(await sharedDefinitionLabel(sandbox, shared));
        await form.notifyCheckbox.check();
        await form.commentInput.fill(comment);
        await checkpoint(page, 'create form filled');
        await form.submitButton('Create').click();
        expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
        await expect(page).toHaveURL(/\/pool$/);
        const created = await findPoolByComment(sandbox, comment);
        expect(created).toMatchObject({ max_size: 4, send_emails: true });
        expect(`${created?.definition.name} [${created?.definition.rev}]`).toBe(
            await sharedDefinitionLabel(sandbox, shared),
        );
    });

    test('creates a pool with the default size of 1 and no e-mail notifications', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const comment = uniqueName('create-default');
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.chooseDefinition(await sharedDefinitionLabel(sandbox, shared));
        await form.commentInput.fill(comment);
        await form.submitButton('Create').click();
        await waitForNotification(page, 'Pool was created');
        expect(await findPoolByComment(sandbox, comment)).toMatchObject({ max_size: 1, send_emails: false });
    });

    test('creates a pool without a comment', async ({ page, apiAs, shared }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.enterSize('1');
        await form.chooseDefinition(await sharedDefinitionLabel(sandbox, shared));
        const creation = page.waitForResponse(
            (candidate) =>
                candidate.request().method() === 'POST' && /\/pools\/?$/.test(new URL(candidate.url()).pathname),
        );
        await form.submitButton('Create').click();
        const response = await creation;
        expect(response.ok()).toBe(true);
        const createdPool = (await response.json()) as { id: number; comment: string | null };
        expect(createdPool.comment ?? '').toBe('');
        expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
        expect((await readPool(sandbox, createdPool.id)).comment ?? '').toBe('');
    });

    test.describe('pool size', () => {
        test('rejects the size 0', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.enterSize('0');
            await expect(form.sizeErrors).toHaveText(
                /Pool size must be a number greater than or equal to 1/,
            );
            await expect(form.submitButton('Create')).toBeDisabled();
        });

        test('rejects a negative size', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.enterSize('-5');
            await expect(form.sizeErrors).toHaveText(
                /Pool size must be a number greater than or equal to 1/,
            );
            await expect(form.submitButton('Create')).toBeDisabled();
        });

        test('rejects an emptied size field as required', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.enterSize('');
            await expect(form.sizeErrors).toHaveText('This field is required');
            await expect(form.submitButton('Create')).toBeDisabled();
        });

        test('ignores non-numeric typing and reports the field as required', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.sizeInput.fill('');
            await form.sizeInput.pressSequentially('abc');
            await form.sizeInput.blur();
            await expect(form.sizeErrors).toHaveText('This field is required');
            await expect(form.submitButton('Create')).toBeDisabled();
        });

        test('accepts the smallest valid size 1 with a definition chosen', async ({
            page,
            apiAs,
            shared,
        }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared));
            await form.enterSize('1');
            await expect(form.sizeErrors).toHaveCount(0);
            await expect(form.submitButton('Create')).toBeEnabled();
        });

        test('rejects an unreasonably large size', async ({ page, apiAs, shared }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared));
            await form.enterSize('10000');
            await expect(form.sizeErrors).not.toHaveCount(0);
            await expect(form.submitButton('Create')).toBeDisabled();
        });

        test('rejects a fractional size', async ({ page, apiAs, shared }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared));
            await form.enterSize('1.5');
            await expect(form.sizeErrors).not.toHaveCount(0);
            await expect(form.submitButton('Create')).toBeDisabled();
        });
    });

    test.describe('comment', () => {
        test('keeps a comment of exactly 256 characters and creates the pool', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const comment = `${uniqueName('create-limit')}-`.padEnd(256, 'a');
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(sandbox, shared));
            await form.commentInput.fill(comment);
            await expect(form.commentInput).toHaveValue(comment);
            await form.submitButton('Create').click();
            await waitForNotification(page, 'Pool was created');
            expect((await findPoolByComment(sandbox, comment))?.comment).toHaveLength(256);
        });

        test('never lets a comment of 257 characters through', async ({ page, apiAs, shared }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared));
            await form.commentInput.fill('z'.repeat(257));
            await expect
                .poll(async () => {
                    const length = (await form.commentInput.inputValue()).length;
                    return length <= 256 || (await form.submitButton('Create').isDisabled());
                })
                .toBe(true);
        });

        test('stores special characters and markup as literal text', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const comment = `${uniqueName('special')} Žluťoučký kůň <b>x</b>`;
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(sandbox, shared));
            await form.commentInput.fill(comment);
            await form.submitButton('Create').click();
            await waitForNotification(page, 'Pool was created');
            expect((await findPoolByComment(sandbox, comment))?.comment).toBe(comment);
            await expect(page.locator('crczp-editable-comment b')).toHaveCount(0);
        });

        test('accepts a whitespace-only comment', async ({ page, apiAs, shared }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.chooseDefinition(await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared));
            await form.commentInput.fill('     ');
            await expect(form.submitButton('Create')).toBeEnabled();
            await form.submitButton('Create').click();
            expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
        });
    });

    test.describe('leaving the form', () => {
        test('asks before leaving a changed form and stays when cancelled', async ({ page, checkpoint }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.commentInput.fill('discard me');
            await breadcrumbLink(page, 'Pools').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.root).toBeVisible();
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(page).toHaveURL(/\/pool\/create$/);
            await expect(form.commentInput).toHaveValue('discard me');
        });

        test('discards the form and leaves when the leave dialog is confirmed', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await form.commentInput.fill('discard me');
            await breadcrumbLink(page, 'Pools').click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expect(page).toHaveURL(/\/pool$/);
        });

        test('leaves an untouched form without asking', async ({ page }) => {
            const form = new PoolFormPage(page);
            await form.open('/pool/create');
            await breadcrumbLink(page, 'Pools').click();
            await expect(page).toHaveURL(/\/pool$/);
        });
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool/create`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, '/pool/create', { absentLinks: POOL_LINKS });
        });
    }
});
