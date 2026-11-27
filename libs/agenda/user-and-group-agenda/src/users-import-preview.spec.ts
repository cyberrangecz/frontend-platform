import { describe, expect, it, vi } from 'vitest';

vi.mock('@crczp/utils', () => import('../../../utils/misc/src/utils/functions/import-document'));
vi.mock('@crczp/components', async () => ({
    ...(await import('../../../components/src/dialog/file-upload-dialog/file-import-preview')),
    ...(await import('../../../components/src/dialog/file-upload-dialog/file-reading')),
}));

import { firstValueFrom } from 'rxjs';
import { UsersImportPreview } from '../user-overview/import-preview/users-import-preview';

function read(content: unknown) {
    const file = new File([typeof content === 'string' ? content : JSON.stringify(content)], 'users.json');
    return firstValueFrom(new UsersImportPreview().readFile(file));
}

describe('UsersImportPreview', () => {
    it('yields one entity per listed user', async () => {
        const result = await read({
            users: [
                { sub: 'a@x.cz', iss: 'https://idp', full_name: 'Ann A' },
                { sub: 'b@x.cz', iss: 'https://idp' },
            ],
        });
        expect(result).toEqual({
            entities: [
                { sub: 'a@x.cz', issuer: 'https://idp', fullName: 'Ann A' },
                { sub: 'b@x.cz', issuer: 'https://idp', fullName: null },
            ],
        });
    });

    it.each([
        ['malformed JSON', '[', 'The file is not well-formed JSON'],
        ['no users list', { groups: [] }, 'The file lists no users'],
        ['an empty users list', { users: [] }, 'The file lists no users'],
        ['a user without an issuer', { users: [{ sub: 'a' }] }, 'User 1 has no subject or issuer'],
        ['a user with a non-text subject', { users: [{ sub: 5, iss: 'i' }] }, 'User 1 has no subject or issuer'],
    ])('rejects %s', async (_case, content, reason) => {
        expect(await read(content)).toEqual({ rejection: reason });
    });
});
