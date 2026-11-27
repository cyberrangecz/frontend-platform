import { AccessLevel, AssessmentLevel, Hint, InfoLevel, Level, Question, TrainingLevel } from '@crczp/training-model';

type MarkdownTransform = (markdown: string) => string;

/**
 * Copies the level with every markdown text it holds passed through the transform: the content of
 * info, training and access levels, the solution, the hints, the assessment instructions and the
 * question titles. Nested hints and questions are copied too; texts that are not set stay as they are.
 */
export function withTransformedMarkdown(level: Level, transform: MarkdownTransform): Level {
    const apply = (text: string): string => (typeof text === 'string' ? transform(text) : text);
    if (level instanceof InfoLevel) {
        return copyWith(level, { content: apply(level.content) });
    }
    if (level instanceof AccessLevel) {
        return copyWith(level, { cloudContent: apply(level.cloudContent), localContent: apply(level.localContent) });
    }
    if (level instanceof TrainingLevel) {
        return copyWith(level, {
            content: apply(level.content),
            solution: apply(level.solution),
            hints: level.hints?.map((hint: Hint) => copyWith(hint, { content: apply(hint.content) })),
        });
    }
    if (level instanceof AssessmentLevel) {
        return copyWith(level, {
            instructions: apply(level.instructions),
            questions: level.questions?.map((question: Question) => copyWith(question, { title: apply(question.title) })),
        });
    }
    return level;
}

/** Every markdown text of the level, in the order the level holds them. */
export function markdownTextsOf(level: Level): string[] {
    const texts: string[] = [];
    withTransformedMarkdown(level, (markdown) => {
        texts.push(markdown);
        return markdown;
    });
    return texts;
}

function copyWith<T extends object>(source: T, changes: Partial<T>): T {
    return Object.assign(Object.create(Object.getPrototypeOf(source)), source, changes);
}
