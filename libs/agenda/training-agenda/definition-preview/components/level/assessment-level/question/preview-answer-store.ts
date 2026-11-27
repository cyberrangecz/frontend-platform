import { Injectable, signal, WritableSignal } from '@angular/core';
import { Question } from '@crczp/training-model';

/**
 * Holds the answers a user enters in a preview session, one writable signal per question.
 * An answer outlives the question component that shows it and lives as long as the store.
 */
@Injectable()
export class PreviewAnswerStore {
    private readonly answers = new WeakMap<Question, WritableSignal<unknown>>();

    /**
     * Returns the answer signal of the question, creating it from the initial value on first access.
     * @param question question the answer belongs to
     * @param initialValue answer of a question nobody has answered yet
     */
    answerOf<Answer>(question: Question, initialValue: Answer): WritableSignal<Answer> {
        if (!this.answers.has(question)) {
            this.answers.set(question, signal<unknown>(initialValue));
        }
        return this.answers.get(question) as WritableSignal<Answer>;
    }
}
