import { PendingMaterials } from '../../../markdown/src/lib/attachment/pending-materials';
import { AttachmentUrlCache, TrainingAttachmentApi } from '@crczp/training-api';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TrainingAttachmentSource } from '../internal/attachments/training-attachment-source';

vi.mock('@crczp/markdown', async () => ({
    // eslint-disable-next-line @nx/enforce-module-boundaries
    ...(await import('../../../markdown/src/lib/attachment/attachment-source')),
    // eslint-disable-next-line @nx/enforce-module-boundaries
    ...(await import('../../../markdown/src/lib/attachment/pending-materials')),
}));

describe('TrainingAttachmentSource poster', () => {
    const definitionId = 7;
    const hash = 'abc';

    function createSource(posterAnswer: Blob | undefined) {
        const absent = new Set<string>();
        const api = { poster: vi.fn(() => of(posterAnswer)) };
        const urls = {
            lacksPoster: (_id: number, key: string) => absent.has(key),
            notePosterAbsent: (_id: number, key: string) => void absent.add(key),
            resolve: (_id: number, _kind: string, _key: string, load: () => ReturnType<typeof api.poster>) => load(),
        };
        const pending = new PendingMaterials();
        const source = new TrainingAttachmentSource(
            api as unknown as TrainingAttachmentApi,
            urls as unknown as AttachmentUrlCache,
            definitionId,
            pending,
        );
        return { api, pending, source };
    }

    it('serves a pending file without a poster from local facts and never asks the server', async () => {
        const { api, pending, source } = createSource(undefined);
        vi.spyOn(pending, 'find').mockReturnValue({
            file: new File(['x'], 'a.png'),
            metadata: { hash, fileName: 'a.png', mediaType: 'image/png', size: 1 },
        });

        expect(await firstValueFrom(source.poster(hash))).toBeUndefined();

        vi.spyOn(pending, 'find').mockReturnValue(undefined);
        expect(await firstValueFrom(source.poster(hash))).toBeUndefined();
        expect(api.poster).not.toHaveBeenCalled();
    });

    it('asks the server once for a stored file that turns out to have no poster', async () => {
        const { api, source } = createSource(undefined);

        await firstValueFrom(source.poster(hash));
        await firstValueFrom(source.poster(hash));

        expect(api.poster).toHaveBeenCalledTimes(1);
    });
});
