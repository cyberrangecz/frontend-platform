export type ImportedLevelKind = 'info' | 'assessment' | 'training' | 'access';

export interface ImportedAttachmentsSummary {
    count: number;
    totalBytes: number;
}

/** The fields of a training definition file that the import card shows. */
export interface TrainingDefinitionImportSummary {
    title: string;
    levelCounts: Record<ImportedLevelKind, number>;
    estimatedDurationMinutes: number;
    format: 'JSON' | 'ZIP';
    fileBytes: number;
    attachments: ImportedAttachmentsSummary | null;
}
