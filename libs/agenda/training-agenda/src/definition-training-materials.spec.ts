import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TrainingAttachmentApi } from '@crczp/training-api';
import { AttachmentSummary, AttachmentUploadEvent } from '@crczp/training-model';
import { firstValueFrom, NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DefinitionLevelTexts, DefinitionTrainingMaterials } from '../internal/attachments/definition-training-materials';

vi.mock('@crczp/markdown', async () => ({
    // eslint-disable-next-line @nx/enforce-module-boundaries
    ...(await import('../../../markdown/src/lib/attachment/pending-materials')),
    // eslint-disable-next-line @nx/enforce-module-boundaries
    ...(await import('../../../markdown/src/lib/attachment/training-materials')),
    // eslint-disable-next-line @nx/enforce-module-boundaries
    ...(await import('../../../markdown/src/lib/model/attachment-references')),
}));

const DEFINITION_ID = 7;

function summaryOf(hash: string, fileName: string, sizeBytes: number): AttachmentSummary {
    return { hash, fileName, mediaType: 'text/plain', sizeBytes, hasPoster: false };
}

function levelTexts(): DefinitionLevelTexts {
    return { texts: signal([]), rewrite: vi.fn() };
}

interface Harness {
    materials: DefinitionTrainingMaterials;
    link: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
}

function harness(
    link: (hash: string, fileName: string) => Observable<AttachmentSummary | undefined>,
    upload: () => Observable<AttachmentUploadEvent> = () => NEVER,
    definitionId: () => number | undefined = () => DEFINITION_ID,
): Harness {
    const linkSpy = vi.fn((_id: number, hash: string, fileName: string) => link(hash, fileName));
    const uploadSpy = vi.fn(() => upload());
    const api = { link: linkSpy, upload: uploadSpy } as unknown as TrainingAttachmentApi;
    return { materials: new DefinitionTrainingMaterials(api, levelTexts(), definitionId), link: linkSpy, upload: uploadSpy };
}

async function pick(materials: DefinitionTrainingMaterials, name = 'notes.txt', content = 'hello'): Promise<string> {
    const { hash } = await firstValueFrom(materials.add(new File([content], name, { type: 'text/plain' })));
    return hash;
}

describe('DefinitionTrainingMaterials uploads on pick', () => {
    it('links a known hash without sending bytes', async () => {
        const { materials, upload } = harness((hash, fileName) => of(summaryOf(hash, fileName, 5)));
        const hash = await pick(materials);

        expect(upload).not.toHaveBeenCalled();
        expect(materials.pending.list()).toEqual([]);
        expect(materials.materials().map((material) => material.hash)).toEqual([hash]);
        expect(materials.transfersSettled()).toBe(true);
    });

    it('sends the hash first and uploads the bytes when the server holds no file', async () => {
        const events = new Subject<AttachmentUploadEvent>();
        const { materials, link, upload } = harness(() => of(undefined), () => events);
        const hash = await pick(materials);

        expect(link).toHaveBeenCalledWith(DEFINITION_ID, hash, 'notes.txt');
        expect(upload).toHaveBeenCalledTimes(1);
        expect(materials.transfers().get(hash)).toEqual({ status: 'uploading', progress: null });
        expect(materials.transfersSettled()).toBe(false);

        events.next({ type: 'progress', loaded: 1, total: 4 });
        expect(materials.transfers().get(hash)).toEqual({ status: 'uploading', progress: 0.25 });

        events.next({ type: 'done', summary: summaryOf(hash, 'notes.txt', 5) });
        expect(materials.transfersSettled()).toBe(true);
        expect(materials.pending.list()).toEqual([]);
        expect(materials.pendingUploads()).toEqual([]);
        expect(materials.materialsToSave().map((material) => material.hash)).toEqual([hash]);
    });

    it('uploads the bytes of one file at most once', async () => {
        const { materials, link, upload } = harness(() => of(undefined));
        await pick(materials);
        await pick(materials);

        expect(link).toHaveBeenCalledTimes(1);
        expect(upload).toHaveBeenCalledTimes(1);
    });

    it('keeps a failed upload pending, reports it and starts it again on retry', async () => {
        let attempt = 0;
        const { materials, upload } = harness(
            () => of(undefined),
            () => (attempt++ === 0 ? throwError(() => new HttpErrorResponse({ status: 413 })) : NEVER),
        );
        const hash = await pick(materials);

        expect(materials.transfers().get(hash)).toEqual({ status: 'failed', message: 'Over the materials budget.' });
        expect(materials.transfersSettled()).toBe(false);
        expect(materials.hasUnsavedChanges()).toBe(true);

        materials.retry(hash);
        expect(upload).toHaveBeenCalledTimes(2);
        expect(materials.transfers().get(hash)?.status).toBe('uploading');
    });

    it('reports a released definition when the link answers 409', async () => {
        const { materials } = harness(() => throwError(() => new HttpErrorResponse({ status: 409 })));
        const hash = await pick(materials);

        expect(materials.transfers().get(hash)).toEqual({
            status: 'failed',
            message: 'The definition is released or used by an instance.',
        });
    });

    it('settles the gate when a failed file is removed', async () => {
        const { materials } = harness(() => throwError(() => new HttpErrorResponse({ status: 500 })));
        const hash = await pick(materials);

        materials.remove(hash);

        expect(materials.transfersSettled()).toBe(true);
        expect(materials.materials()).toEqual([]);
    });

    it('stays unsaved after an upload finishes so the save still runs', async () => {
        const { materials } = harness((hash, fileName) => of(summaryOf(hash, fileName, 5)));
        await pick(materials);

        expect(materials.hasUnsavedChanges()).toBe(true);
    });

    it('sends nothing before the definition has an id and keeps the file for the multipart save', async () => {
        const { materials, link } = harness(() => of(undefined), () => NEVER, () => undefined);
        const hash = await pick(materials);

        expect(link).not.toHaveBeenCalled();
        expect(materials.transfersSettled()).toBe(true);
        expect(materials.pendingUploads().map((upload) => upload.hash)).toEqual([hash]);
    });
});
