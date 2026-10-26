import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const hintSchema = z.looseObject({
    title: z.string(),
    content: z.string(),
    hint_penalty: z.number(),
    order: z.number(),
});

const choiceSchema = z.looseObject({ text: z.string(), correct: z.boolean(), order: z.number() });

const questionSchema = z.looseObject({
    question_type: z.enum(['FFQ', 'MCQ', 'EMI']),
    order: z.number(),
    text: z.string(),
    points: z.number(),
    penalty: z.number(),
    choices: z.array(choiceSchema).optional(),
    extended_matching_options: z.array(z.looseObject({ text: z.string(), order: z.number() })).optional(),
    extended_matching_statements: z
        .array(z.looseObject({ text: z.string(), order: z.number(), correct_option_order: z.number() }))
        .optional(),
});

const levelSchema = z.discriminatedUnion('level_type', [
    z.looseObject({ level_type: z.literal('INFO_LEVEL'), title: z.string() }),
    z.looseObject({ level_type: z.literal('ACCESS_LEVEL'), title: z.string(), passkey: z.string() }),
    z.looseObject({
        level_type: z.literal('TRAINING_LEVEL'),
        title: z.string(),
        content: z.string(),
        solution: z.string(),
        answer: z.string().nullable(),
        variant_answers: z.boolean(),
        answer_variable_name: z.string().optional(),
        max_score: z.number(),
        solution_penalized: z.boolean(),
        hints: z.array(hintSchema),
    }),
    z.looseObject({
        level_type: z.literal('ASSESSMENT_LEVEL'),
        title: z.string(),
        questions: z.array(questionSchema),
    }),
]);

const documentSchema = z.looseObject({ levels: z.array(levelSchema) });

type Level = z.infer<typeof levelSchema>;
type LevelOfType<Type extends Level['level_type']> = Extract<Level, { level_type: Type }>;

const trainingDocument = documentSchema.parse(
    parse(readFileSync(resolve(__dirname, '../../resources/shared-training.yaml'), 'utf8')),
);

function levelsOfType<Type extends Level['level_type']>(
    type: Type,
    accept: (level: LevelOfType<Type>) => boolean = () => true,
): LevelOfType<Type>[] {
    return trainingDocument.levels.filter((level): level is LevelOfType<Type> => level.level_type === type).filter(accept);
}

function onlyLevel<Type extends Level['level_type']>(
    description: string,
    type: Type,
    accept?: (level: LevelOfType<Type>) => boolean,
): LevelOfType<Type> {
    const matches = levelsOfType(type, accept);
    const [match] = matches;
    if (matches.length !== 1 || !match) {
        throw new Error(`shared-training.yaml must hold exactly one ${description}, found ${matches.length}`);
    }
    return match;
}

function requiredAnswer(level: LevelOfType<'TRAINING_LEVEL'>): string {
    if (level.answer === null) {
        throw new Error(`Level "${level.title}" of shared-training.yaml has no static answer`);
    }
    return level.answer;
}

const staticTrainingLevels = levelsOfType('TRAINING_LEVEL', (level) => !level.variant_answers);
const [firstTrainingLevel, secondTrainingLevel] = staticTrainingLevels;
if (staticTrainingLevels.length !== 2 || !firstTrainingLevel || !secondTrainingLevel) {
    throw new Error(`shared-training.yaml must hold exactly 2 static training levels, found ${staticTrainingLevels.length}`);
}

export const SHARED_TRAINING_LEVELS = {
    info: onlyLevel('info level', 'INFO_LEVEL'),
    access: onlyLevel('access level', 'ACCESS_LEVEL'),
    firstTraining: firstTrainingLevel,
    secondTraining: secondTrainingLevel,
    variantTraining: onlyLevel('variant training level', 'TRAINING_LEVEL', (level) => level.variant_answers),
    assessment: onlyLevel('assessment level', 'ASSESSMENT_LEVEL'),
};

export const SHARED_TRAINING_LEVEL_TITLES = {
    info: SHARED_TRAINING_LEVELS.info.title,
    access: SHARED_TRAINING_LEVELS.access.title,
    firstTraining: SHARED_TRAINING_LEVELS.firstTraining.title,
    secondTraining: SHARED_TRAINING_LEVELS.secondTraining.title,
    variantTraining: SHARED_TRAINING_LEVELS.variantTraining.title,
    assessment: SHARED_TRAINING_LEVELS.assessment.title,
};

/** The titles of the shared training's levels in the order the trainee plays them. */
export const SHARED_TRAINING_LEVEL_ORDER: readonly string[] = trainingDocument.levels.map((level) => level.title);

/** The hints every training level of the shared training carries, in hint order. */
export const SHARED_TRAINING_HINTS = [...SHARED_TRAINING_LEVELS.firstTraining.hints].sort(
    (left, right) => left.order - right.order,
);

const assessmentQuestions = SHARED_TRAINING_LEVELS.assessment.questions;

function questionOfType(type: 'FFQ' | 'MCQ' | 'EMI'): (typeof assessmentQuestions)[number] {
    const question = assessmentQuestions.find((candidate) => candidate.question_type === type);
    if (!question) {
        throw new Error(`The assessment of shared-training.yaml holds no ${type} question`);
    }
    return question;
}

function correctChoiceText(type: 'FFQ' | 'MCQ'): string {
    const choice = questionOfType(type).choices?.find((candidate) => candidate.correct);
    if (!choice) {
        throw new Error(`The ${type} question of shared-training.yaml has no correct choice`);
    }
    return choice.text;
}

const matchingQuestion = questionOfType('EMI');

/** Statement to option text pairs of the extended matching question's correct answer. */
const correctMatching: Record<string, string> = Object.fromEntries(
    (matchingQuestion.extended_matching_statements ?? []).map((statement) => {
        const option = matchingQuestion.extended_matching_options?.find(
            (candidate) => candidate.order === statement.correct_option_order,
        );
        if (!option) {
            throw new Error(`Statement "${statement.text}" of shared-training.yaml names no existing option`);
        }
        return [statement.text, option.text];
    }),
);

/** The answers a trainee needs to solve the shared training's levels with a static answer. */
export const SHARED_TRAINING_ANSWERS = {
    accessPasskey: SHARED_TRAINING_LEVELS.access.passkey,
    firstFlag: requiredAnswer(SHARED_TRAINING_LEVELS.firstTraining),
    secondFlag: requiredAnswer(SHARED_TRAINING_LEVELS.secondTraining),
    freeFormAnswer: correctChoiceText('FFQ'),
    multipleChoiceCorrect: correctChoiceText('MCQ'),
    extendedMatching: correctMatching,
};

/** Points of every assessment question, in question order. */
export const SHARED_TRAINING_QUESTION_POINTS = [...assessmentQuestions]
    .sort((left, right) => left.order - right.order)
    .map((question) => question.points);

/** Builds the import body of the shared training definition under the given title. */
export function sharedTrainingImport(title: string) {
    return { ...trainingDocument, title };
}
