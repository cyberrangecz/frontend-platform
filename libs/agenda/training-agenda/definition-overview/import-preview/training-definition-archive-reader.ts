import { defer, Observable } from 'rxjs';
import { strFromU8, unzipSync } from 'fflate';

const ATTACHMENTS_FOLDER = 'attachments/';
const ATTACHMENTS_METADATA_ENTRY = 'attachments.json';
const DEFINITION_DOCUMENT_PATTERN = /\.(json|ya?ml)$/i;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface ArchiveContents {
    definitionDocument: { name: string; text: string } | null;
    attachmentsMetadata: string | null;
    attachmentBytes: number;
    entryCount: number;
    rootDocumentCount: number;
    /** The first entry name met a second time, ignoring case; null when every name is unique. */
    repeatedEntryName: string | null;
}

function isRootDefinitionDocument(name: string): boolean {
    return !name.includes('/') && name !== ATTACHMENTS_METADATA_ENTRY && DEFINITION_DOCUMENT_PATTERN.test(name);
}

/**
 * Opens a definition ZIP and decompresses only the root definition document and
 * `attachments.json`. Attachment entries are tallied from the archive directory and never
 * decompressed. A document above the size cap is left unread. The directory scan also counts
 * the entries and root documents and finds a repeated entry name.
 * Fails the stream when the bytes are not a readable ZIP.
 */
export function readDefinitionArchive(bytes: Uint8Array): Observable<ArchiveContents> {
    return defer(() => {
        let attachmentBytes = 0;
        let entryCount = 0;
        let rootDocumentCount = 0;
        let repeatedEntryName: string | null = null;
        const seenNames = new Set<string>();
        const entries = unzipSync(bytes, {
            filter: ({ name, originalSize }) => {
                entryCount++;
                const foldedName = name.toLowerCase();
                if (seenNames.has(foldedName)) {
                    repeatedEntryName ??= name;
                }
                seenNames.add(foldedName);
                if (isRootDefinitionDocument(name)) {
                    rootDocumentCount++;
                }
                if (name.startsWith(ATTACHMENTS_FOLDER)) {
                    if (!name.endsWith('/')) {
                        attachmentBytes += originalSize;
                    }
                    return false;
                }
                return (
                    originalSize <= MAX_DOCUMENT_BYTES &&
                    (name === ATTACHMENTS_METADATA_ENTRY || isRootDefinitionDocument(name))
                );
            },
        });
        const definitionName = Object.keys(entries).find(isRootDefinitionDocument);
        return [
            {
                definitionDocument: definitionName
                    ? { name: definitionName, text: strFromU8(entries[definitionName]) }
                    : null,
                attachmentsMetadata: entries[ATTACHMENTS_METADATA_ENTRY]
                    ? strFromU8(entries[ATTACHMENTS_METADATA_ENTRY])
                    : null,
                attachmentBytes,
                entryCount,
                rootDocumentCount,
                repeatedEntryName,
            },
        ];
    });
}
