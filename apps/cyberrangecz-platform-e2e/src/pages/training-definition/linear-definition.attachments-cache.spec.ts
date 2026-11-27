import type { Page } from '@playwright/test';
import type { Api } from '../../support/api/api-client';
import { accountFor } from '../../support/accounts';
import { freshStorageState } from '../../support/fresh-storage-state';
import { expect, test } from '../../support/fixtures';
import { ATTACHMENTS } from '../../support/scenario/attachment-fixtures';
import { openExisting } from '../../support/pages/training-definition/attachment-editor-session';
import {
    definitionWithInfoLevel,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import { waitForPageReady } from '../../support/ui';

const { image, other } = ATTACHMENTS;
const STORE_NAME_PREFIX = 'crczp-attachments-';

function attachmentStoreNames(page: Page): Promise<string[]> {
    return page.evaluate(
        async (prefix) => (await caches.keys()).filter((name) => name.startsWith(prefix)),
        STORE_NAME_PREFIX,
    );
}

test.describe('linear-definition.attachments browser store', () => {
    test.use({ account: 'trainingDesigner' });

    async function viewAttachments(page: Page, title: string, api: Api) {
        const definition = await importDefinitionBody(
            api,
            definitionWithInfoLevel(title, `${image.reference}\n\n${other.reference}`),
        );
        const { frame } = await openExisting(page, definition.id);
        await frame.previewTab.click();
        await expect(frame.cards).toHaveCount(2);
        await expect.poll(() => attachmentStoreNames(page)).not.toEqual([]);
        return attachmentStoreNames(page);
    }

    test('keeps the cached attachments of the signed-in user across a reload', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const cached = await viewAttachments(page, uniqueName('attachments-store-reload'), apiAs('trainingDesigner'));

        await page.reload();
        await waitForPageReady(page);

        expect(await attachmentStoreNames(page)).toEqual(cached);
    });

    test('deletes the cached attachments of the previous user once another user signs in on the same browser', async ({
        page,
        apiAs,
        uniqueName,
        browserKey,
        origin,
    }) => {
        const cachedOfFirstUser = await viewAttachments(
            page,
            uniqueName('attachments-store-sign-in'),
            apiAs('trainingDesigner'),
        );

        const secondUser = await freshStorageState(accountFor('trainingOrganizer', browserKey), origin);
        const tokens = secondUser.origins.find((entry) =>
            entry.localStorage.some(({ name }) => name === 'refresh_token'),
        )!.localStorage;
        await page.evaluate((entries) => {
            localStorage.clear();
            for (const { name, value } of entries) {
                localStorage.setItem(name, value);
            }
        }, tokens);
        await page.goto('/home');
        await waitForPageReady(page);

        await expect
            .poll(async () =>
                (await attachmentStoreNames(page)).filter((name) => cachedOfFirstUser.includes(name)),
            )
            .toEqual([]);
    });
});
