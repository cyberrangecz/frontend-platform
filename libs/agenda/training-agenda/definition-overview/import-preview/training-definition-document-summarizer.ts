import { nonBlankStringSchema } from '@crczp/utils';
import { z } from 'zod';
import { ImportedLevelKind, TrainingDefinitionImportSummary } from './training-definition-import-summary';

const LEVEL_KIND_BY_TYPE: Readonly<Record<string, ImportedLevelKind>> = {
    INFO_LEVEL: 'info',
    ASSESSMENT_LEVEL: 'assessment',
    TRAINING_LEVEL: 'training',
    GAME_LEVEL: 'training',
    ACCESS_LEVEL: 'access',
};

type DocumentSummary = Pick<
    TrainingDefinitionImportSummary,
    'title' | 'levelCounts' | 'estimatedDurationMinutes'
>;

const titleSchema = z.object({ title: nonBlankStringSchema });
const levelsSchema = z.object({ levels: z.array(z.unknown()) });

const levelTypeSchema = z.object({
    level_type: z.string().refine((type) => type in LEVEL_KIND_BY_TYPE),
});

const levelDurationSchema = z.object({ estimated_duration: z.number().int().min(0) });

/**
 * Reads the title, level kinds and total duration of a parsed definition document.
 * Checks only that these fields are present and of the expected type. The duration is the sum
 * of the level durations; the document's own duration is ignored, as the server does.
 */
export function summarizeDefinitionDocument(document: unknown): DocumentSummary | { rejection: string } {
    const title = titleSchema.safeParse(document);
    if (!title.success) {
        return { rejection: 'The file has no definition title' };
    }
    const levels = levelsSchema.safeParse(document);
    if (!levels.success) {
        return { rejection: 'The file has no list of levels' };
    }
    const levelCounts: Record<ImportedLevelKind, number> = { info: 0, assessment: 0, training: 0, access: 0 };
    let estimatedDurationMinutes = 0;
    for (const [index, level] of levels.data.levels.entries()) {
        const levelType = levelTypeSchema.safeParse(level);
        if (!levelType.success) {
            return { rejection: `Level ${index + 1} has no known level type` };
        }
        const levelDuration = levelDurationSchema.safeParse(level);
        if (!levelDuration.success) {
            return { rejection: `Level ${index + 1} has no estimated duration` };
        }
        levelCounts[LEVEL_KIND_BY_TYPE[levelType.data.level_type] as ImportedLevelKind]++;
        estimatedDurationMinutes += levelDuration.data.estimated_duration;
    }
    return { title: title.data.title, levelCounts, estimatedDurationMinutes };
}
