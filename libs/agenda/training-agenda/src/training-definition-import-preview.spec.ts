import { describe, expect, it, vi } from 'vitest';

vi.mock('@crczp/utils', () => import('../../../utils/misc/src/utils/functions/import-document'));
vi.mock('@crczp/components', async () => ({
    ...(await import('../../../components/src/dialog/file-upload-dialog/file-import-preview')),
    ...(await import('../../../components/src/dialog/file-upload-dialog/file-reading')),
}));
vi.mock('@crczp/markdown', () => import('../../../markdown/src/lib/attachment/byte-size.pipe'));

import { firstValueFrom } from 'rxjs';
import { strToU8, zipSync } from 'fflate';
import { TrainingDefinitionImportPreview } from '../definition-overview/import-preview/training-definition-import-preview';
import { TrainingDefinitionImportSummary } from '../definition-overview/import-preview/training-definition-import-summary';

const definitionDocument = {
    title: 'Web hacking',
    estimated_duration: 9999,
    levels: [
        { level_type: 'INFO_LEVEL', estimated_duration: 10 },
        { level_type: 'TRAINING_LEVEL', estimated_duration: 30 },
        { level_type: 'GAME_LEVEL', estimated_duration: 20 },
        { level_type: 'ASSESSMENT_LEVEL', estimated_duration: 20 },
        { level_type: 'ACCESS_LEVEL', estimated_duration: 10 },
    ],
};

function jsonFile(content: unknown, name = 'definition.json'): File {
    return new File([typeof content === 'string' ? content : JSON.stringify(content)], name);
}

function zipFile(entries: Record<string, Uint8Array>, name = 'definition.zip'): File {
    return new File([zipSync(entries) as BlobPart], name, { type: 'application/zip' });
}

function read(file: File) {
    return firstValueFrom(new TrainingDefinitionImportPreview().readFile(file));
}

describe('TrainingDefinitionImportPreview', () => {
    describe('JSON file', () => {
        it('summarizes title, level counts and the sum of the level durations', async () => {
            const result = await read(jsonFile(definitionDocument));
            const [summary] = (result as { entities: TrainingDefinitionImportSummary[] }).entities;
            expect(summary).toMatchObject({
                title: 'Web hacking',
                levelCounts: { info: 1, assessment: 1, training: 2, access: 1 },
                estimatedDurationMinutes: 90,
                format: 'JSON',
                attachments: null,
            });
        });

        it.each([
            ['malformed JSON', '{not json', 'The file is not well-formed JSON'],
            ['a missing title', { ...definitionDocument, title: '' }, 'The file has no definition title'],
            ['missing levels', { title: 'x' }, 'The file has no list of levels'],
            ['an unknown level type', { title: 'x', levels: [{ level_type: 'OTHER' }] }, 'Level 1 has no known level type'],
            [
                'a level without duration',
                { title: 'x', levels: [{ level_type: 'INFO_LEVEL' }] },
                'Level 1 has no estimated duration',
            ],
            [
                'a negative level duration',
                { title: 'x', levels: [{ level_type: 'INFO_LEVEL', estimated_duration: -5 }] },
                'Level 1 has no estimated duration',
            ],
            [
                'a fractional level duration',
                { title: 'x', levels: [{ level_type: 'INFO_LEVEL', estimated_duration: 1.5 }] },
                'Level 1 has no estimated duration',
            ],
        ])('rejects %s', async (_case, content, reason) => {
            expect(await read(jsonFile(content))).toEqual({ rejection: reason });
        });
    });

    describe('ZIP file', () => {
        const attachmentsMetadata = strToU8(JSON.stringify({ 'a.png': { fileName: 'a.png' }, 'b.mp4': {} }));
        const definitionBytes = strToU8(JSON.stringify(definitionDocument));

        it('summarizes the definition and the attachments without reading them', async () => {
            const file = zipFile({
                'definition.json': strToU8(JSON.stringify(definitionDocument)),
                'attachments.json': attachmentsMetadata,
                'attachments/a.png': new Uint8Array(100),
                'attachments/b.mp4': new Uint8Array(200),
            });
            const result = await read(file);
            const [summary] = (result as { entities: TrainingDefinitionImportSummary[] }).entities;
            expect(summary).toMatchObject({
                title: 'Web hacking',
                format: 'ZIP',
                fileBytes: file.size,
                attachments: { count: 2, totalBytes: 300 },
            });
        });

        it('rejects entry names that differ only in case', async () => {
            const file = zipFile({
                'definition.json': definitionBytes,
                'attachments.json': attachmentsMetadata,
                'attachments/A.png': new Uint8Array(1),
                'attachments/a.png': new Uint8Array(1),
            });
            expect(await read(file)).toEqual({ rejection: 'The archive has the entry "attachments/a.png" twice' });
        });

        it('reads a YAML definition document', async () => {
            const file = zipFile({
                'definition.yaml': strToU8('title: From YAML\nlevels: []\n'),
                'attachments.json': strToU8('{}'),
            });
            const result = await read(file);
            expect((result as { entities: TrainingDefinitionImportSummary[] }).entities[0]?.title).toBe('From YAML');
        });

        it.each([
            ['bytes that are not a ZIP', new File(['plain text'], 'x.zip'), 'The file is not a readable ZIP archive'],
            [
                'no definition document',
                zipFile({ 'attachments.json': attachmentsMetadata }),
                'The archive has no definition document',
            ],
            [
                'no attachments.json',
                zipFile({ 'definition.json': strToU8(JSON.stringify(definitionDocument)) }),
                'The archive has no readable attachments.json',
            ],
            [
                'two root definition documents',
                zipFile({
                    'definition.json': definitionBytes,
                    'other.yaml': strToU8('title: x'),
                    'attachments.json': attachmentsMetadata,
                }),
                'The archive has more than 1 definition document',
            ],
            [
                'more than 1000 entries',
                zipFile({
                    'definition.json': definitionBytes,
                    'attachments.json': attachmentsMetadata,
                    ...Object.fromEntries(
                        Array.from({ length: 1000 }, (_, index) => [`attachments/file-${index}.bin`, new Uint8Array(1)]),
                    ),
                }),
                'The archive has more than 1000 entries',
            ],
            [
                'an invalid definition',
                zipFile({ 'definition.json': strToU8('{"title":""}'), 'attachments.json': attachmentsMetadata }),
                'The file has no definition title',
            ],
        ])('rejects %s', async (_case, file, reason) => {
            expect(await read(file)).toEqual({ rejection: reason });
        });
    });
});
