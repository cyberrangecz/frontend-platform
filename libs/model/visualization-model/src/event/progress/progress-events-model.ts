export abstract class ProgressEvent {
    type: string;
    timestamp: number;
    trainingTime: number;
    levelId: number;
    levelNumber: number;
    traineeId: number;
    traineeName: string;

    protected constructor() {
    }

    abstract getContent(): string;
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
    hintId: number;
    hintTitle: string;

    constructor() {
        super();
        this.type = 'hint';
    }

    getContent() {
        return 'Hint <i>' + this.hintTitle + '</i> taken';
    }
}


export class SolutionDisplayedEvent extends ProgressEvent {
    constructor() {
        super();
        this.type = 'solution';
    }

    getContent() {
        return 'Solution displayed';
    }
}


export class TrainingRunEndedEvent extends ProgressEvent {
    constructor() {
        super();
    }

    getContent() {
        return '';
    }
}


export class TrainingRunStartedEvent extends ProgressEvent {
    constructor() {
        super();
    }

    getContent() {
        return '';
    }
}


export class WrongAnswerEvent extends ProgressEvent {
    declare type: string;
    answerContent: string;

    constructor() {
        super();
        this.type = 'wrong';
    }

    getContent() {
        return 'Wrong answer submitted: <i>' + this.answerContent + '</i>';
    }
}
