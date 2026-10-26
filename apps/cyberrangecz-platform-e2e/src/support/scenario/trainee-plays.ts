import type { BrowserKey } from '../accounts';
import { SHARED_TRAINING_ANSWERS } from './shared-training-loader';

/** Base of the wrong flags submitted on the first training level. */
export const WRONG_FLAG = 'e2e-wrong-flag';

/** The incorrect passkey every trainee submits on the access level; it counts as one wrong answer. */
export const WRONG_PASSKEY = 'wrong-passkey';

/**
 * How one browser's trainee plays the shared training. The three plays differ so that the
 * organiser's results, progress and visualizations show distinguishable trainees.
 */
export interface TraineePlay {
    /** Hints taken on the first training level, in hint order. */
    hintsOnFirstTraining: number;
    /** Wrong flags submitted on the first training level before the right one. */
    wrongAnswersOnFirstTraining: number;
    /** Whether the trainee displays the solution of the second training level before answering. */
    showsSolutionOnSecondTraining: boolean;
    assessment: {
        freeForm: string;
        multipleChoice: string;
        extendedMatching: Record<string, string>;
    };
}

const CORRECT_ASSESSMENT = {
    freeForm: SHARED_TRAINING_ANSWERS.freeFormAnswer,
    multipleChoice: SHARED_TRAINING_ANSWERS.multipleChoiceCorrect,
    extendedMatching: { ...SHARED_TRAINING_ANSWERS.extendedMatching },
};

export const TRAINEE_PLAYS: Record<BrowserKey, TraineePlay> = {
    chromium: {
        hintsOnFirstTraining: 1,
        wrongAnswersOnFirstTraining: 1,
        showsSolutionOnSecondTraining: false,
        assessment: CORRECT_ASSESSMENT,
    },
    firefox: {
        hintsOnFirstTraining: 0,
        wrongAnswersOnFirstTraining: 0,
        showsSolutionOnSecondTraining: true,
        assessment: {
            freeForm: 'udp',
            multipleChoice: 'DNS',
            extendedMatching: { ...SHARED_TRAINING_ANSWERS.extendedMatching },
        },
    },
    webkit: {
        hintsOnFirstTraining: 2,
        wrongAnswersOnFirstTraining: 2,
        showsSolutionOnSecondTraining: false,
        assessment: {
            ...CORRECT_ASSESSMENT,
            extendedMatching: { 'Port 22': 'HTTP', 'Port 80': 'SSH' },
        },
    },
};
