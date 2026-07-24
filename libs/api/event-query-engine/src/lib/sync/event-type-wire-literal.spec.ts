import { PlatformEventType } from '@crczp/visualization-model';
import { toWireEventType } from './event-type-wire-literal';

describe('toWireEventType', () => {
    it('maps TRAINING_RUN_STARTED to training_run_started', () => {
        expect(toWireEventType(PlatformEventType.TRAINING_RUN_STARTED)).toBe('training_run_started');
    });

    it('maps TRAINING_RUN_RESUMED to training_run_resumed', () => {
        expect(toWireEventType(PlatformEventType.TRAINING_RUN_RESUMED)).toBe('training_run_resumed');
    });

    it('maps TRAINING_RUN_ENDED to training_run_finished (non-mechanical: ended vs finished)', () => {
        expect(toWireEventType(PlatformEventType.TRAINING_RUN_ENDED)).toBe('training_run_finished');
    });

    it('maps LEVEL_STARTED to level_started', () => {
        expect(toWireEventType(PlatformEventType.LEVEL_STARTED)).toBe('level_started');
    });

    it('maps LEVEL_COMPLETED to level_completed', () => {
        expect(toWireEventType(PlatformEventType.LEVEL_COMPLETED)).toBe('level_completed');
    });

    it('maps CORRECT_ANSWER_SUBMITTED to correct_answer_submitted', () => {
        expect(toWireEventType(PlatformEventType.CORRECT_ANSWER_SUBMITTED)).toBe('correct_answer_submitted');
    });

    it('maps WRONG_ANSWER_SUBMITTED to wrong_answer_submitted', () => {
        expect(toWireEventType(PlatformEventType.WRONG_ANSWER_SUBMITTED)).toBe('wrong_answer_submitted');
    });

    it('maps HINT_TAKEN to hint_taken', () => {
        expect(toWireEventType(PlatformEventType.HINT_TAKEN)).toBe('hint_taken');
    });

    it('maps SOLUTION_DISPLAYED to solution_displayed', () => {
        expect(toWireEventType(PlatformEventType.SOLUTION_DISPLAYED)).toBe('solution_displayed');
    });

    it('maps ASSESSMENT_ANSWERS to assessment_answered (non-mechanical: answers vs answered)', () => {
        expect(toWireEventType(PlatformEventType.ASSESSMENT_ANSWERS)).toBe('assessment_answered');
    });

    it('maps COMMAND to COMMAND (uppercase, not snake_case)', () => {
        expect(toWireEventType(PlatformEventType.COMMAND)).toBe('COMMAND');
    });
});
