import { AttachmentMetadata } from './attachment-source';

/** How an attachment renders in the content. */
export type AttachmentKind = 'image' | 'video' | 'audio' | 'text' | 'file';

/** Material icon naming each kind of attachment. */
export const ATTACHMENT_KIND_ICONS: Readonly<Record<AttachmentKind, string>> = {
    image: 'image',
    video: 'movie',
    audio: 'graphic_eq',
    text: 'article',
    file: 'insert_drive_file',
};

const TEXT_EXTENSIONS = new Set(['conf', 'sh', 'bash', 'yaml', 'yml', 'json', 'ini', 'txt', 'log', 'py', 'cfg', 'toml', 'md']);
const TEXT_MEDIA_TYPES = new Set(['application/x-sh', 'application/yaml', 'application/x-yaml', 'application/json', 'application/toml']);

const TYPE_LABELS_BY_EXTENSION: ReadonlyMap<string, string> = new Map(Object.entries({
    zip: 'ZIP archive',
    gz: 'Gzip archive',
    tgz: 'Tar archive',
    raw: 'Raw binary',
    bin: 'Binary',
    pcap: 'Packet capture',
    qcow2: 'Disk image',
    pdf: 'PDF document',
    conf: 'Configuration',
    sh: 'Shell script',
    yaml: 'YAML',
    yml: 'YAML',
    json: 'JSON',
    log: 'Log file',
    txt: 'Text file',
    py: 'Python script',
    ini: 'Configuration',
    cfg: 'Configuration',
    toml: 'TOML',
    md: 'Markdown',
}));

export function extensionOf(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Picks the rendering of an attachment from its media type, falling back to its extension. */
export function attachmentKindOf({ mediaType, fileName }: AttachmentMetadata): AttachmentKind {
    for (const kind of ['image', 'video', 'audio'] as const) {
        if (mediaType.startsWith(`${kind}/`)) {
            return kind;
        }
    }
    const textual = mediaType.startsWith('text/') || TEXT_MEDIA_TYPES.has(mediaType) || TEXT_EXTENSIONS.has(extensionOf(fileName));
    return textual ? 'text' : 'file';
}

/** Short human name of an attachment's type. */
export function typeLabelOf(metadata: AttachmentMetadata): string {
    const kind = attachmentKindOf(metadata);
    const extension = extensionOf(metadata.fileName);
    if (kind === 'image' || kind === 'video' || kind === 'audio') {
        return extension ? `${extension.toUpperCase()} ${kind}` : kind.charAt(0).toUpperCase() + kind.slice(1);
    }
    return TYPE_LABELS_BY_EXTENSION.get(extension) ?? (extension ? `${extension.toUpperCase()} file` : 'File');
}

/** The size text of a stored file, followed by the saved display width when the reference sets one. */
export function chipDetailOf(sizeText: string, maxWidth: number | undefined): string {
    return maxWidth ? `${sizeText} · max ${maxWidth} px` : sizeText;
}

/** Formats a byte count in IEC units. */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const units = ['KiB', 'MiB', 'GiB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (Number(value.toFixed(1)) >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(1).replace(/\.0$/, '')} ${units[unitIndex]}`;
}

/** Formats a length in seconds as m:ss, or h:mm:ss from one hour. */
export function formatDuration(totalSeconds: number): string {
    const whole = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const seconds = String(whole % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** The stored length of an attachment, or its size when the file was stored without metadata. */
export function lengthLabelOf({ durationSeconds, size }: AttachmentMetadata): string {
    return durationSeconds === undefined ? formatBytes(size) : formatDuration(durationSeconds);
}
