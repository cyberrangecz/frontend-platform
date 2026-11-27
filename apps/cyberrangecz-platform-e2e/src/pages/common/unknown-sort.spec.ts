import { ApiError } from '../../support/api/api-client';
import {
    firstPageQuery,
    SORTABLE_ENDPOINTS,
    unknownSortQuery,
    type SortableScope,
} from '../../support/api/sortable-endpoints';
import { expect, test } from '../../support/fixtures';

interface GroupPage {
    content: { id: number }[];
}

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('unknown sort', { tag: '@api' }, () => {
    test('every sortable endpoint refuses a sort by an unknown field', async ({ apiAs, shared }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const groups = await apiAs('userAdministrator').userAndGroup.get<GroupPage>('/groups', { page: 0, size: 1 });
        const group = groups.content[0];
        if (!group) {
            throw new Error('The user and group service lists no group to scope the group tables to');
        }
        const scope: SortableScope = { shared, groupId: group.id };

        for (const endpoint of SORTABLE_ENDPOINTS) {
            await test.step(`${endpoint.name} refuses a sort by an unknown field`, async () => {
                const client = apiAs(endpoint.role)[endpoint.service];
                const path = endpoint.path(scope);

                const firstPageFailure = await client.get(path, firstPageQuery(endpoint)).then(
                    () => undefined,
                    (error: unknown) => error,
                );
                expect.soft(firstPageFailure, 'a sort by a known field is accepted').toBeUndefined();

                const rejection = await client.get(path, unknownSortQuery(endpoint)).then(
                    () => undefined,
                    (error: unknown) => error,
                );
                expect.soft(rejection, 'a sort by an unknown field is refused').toBeInstanceOf(ApiError);
                expect.soft((rejection as ApiError | undefined)?.status, 'status of the refusal').toBe(400);
            });
        }
    });
});
