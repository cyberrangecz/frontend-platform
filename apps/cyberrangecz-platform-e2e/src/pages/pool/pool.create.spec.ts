import { expect, test } from '../../support/fixtures';
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

const soft = expect.configure({ soft: true });

const SIZE_MINIMUM_ERROR = /Pool size must be a number greater than or equal to 1/;

test.describe('pool.create', () => {
    test('checks the fields of the pool creation form', async ({ page, apiAs, shared, checkpoint }) => {
        test.setTimeout(180_000);
        const label = await sharedDefinitionLabel(apiAs('sandboxOrganizer').sandbox, shared);
        const form = new PoolFormPage(page);
        const createButton = form.submitButton('Create');
        const definitionOption = page.getByRole('option', { name: label, exact: true }).first();
        await form.open('/pool/create');

        await test.step('shows an empty form whose Create control is disabled', async () => {
            await soft(pageTitle(page), 'page title').toHaveText('Create Pool');
            await soft(page.getByText('Create Sandbox Pool'), 'form heading').toBeVisible();
            await soft(form.sizeInput, 'default size').toHaveValue('1');
            await soft(form.commentInput, 'empty comment').toHaveValue('');
            await soft(form.notifyCheckbox, 'notifications off').not.toBeChecked();
            await soft(form.definitionSelect, 'definition select enabled').toBeEnabled();
            await soft(createButton, 'Create disabled').toBeDisabled();
            await checkpoint(page, 'create form opened');
        });

        await test.step('lists the shared sandbox definition and filters the list by the typed text', async () => {
            await form.definitionSelect.click();
            await soft(definitionOption, 'shared definition listed').toBeVisible();
            await page.getByPlaceholder('Search Sandbox Definitions').fill(label);
            await soft(definitionOption, 'shared definition kept by the filter').toBeVisible();
        });

        await test.step('shows a no-results entry when no sandbox definition matches the search', async () => {
            await page.getByPlaceholder('Search Sandbox Definitions').fill('no definition has this text');
            await soft(page.getByRole('option', { name: 'No Sandbox Definitions' }), 'no-results entry').toBeDisabled();
        });

        await form.open('/pool/create');

        await test.step('rejects the size 0', async () => {
            await form.enterSize('0');
            await soft(form.sizeErrors, 'size 0 error').toHaveText(SIZE_MINIMUM_ERROR);
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('rejects a negative size', async () => {
            await form.enterSize('-5');
            await soft(form.sizeErrors, 'negative size error').toHaveText(SIZE_MINIMUM_ERROR);
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('rejects an emptied size field as required', async () => {
            await form.enterSize('');
            await soft(form.sizeErrors, 'required error').toHaveText('This field is required');
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('ignores non-numeric typing and reports the field as required', async () => {
            await form.sizeInput.fill('');
            await form.sizeInput.pressSequentially('abc');
            await form.sizeInput.blur();
            await soft(form.sizeErrors, 'required error').toHaveText('This field is required');
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('keeps Create disabled until a sandbox definition is chosen', async () => {
            await form.enterSize('2');
            await soft(createButton, 'Create disabled without a definition').toBeDisabled();
            await form.chooseDefinition(label);
            await soft(createButton, 'Create enabled with a definition').toBeEnabled();
        });

        await test.step('accepts the smallest valid size 1 with a definition chosen', async () => {
            await form.enterSize('1');
            await soft(form.sizeErrors, 'no size error').toHaveCount(0);
            await soft(createButton, 'Create enabled').toBeEnabled();
        });

        await test.step('rejects an unreasonably large size', async () => {
            await form.enterSize('10000');
            await soft(form.sizeErrors, 'size error shown').not.toHaveCount(0);
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('rejects a fractional size', async () => {
            await form.enterSize('1.5');
            await soft(form.sizeErrors, 'size error shown').not.toHaveCount(0);
            await soft(createButton, 'Create disabled').toBeDisabled();
        });

        await test.step('never lets a comment of 257 characters through', async () => {
            await form.open('/pool/create');
            await form.chooseDefinition(label);
            await form.commentInput.fill('z'.repeat(257));
            await soft
                .poll(
                    async () => {
                        const length = (await form.commentInput.inputValue()).length;
                        return length <= 256 || (await createButton.isDisabled());
                    },
                    { message: 'comment cut or Create disabled' },
                )
                .toBe(true);
        });
    });

    test('checks leaving the pool creation form', async ({ page, checkpoint }) => {
        const form = new PoolFormPage(page);
        await form.open('/pool/create');
        await form.commentInput.fill('discard me');
        await breadcrumbLink(page, 'Pools').click();
        const dialog = new ConfirmationDialog(page, 'Unsaved changes');

        await test.step('asks before leaving a changed form and stays when cancelled', async () => {
            await expect(dialog.root).toBeVisible();
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(page).toHaveURL(/\/pool\/create$/);
            await expect(form.commentInput).toHaveValue('discard me');
        });

        await test.step('discards the form and leaves when the leave dialog is confirmed', async () => {
            await breadcrumbLink(page, 'Pools').click();
            await dialog.confirm();
            await expect(page).toHaveURL(/\/pool$/);
        });

        await test.step('leaves an untouched form without asking', async () => {
            await form.open('/pool/create');
            await breadcrumbLink(page, 'Pools').click();
            await expect(page).toHaveURL(/\/pool$/);
        });
    });

    test('creates pools through the form', async ({ page, apiAs, shared, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const label = await sharedDefinitionLabel(sandbox, shared);
        const form = new PoolFormPage(page);
        const createButton = form.submitButton('Create');

        await test.step('creates a pool with the entered size, definition, comment and e-mail setting', async () => {
            const comment = uniqueName('create-full');
            await form.open('/pool/create');
            await form.enterSize('4');
            await form.chooseDefinition(label);
            await form.notifyCheckbox.check();
            await form.commentInput.fill(comment);
            await checkpoint(page, 'create form filled');
            await createButton.click();
            expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
            await expect(page).toHaveURL(/\/pool$/);
            const created = await findPoolByComment(sandbox, comment);
            expect(created).toMatchObject({ max_size: 4, send_emails: true });
            expect(`${created?.definition.name} [${created?.definition.rev}]`).toBe(label);
        });

        await test.step('creates a pool with the default size of 1 and no e-mail notifications', async () => {
            const comment = uniqueName('create-default');
            await form.open('/pool/create');
            await form.chooseDefinition(label);
            await form.commentInput.fill(comment);
            await createButton.click();
            await waitForNotification(page, 'Pool was created');
            expect(await findPoolByComment(sandbox, comment)).toMatchObject({ max_size: 1, send_emails: false });
        });

        await test.step('creates a pool without a comment', async () => {
            await form.open('/pool/create');
            await form.enterSize('1');
            await form.chooseDefinition(label);
            const creation = page.waitForResponse(
                (candidate) =>
                    candidate.request().method() === 'POST' && /\/pools\/?$/.test(new URL(candidate.url()).pathname),
            );
            await createButton.click();
            const response = await creation;
            expect(response.ok()).toBe(true);
            const createdPool = (await response.json()) as { id: number; comment: string | null };
            expect(createdPool.comment ?? '').toBe('');
            expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
            expect((await readPool(sandbox, createdPool.id)).comment ?? '').toBe('');
        });

        await test.step('keeps a comment of exactly 256 characters and creates the pool', async () => {
            const comment = `${uniqueName('create-limit')}-`.padEnd(256, 'a');
            await form.open('/pool/create');
            await form.chooseDefinition(label);
            await form.commentInput.fill(comment);
            await expect(form.commentInput).toHaveValue(comment);
            await createButton.click();
            await waitForNotification(page, 'Pool was created');
            expect((await findPoolByComment(sandbox, comment))?.comment).toHaveLength(256);
        });

        await test.step('stores special characters and markup as literal text', async () => {
            const comment = `${uniqueName('special')} Žluťoučký kůň <b>x</b>`;
            await form.open('/pool/create');
            await form.chooseDefinition(label);
            await form.commentInput.fill(comment);
            await createButton.click();
            await waitForNotification(page, 'Pool was created');
            expect((await findPoolByComment(sandbox, comment))?.comment).toBe(comment);
            await expect(page.locator('crczp-editable-comment b')).toHaveCount(0);
        });

        await test.step('accepts a whitespace-only comment', async () => {
            await form.open('/pool/create');
            await form.chooseDefinition(label);
            await form.commentInput.fill('     ');
            await expect(createButton).toBeEnabled();
            await createButton.click();
            expect((await waitForNotification(page, 'Pool was created')).kind).toBe('success');
        });
    });
});
