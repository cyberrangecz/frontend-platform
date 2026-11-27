import { Question } from '@crczp/training-model';
import { describe, expect, it } from 'vitest';
import { PreviewAnswerStore } from '../definition-preview/components/level/assessment-level/question/preview-answer-store';

describe('PreviewAnswerStore', () => {
    const firstQuestion = {} as Question;
    const secondQuestion = {} as Question;

    it('starts a question with the initial value', () => {
        expect(new PreviewAnswerStore().answerOf(firstQuestion, 'initial')()).toBe('initial');
    });

    it('returns the same answer on a later access, ignoring the new initial value', () => {
        const store = new PreviewAnswerStore();
        store.answerOf(firstQuestion, 'initial').set('typed');
        expect(store.answerOf(firstQuestion, 'other')()).toBe('typed');
    });

    it('keeps the answers of different questions apart', () => {
        const store = new PreviewAnswerStore();
        store.answerOf(firstQuestion, '').set('typed');
        expect(store.answerOf(secondQuestion, '')()).toBe('');
    });

    it('starts empty in a new store', () => {
        const first = new PreviewAnswerStore();
        first.answerOf(firstQuestion, '').set('typed');
        expect(new PreviewAnswerStore().answerOf(firstQuestion, '')()).toBe('');
    });
});
