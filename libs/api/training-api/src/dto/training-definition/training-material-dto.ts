export interface TrainingMaterialDTO {
    hash: string;
    file_name: string;
}

export interface AttachmentSummaryDTO {
    hash: string;
    file_name: string;
    media_type: string;
    size_bytes: number;
    duration_seconds?: number;
    width?: number;
    height?: number;
    has_poster: boolean;
}

export interface AttachmentListDTO {
    materials: AttachmentSummaryDTO[];
    budget_bytes: number;
    used_bytes: number;
}

/** Media facts captured in the browser for one file of a multipart save; the poster is Base64. */
export interface AttachmentFileMetadataDTO {
    hash: string;
    duration_seconds?: number;
    width?: number;
    height?: number;
    poster?: string;
}
