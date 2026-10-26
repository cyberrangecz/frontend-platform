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

test.describe('unknown sort', () => {
    let scope: SortableScope;

    test.beforeAll(async ({ apiAs, shared }) => {
        const groups = await apiAs('userAdministrator').userAndGroup.get<GroupPage>('/groups', { page: 0, size: 1 });
        const group = groups.content[0];
        if (!group) {
            throw new Error('The user and group service lists no group to scope the group tables to');
        }
        scope = { shared, groupId: group.id };
    });

    for (const endpoint of SORTABLE_ENDPOINTS) {
        test(`${endpoint.name} refuses a sort by an unknown field`, async ({ apiAs }) => {
            const client = apiAs(endpoint.role)[endpoint.service];
            const path = endpoint.path(scope);

            await client.get(path, firstPageQuery(endpoint));

            const rejection = await client.get(path, unknownSortQuery(endpoint)).then(
                () => undefined,
                (error: unknown) => error,
            );
            expect(rejection, 'a sort by an unknown field is refused').toBeInstanceOf(ApiError);
            expect((rejection as ApiError).status, 'status of the refusal').toBe(400);
        });
    }
});
