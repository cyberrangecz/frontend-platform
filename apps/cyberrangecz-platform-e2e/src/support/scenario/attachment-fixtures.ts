import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

/** How the editor and the trainee page render a stored file. */
export type AttachmentKind = 'image' | 'audio' | 'video' | 'text' | 'other';

export interface AttachmentFixture {
    readonly kind: AttachmentKind;
    /** Media type a file manager reports for the file. */
    readonly mimeType: string;
    readonly fileName: string;
    /** Absolute path of the file on disk. */
    readonly path: string;
    readonly bytes: Buffer;
    /** Lowercase hexadecimal SHA-256 of the bytes, the file's identity in markdown references. */
    readonly hash: string;
    /** The markdown line that places the file in content. */
    readonly reference: string;
}

const FIXTURE_DIRECTORY = resolve(__dirname, '../../resources/attachments');

function describeFixture(
    kind: AttachmentKind,
    fileName: string,
    mimeType: string,
    path: string,
    bytes: Buffer,
): AttachmentFixture {
    const hash = createHash('sha256').update(bytes).digest('hex');
    const link = `(attachment:${hash})`;
    return {
        kind,
        mimeType,
        fileName,
        path,
        bytes,
        hash,
        reference: kind === 'image' ? `![${fileName}]${link}` : `[${fileName}]${link}`,
    };
}

function fixture(kind: AttachmentKind, fileName: string, mimeType: string): AttachmentFixture {
    const path = resolve(FIXTURE_DIRECTORY, fileName);
    return describeFixture(kind, fileName, mimeType, path, readFileSync(path));
}

/** One small file of each rendering kind, committed under `src/resources/attachments`. */
export const ATTACHMENTS = {
    image: fixture('image', 'diagram.png', 'image/png'),
    audio: fixture('audio', 'tone.wav', 'audio/wav'),
    video: fixture('video', 'clip.mp4', 'video/mp4'),
    text: fixture('text', 'settings.yaml', 'text/yaml'),
    other: fixture('other', 'payload.bin', 'application/octet-stream'),
} as const;

export const ATTACHMENT_LIST: readonly AttachmentFixture[] = Object.values(ATTACHMENTS);

/** The markdown holding every given file on a line of its own. */
export function referencesOf(fixtures: readonly AttachmentFixture[]): string {
    return fixtures.map(({ reference }) => reference).join('\n\n');
}

/** An in-memory file of unknown type holding the given text, for names that must clash with a committed file. */
export function textFixtureNamed(fileName: string, text: string): AttachmentFixture {
    return describeFixture('other', fileName, 'application/octet-stream', '', Buffer.from(text));
}

/** The markdown line that places an image or file at a saved maximum display width in CSS px. */
export function referenceWithMaxWidth(file: AttachmentFixture, maxWidth: number): string {
    return file.reference.replace(`(attachment:${file.hash})`, `(attachment:${file.hash}?maxWidth=${maxWidth})`);
}

function pngChunk(type: string, data: Buffer): Buffer {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
}

/** An in-memory PNG of the given pixel size, a colour gradient generated here so no file is fetched or committed. */
export function imageFixtureOfSize(width: number, height: number): AttachmentFixture {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.writeUInt8(8, 8);
    header.writeUInt8(2, 9);
    const rowBytes = 1 + width * 3;
    const pixels = Buffer.alloc(rowBytes * height);
    for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
            const offset = row * rowBytes + 1 + column * 3;
            pixels[offset] = Math.floor((column * 255) / width);
            pixels[offset + 1] = Math.floor((row * 255) / height);
            pixels[offset + 2] = 128;
        }
    }
    const bytes = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', header),
        pngChunk('IDAT', deflateSync(pixels)),
        pngChunk('IEND', Buffer.alloc(0)),
    ]);
    return describeFixture('image', `gradient-${width}x${height}.png`, 'image/png', '', bytes);
}
