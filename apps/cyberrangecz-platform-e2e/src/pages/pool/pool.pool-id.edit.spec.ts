import { expect, test } from '../../support/fixtures';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { PoolFormPage } from '../../support/pages/pool/pool-form-page';
import { createPool, readPool, sharedDefinitionLabel } from '../../support/pages/pool/pool-data';
import {
    breadcrumbLink,
    ConfirmationDialog,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool.pool-id.edit', () => {
    test('shows the values of the pool with the definition locked and Save disabled', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const comment = uniqueName('edit-load');
        const pool = await createPool(sandbox, shared, { comment, maxSize: 4, sendEmails: true });
        const form = new PoolFormPage(page);
        await form.open(`/pool/${pool.id}/edit`);
        await expect(pageTitle(page)).toHaveText(`Edit Pool ${pool.id}`);
        await expect(page.getByText('Edit Sandbox Pool')).toBeVisible();
        await expect(form.sizeInput).toHaveValue('4');
        await expect(form.commentInput).toHaveValue(comment);
        await expect(form.notifyCheckbox).toBeChecked();
        await expect(form.definitionSelect).toBeDisabled();
        await expect(form.definitionSelect).toContainText(await sharedDefinitionLabel(sandbox, shared));
        await expect(form.submitButton('Save')).toBeDisabled();
        await checkpoint(page, 'edit form loaded');
    });

    test('saves a changed size, comment and e-mail setting', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-old'), maxSize: 2 });
        const newComment = uniqueName('edit-new');
        const form = new PoolFormPage(page);
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
    });

    test('keeps the definition of the pool after saving', async ({ page, apiAs, shared, uniqueName }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-definition') });
        const form = new PoolFormPage(page);
        await form.open(`/pool/${pool.id}/edit`);
        await form.commentInput.fill(uniqueName('edit-definition-new'));
        await form.submitButton('Save').click();
        await waitForNotification(page, 'Pool was updated');
        expect((await readPool(sandbox, pool.id)).definition.id).toBe(pool.definition.id);
    });

    test.describe('pool size', () => {
        test('refuses the size 0 on a pool without sandboxes', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-zero'), maxSize: 2 });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.enterSize('0');
            await expect(form.sizeErrors).not.toHaveCount(0);
            await expect(form.submitButton('Save')).toBeDisabled();
            expect((await readPool(sandbox, pool.id)).max_size).toBe(2);
        });

        test('rejects a negative size and names the minimum of 1', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('edit-negative'),
            });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.enterSize('-1');
            await expect(form.sizeErrors).toContainText('greater than or equal to 1');
            await expect(form.submitButton('Save')).toBeDisabled();
        });

        test('rejects an emptied size as required', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('edit-required'),
            });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.enterSize('');
            await expect(form.sizeErrors).toHaveText('This field is required');
            await expect(form.submitButton('Save')).toBeDisabled();
        });

        test('rejects an unreasonably large size', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('edit-large'),
            });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.enterSize('10000');
            await expect(form.sizeErrors).not.toHaveCount(0);
            await expect(form.submitButton('Save')).toBeDisabled();
        });
    });

    test.describe('comment', () => {
        test('saves a comment of exactly 256 characters', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-limit') });
            const comment = `${uniqueName('edit-limit-new')}-`.padEnd(256, 'b');
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill(comment);
            await form.submitButton('Save').click();
            await waitForNotification(page, 'Pool was updated');
            expect((await readPool(sandbox, pool.id)).comment).toBe(comment);
        });

        test('never lets a comment of 257 characters through', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('edit-over'),
            });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill('q'.repeat(257));
            await expect
                .poll(async () => {
                    const length = (await form.commentInput.inputValue()).length;
                    return length <= 256 || (await form.submitButton('Save').isDisabled());
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
            const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-special') });
            const comment = 'Žluťoučký kůň <b>x</b>';
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill(comment);
            await form.submitButton('Save').click();
            await waitForNotification(page, 'Pool was updated');
            expect((await readPool(sandbox, pool.id)).comment).toBe(comment);
        });

        test('saves an emptied comment', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('edit-empty') });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill('');
            await form.submitButton('Save').click();
            await waitForNotification(page, 'Pool was updated');
            expect((await readPool(sandbox, pool.id)).comment ?? '').toBe('');
        });
    });

    test.describe('leaving the form', () => {
        test('stays on the form and keeps the pool when the leave dialog is cancelled', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const original = uniqueName('edit-stay');
            const pool = await createPool(sandbox, shared, { comment: original });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill('changed');
            await breadcrumbLink(page, 'Pools').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await dialog.cancel();
            await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}/edit$`));
            await expect(form.commentInput).toHaveValue('changed');
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });

        test('discards the changes when the leave dialog is confirmed', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const original = uniqueName('edit-discard');
            const pool = await createPool(sandbox, shared, { comment: original });
            const form = new PoolFormPage(page);
            await form.open(`/pool/${pool.id}/edit`);
            await form.commentInput.fill('changed');
            await breadcrumbLink(page, 'Pools').click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expect(page).toHaveURL(/\/pool$/);
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool/:id/edit`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, '/pool/1/edit', { absentLinks: POOL_LINKS });
        });
    }
});
