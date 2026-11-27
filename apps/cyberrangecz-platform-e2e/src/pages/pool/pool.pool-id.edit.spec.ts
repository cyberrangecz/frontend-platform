import { expect, test } from '../../support/fixtures';
import { PoolFormPage } from '../../support/pages/pool/pool-form-page';
import { createPool, readPool, sharedDefinitionLabel } from '../../support/pages/pool/pool-data';
import {
    breadcrumbLink,
    ConfirmationDialog,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

const soft = expect.configure({ soft: true });

test.describe('pool.pool-id.edit', () => {
    test('checks the values and validation of the pool edit form', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const comment = uniqueName('edit-load');
        const loadedPool = await createPool(sandbox, shared, { comment, maxSize: 4, sendEmails: true });
        const original = uniqueName('edit-validation');
        const pool = await createPool(sandbox, shared, { comment: original, maxSize: 2 });
        const form = new PoolFormPage(page);
        const saveButton = form.submitButton('Save');

        await test.step('shows the values of the pool with the definition locked and Save disabled', async () => {
            await form.open(`/pool/${loadedPool.id}/edit`);
            await soft(pageTitle(page), 'page title').toHaveText(`Edit Pool ${loadedPool.id}`);
            await soft(page.getByText('Edit Sandbox Pool'), 'form heading').toBeVisible();
            await soft(form.sizeInput, 'size of the pool').toHaveValue('4');
            await soft(form.commentInput, 'comment of the pool').toHaveValue(comment);
            await soft(form.notifyCheckbox, 'notifications on').toBeChecked();
            await soft(form.definitionSelect, 'definition locked').toBeDisabled();
            await soft(form.definitionSelect, 'definition of the pool').toContainText(
                await sharedDefinitionLabel(sandbox, shared),
            );
            await soft(saveButton, 'Save disabled').toBeDisabled();
            await checkpoint(page, 'edit form loaded');
        });

        await form.open(`/pool/${pool.id}/edit`);

        await test.step('refuses the size 0 on a pool without sandboxes', async () => {
            await form.enterSize('0');
            await soft(form.sizeErrors, 'size error shown').not.toHaveCount(0);
            await soft(saveButton, 'Save disabled').toBeDisabled();
            expect.soft((await readPool(sandbox, pool.id)).max_size, 'size unchanged in the API').toBe(2);
        });

        await test.step('rejects a negative size and names the minimum of 1', async () => {
            await form.enterSize('-1');
            await soft(form.sizeErrors, 'minimum named').toContainText('greater than or equal to 1');
            await soft(saveButton, 'Save disabled').toBeDisabled();
        });

        await test.step('rejects an emptied size as required', async () => {
            await form.enterSize('');
            await soft(form.sizeErrors, 'required error').toHaveText('This field is required');
            await soft(saveButton, 'Save disabled').toBeDisabled();
        });

        await test.step('rejects an unreasonably large size', async () => {
            await form.enterSize('10000');
            await soft(form.sizeErrors, 'size error shown').not.toHaveCount(0);
            await soft(saveButton, 'Save disabled').toBeDisabled();
        });

        await test.step('never lets a comment of 257 characters through', async () => {
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill('q'.repeat(257));
            await soft
                .poll(
                    async () => {
                        const length = (await form.commentInput.inputValue()).length;
                        return length <= 256 || (await saveButton.isDisabled());
                    },
                    { message: 'comment cut or Save disabled' },
                )
                .toBe(true);
        });

        await form.open(`/pool/${pool.id}/edit`);
        await form.commentInput.fill('changed');
        await breadcrumbLink(page, 'Pools').click();
        const leaveDialog = new ConfirmationDialog(page, 'Unsaved changes');

        await test.step('stays on the form and keeps the pool when the leave dialog is cancelled', async () => {
            await leaveDialog.cancel();
            await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}/edit$`));
            await expect(form.commentInput).toHaveValue('changed');
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });

        await test.step('discards the changes when the leave dialog is confirmed', async () => {
            await breadcrumbLink(page, 'Pools').click();
            await leaveDialog.confirm();
            await expect(page).toHaveURL(/\/pool$/);
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });
    });

    test('saves changes through the pool edit form', async ({ page, apiAs, shared, uniqueName }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-old'), maxSize: 2 });
        const form = new PoolFormPage(page);
        const saveComment = async (comment: string): Promise<void> => {
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill(comment);
            await form.submitButton('Save').click();
            await waitForNotification(page, 'Pool was updated');
        };

        await test.step('saves a changed size, comment and e-mail setting', async () => {
            const newComment = uniqueName('edit-new');
            await form.open(`/pool/${pool.id}/edit`);
            await form.enterSize('5');
            await form.commentInput.fill(newComment);
            await form.notifyCheckbox.check();
            await form.submitButton('Save').click();
            expect((await waitForNotification(page, 'Pool was updated')).kind).toBe('success');
            await expect(page).toHaveURL(/\/pool$/);
            expect(await readPool(sandbox, pool.id)).toMatchObject({
                max_size: 5,
                comment: newComment,
                send_emails: true,
            });
            await test.step('keeps the definition of the pool after saving', async () => {
                expect((await readPool(sandbox, pool.id)).definition.id).toBe(pool.definition.id);
            });
        });

        await test.step('saves a comment of exactly 256 characters', async () => {
            const comment = `${uniqueName('edit-limit-new')}-`.padEnd(256, 'b');
            await saveComment(comment);
            expect((await readPool(sandbox, pool.id)).comment).toBe(comment);
        });

        await test.step('stores special characters and markup as literal text', async () => {
            const comment = 'Žluťoučký kůň <b>x</b>';
            await saveComment(comment);
            expect((await readPool(sandbox, pool.id)).comment).toBe(comment);
        });

        await test.step('saves an emptied comment', async () => {
            await saveComment('');
            expect((await readPool(sandbox, pool.id)).comment ?? '').toBe('');
        });
    });
});
