/** A file of a training definition's materials, named as the definition's content refers to it. */
export class TrainingMaterial {
    constructor(
        readonly hash: string,
        readonly fileName: string,
    ) {}
}

/** A stored material with the facts the server holds about it. */
export interface AttachmentSummary {
    readonly hash: string;
    readonly fileName: string;
    readonly mediaType: string;
    readonly sizeBytes: number;
    readonly durationSeconds?: number;
    readonly width?: number;
    readonly height?: number;
    readonly hasPoster: boolean;
}

/** The stored materials of a definition with the bytes they may take and the bytes they take. */
export interface AttachmentList {
    readonly materials: readonly AttachmentSummary[];
    readonly budgetBytes: number;
    readonly usedBytes: number;
}

/** The facts the server states about one stored file without sending its bytes. */
export interface AttachmentFileFacts {
    readonly fileName: string;
    readonly mediaType: string;
    readonly sizeBytes: number;
    readonly durationSeconds?: number;
    readonly width?: number;
    readonly height?: number;
}

/** A file picked in the browser and sent with the save of a definition, with the facts captured at pick time. */
export interface PendingAttachmentUpload {
    readonly file: File;
    /** Lowercase hexadecimal SHA-256 of the file bytes. */
    readonly hash: string;
    readonly durationSeconds?: number;
    readonly width?: number;
    readonly height?: number;
    /** JPEG, WebP or PNG image of the first frame or the downscaled image. */
    readonly poster?: Blob;
}

/** One step of a byte download: the bytes received so far, then the finished file. */
export type AttachmentTransferEvent =
    | { readonly type: 'progress'; readonly loaded: number; readonly total: number | null }
    | { readonly type: 'done'; readonly blob: Blob };

/** One step of a file upload: the bytes sent so far, then the material the server stored. */
export type AttachmentUploadEvent =
    | { readonly type: 'progress'; readonly loaded: number; readonly total: number | null }
    | { readonly type: 'done'; readonly summary: AttachmentSummary };
