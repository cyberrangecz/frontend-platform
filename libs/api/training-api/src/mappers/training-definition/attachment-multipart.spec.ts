import { describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { multipartBodyOf } from './attachment-multipart';

describe('multipartBodyOf', () => {
    const file = new File(['abc'], 'note.txt', { type: 'text/plain' });

    it('sends the definition and one files part per upload, with no metadata part when no facts exist', async () => {
        const form = await firstValueFrom(multipartBodyOf({ title: 'T' }, [{ file, hash: 'h1' }]));

        expect(await (form.get('definition') as Blob).text()).toBe('{"title":"T"}');
        expect((form.get('definition') as Blob).type).toBe('application/json');
        expect(form.getAll('files')).toHaveLength(1);
        expect((form.get('files') as File).name).toBe('note.txt');
        expect(form.has('fileMetadata')).toBe(false);
    });

    it('sends captured facts and the Base64 poster keyed by hash', async () => {
        const poster = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
        const form = await firstValueFrom(
            multipartBodyOf({}, [{ file, hash: 'h1', durationSeconds: 2.5, width: 10, height: 20, poster }]),
        );

        expect(JSON.parse(await (form.get('fileMetadata') as Blob).text())).toEqual([
            { hash: 'h1', duration_seconds: 2.5, width: 10, height: 20, poster: 'AQID' },
        ]);
    });
});
