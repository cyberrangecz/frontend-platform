import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { AttachmentFixture } from './attachment-fixtures';

export const METADATA_ENTRY = 'attachments.json';
export const ATTACHMENT_FOLDER = 'attachments/';
export const ZIP_MEDIA_TYPE = 'application/zip';

/** What `attachments.json` records about one file: only what the server cannot compute from the bytes. */
export interface ArchiveAttachmentMetadata {
    fileName: string;
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    /** Poster image bytes, Base64 encoded. */
    poster?: string | null;
}

/** The entries of a ZIP by their full path inside it. */
export type ArchiveEntries = Record<string, Uint8Array>;

/** A ZIP of the exported layout split into the roles its entries play. */
export interface ParsedArchive {
    entries: ArchiveEntries;
    documentName: string;
    document: Record<string, unknown>;
    metadata: Record<string, ArchiveAttachmentMetadata>;
    /** Attachment files by entry name, without the folder prefix. */
    files: Record<string, Uint8Array>;
}

/** Supplies the metadata of a file beyond its original name. */
export type MetadataSupplier = (file: AttachmentFixture) => Partial<ArchiveAttachmentMetadata>;

/** Packs entries into ZIP bytes, keeping each path exactly as given. */
export function zipOf(entries: ArchiveEntries): Buffer {
    return Buffer.from(zipSync(entries, { level: 0 }));
}

/**
 * The entries of a well-formed archive of a definition document and the given files. Each file
 * is stored under its own file name; a clash with an earlier entry gets ` (n)` before the last
 * extension, compared case-insensitively.
 */
export function archiveEntriesOf(
    document: Record<string, unknown>,
    files: readonly AttachmentFixture[],
    metadataOf: MetadataSupplier = () => ({}),
): ArchiveEntries {
    const entries: ArchiveEntries = {
        [`${String(document['title'])}.json`]: strToU8(JSON.stringify(document)),
    };
    const metadata: Record<string, ArchiveAttachmentMetadata> = {};
    for (const file of files) {
        const entryName = uniqueEntryName(file.fileName, Object.keys(metadata));
        entries[`${ATTACHMENT_FOLDER}${entryName}`] = file.bytes;
        metadata[entryName] = { fileName: file.fileName, ...metadataOf(file) };
    }
    entries[METADATA_ENTRY] = strToU8(JSON.stringify(metadata));
    return entries;
}

/** The ZIP bytes of a well-formed archive; see `archiveEntriesOf`. */
export function archiveOf(
    document: Record<string, unknown>,
    files: readonly AttachmentFixture[],
    metadataOf?: MetadataSupplier,
): Buffer {
    return zipOf(archiveEntriesOf(document, files, metadataOf));
}

function uniqueEntryName(fileName: string, taken: readonly string[]): string {
    const takenLowercase = new Set(taken.map((name) => name.toLowerCase()));
    const extensionStart = fileName.lastIndexOf('.');
    const stem = extensionStart > 0 ? fileName.slice(0, extensionStart) : fileName;
    const extension = extensionStart > 0 ? fileName.slice(extensionStart) : '';
    let candidate = fileName;
    for (let suffix = 1; takenLowercase.has(candidate.toLowerCase()); suffix++) {
        candidate = `${stem} (${suffix})${extension}`;
    }
    return candidate;
}

/** Reads a ZIP of the exported layout; throws when the bytes break that layout. */
export function parseArchive(bytes: Uint8Array): ParsedArchive {
    const entries = unzipSync(bytes);
    const documentNames = Object.keys(entries).filter(
        (name) => /^[^/]+\.(json|ya?ml)$/i.test(name) && name !== METADATA_ENTRY,
    );
    if (documentNames.length !== 1 || !entries[METADATA_ENTRY]) {
        throw new Error(
            `The archive does not hold one definition document and ${METADATA_ENTRY}: ${Object.keys(entries).join(', ')}`,
        );
    }
    const documentName = documentNames[0];
    return {
        entries,
        documentName,
        document: JSON.parse(strFromU8(entries[documentName])) as Record<string, unknown>,
        metadata: JSON.parse(strFromU8(entries[METADATA_ENTRY])) as Record<string, ArchiveAttachmentMetadata>,
        files: Object.fromEntries(
            Object.entries(entries)
                .filter(([name]) => name.startsWith(ATTACHMENT_FOLDER))
                .map(([name, content]) => [name.slice(ATTACHMENT_FOLDER.length), content]),
        ),
    };
}

/** The same archive with the definition document carrying another title and file name. */
export function retitledArchive(bytes: Uint8Array, title: string): Buffer {
    const { entries, documentName, document } = parseArchive(bytes);
    return zipOf({
        ...withoutEntry(entries, documentName),
        [`${title}.json`]: strToU8(JSON.stringify({ ...document, title })),
    });
}

/** The entries of an archive without the one at this path. */
export function withoutEntry(entries: ArchiveEntries, path: string): ArchiveEntries {
    return Object.fromEntries(Object.entries(entries).filter(([name]) => name !== path));
}
