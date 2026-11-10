import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { parse as parseYaml } from 'yaml';
import { FileImportPreview, FileReadResult, readFileAsBytes, readFileAsText } from '@crczp/components';
import { parseJsonDocument } from '@crczp/utils';
import { z } from 'zod';
import { summarizeDefinitionDocument } from './training-definition-document-summarizer';
import { ArchiveContents, readDefinitionArchive } from './training-definition-archive-reader';
import { TrainingDefinitionImportCardComponent } from './training-definition-import-card.component';
import { ImportedAttachmentsSummary, TrainingDefinitionImportSummary } from './training-definition-import-summary';

const metadataSchema = z.record(z.string(), z.unknown());
const MAX_ARCHIVE_ENTRIES = 1000;
const ARCHIVE_REJECTION = 'The file is not a readable ZIP archive';

function isArchive(file: File): boolean {
    return file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
}

function parseDefinitionText(text: string, name: string): { document: unknown } | { rejection: string } {
    if (!/\.ya?ml$/i.test(name)) {
        return parseJsonDocument(text);
    }
    try {
        return { document: parseYaml(text) };
    } catch {
        return { rejection: 'The definition in the archive is not well-formed YAML' };
    }
}

/** Previews a training definition import, a plain JSON file or a ZIP export, as one card. */
export class TrainingDefinitionImportPreview implements FileImportPreview<TrainingDefinitionImportSummary> {
    readonly cardComponent = TrainingDefinitionImportCardComponent;

    readFile(file: File): Observable<FileReadResult<TrainingDefinitionImportSummary>> {
        return isArchive(file) ? this.readArchiveFile(file) : this.readJsonFile(file);
    }

    private readJsonFile(file: File): Observable<FileReadResult<TrainingDefinitionImportSummary>> {
        return readFileAsText(file).pipe(
            map((text) => this.toResult(parseJsonDocument(text), file, 'JSON', null)),
        );
    }

    private readArchiveFile(file: File): Observable<FileReadResult<TrainingDefinitionImportSummary>> {
        return readFileAsBytes(file).pipe(
            switchMap((bytes) => readDefinitionArchive(bytes)),
            map((archive): FileReadResult<TrainingDefinitionImportSummary> => {
                const archiveRejection = this.checkArchive(archive);
                if (archiveRejection) {
                    return archiveRejection;
                }
                if (!archive.definitionDocument) {
                    return { rejection: 'The archive has no definition document' };
                }
                const attachments = this.summarizeAttachments(archive.attachmentsMetadata, archive.attachmentBytes);
                if (!attachments) {
                    return { rejection: 'The archive has no readable attachments.json' };
                }
                return this.toResult(
                    parseDefinitionText(archive.definitionDocument.text, archive.definitionDocument.name),
                    file,
                    'ZIP',
                    attachments,
                );
            }),
            catchError(() => of({ rejection: ARCHIVE_REJECTION })),
        );
    }

    private checkArchive(archive: ArchiveContents): { rejection: string } | null {
        if (archive.entryCount > MAX_ARCHIVE_ENTRIES) {
            return { rejection: `The archive has more than ${MAX_ARCHIVE_ENTRIES} entries` };
        }
        if (archive.repeatedEntryName !== null) {
            return { rejection: `The archive has the entry "${archive.repeatedEntryName}" twice` };
        }
        return archive.rootDocumentCount > 1 ? { rejection: 'The archive has more than 1 definition document' } : null;
    }

    private summarizeAttachments(metadata: string | null, totalBytes: number): ImportedAttachmentsSummary | null {
        if (metadata === null) {
            return null;
        }
        const parsed = parseJsonDocument(metadata);
        if (!('document' in parsed)) {
            return null;
        }
        const names = metadataSchema.safeParse(parsed.document);
        return names.success ? { count: Object.keys(names.data).length, totalBytes } : null;
    }

    private toResult(
        parsed: { document: unknown } | { rejection: string },
        file: File,
        format: TrainingDefinitionImportSummary['format'],
        attachments: ImportedAttachmentsSummary | null,
    ): FileReadResult<TrainingDefinitionImportSummary> {
        if ('rejection' in parsed) {
            return parsed;
        }
        const summary = summarizeDefinitionDocument(parsed.document);
        return 'rejection' in summary
            ? summary
            : { entities: [{ ...summary, format, fileBytes: file.size, attachments }] };
    }
}
