import { PlatformEventType } from '@crczp/visualization-model';

export const EVENT_TYPE_WIRE_LITERAL: Record<PlatformEventType, string> = {
    [PlatformEventType.TRAINING_RUN_STARTED]: 'training_run_started',
    [PlatformEventType.TRAINING_RUN_RESUMED]: 'training_run_resumed',
    [PlatformEventType.TRAINING_RUN_ENDED]: 'training_run_finished',
    [PlatformEventType.LEVEL_STARTED]: 'level_started',
    [PlatformEventType.LEVEL_COMPLETED]: 'level_completed',
    [PlatformEventType.CORRECT_ANSWER_SUBMITTED]: 'correct_answer_submitted',
    [PlatformEventType.WRONG_ANSWER_SUBMITTED]: 'wrong_answer_submitted',
    [PlatformEventType.HINT_TAKEN]: 'hint_taken',
    [PlatformEventType.SOLUTION_DISPLAYED]: 'solution_displayed',
    [PlatformEventType.ASSESSMENT_ANSWERS]: 'assessment_answered',
    [PlatformEventType.COMMAND]: 'COMMAND',
};

export function toWireEventType(eventType: PlatformEventType): string {
    return EVENT_TYPE_WIRE_LITERAL[eventType];
}
