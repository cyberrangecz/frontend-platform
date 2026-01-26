export abstract class ProgressEvent {
    timestamp: number;
    trainingTime: number;
    levelId: number;
    levelNumber: number;
    traineeId: number;
    traineeName: string;

    protected constructor(
        public type: ProgressEventType,
        public description: string,
    ) {}
}

export enum ProgressEventType {
    TrainingRunStarted = 'cz.cyberrange.platform.events.trainings.TrainingRunStarted',
    TrainingRunFinished = 'cz.cyberrange.platform.events.trainings.TrainingRunEnded',
    AssessmentAnswers = 'cz.cyberrange.platform.events.trainings.AssessmentAnswers',
    TrainingExited = 'cz.cyberrange.platform.events.trainings.TrainingRunSurrendered',
    HintTaken = 'cz.cyberrange.platform.events.trainings.HintTaken',
    WrongAnswer = 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted',
    LevelStarted = 'cz.cyberrange.platform.events.trainings.LevelStarted',
    LevelCompleted = 'cz.cyberrange.platform.events.trainings.LevelCompleted',
    CorrectFlag = 'cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted',
    SolutionDisplayed = 'cz.cyberrange.platform.events.trainings.SolutionDisplayed',
}

export class HintTakenEvent extends ProgressEvent {
    constructor(
        public hintId: number,
        public hintTitle: string,
    ) {
        super(
            ProgressEventType.HintTaken,
            'Hint taken: <span style="color: #d3b102;"><i>' +
                hintTitle +
                '</i></span>',
        );
    }
}

export class SolutionDisplayedEvent extends ProgressEvent {
    constructor() {
        super(ProgressEventType.SolutionDisplayed, 'Solution displayed');
    }
}

export class TrainingRunEndedEvent extends ProgressEvent {
    constructor() {
        super(ProgressEventType.TrainingRunFinished, 'Training run ended');
    }
}

export class TrainingRunStartedEvent extends ProgressEvent {
    constructor() {
        super(ProgressEventType.TrainingRunStarted, 'Training run started');
    }
}

export class WrongAnswerEvent extends ProgressEvent {
    constructor(public answerContent: string) {
        super(
            ProgressEventType.WrongAnswer,
            'Wrong answer submitted: <span style="color: red;"><i>' +
                answerContent +
                '</i></span>',
        );
    }
}

export class LevelStartedEvent extends ProgressEvent {
    constructor() {
        super(ProgressEventType.LevelStarted, 'Level started');
    }
}

export class LevelCompletedEvent extends ProgressEvent {
    constructor() {
        super(ProgressEventType.LevelCompleted, 'Level completed');
    }
}

export class CorrectFlagEvent extends ProgressEvent {
    constructor(public answerContent: string) {
        super(
            ProgressEventType.CorrectFlag,
            'Correct flag submitted: <span style="color: green;"><i>' +
                answerContent +
                '</i></span>',
        );
    }
}
