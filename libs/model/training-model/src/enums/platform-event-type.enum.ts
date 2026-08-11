/** Wire discriminator of a training event emitted by the platform. */
export enum PlatformEventType {
    TRAINING_RUN_STARTED = 'TrainingRunStarted',
    TRAINING_RUN_RESUMED = 'TrainingRunResumed',
    TRAINING_RUN_ENDED = 'TrainingRunEnded',
    LEVEL_STARTED = 'LevelStarted',
    LEVEL_COMPLETED = 'LevelCompleted',
    CORRECT_ANSWER_SUBMITTED = 'CorrectAnswerSubmitted',
    WRONG_ANSWER_SUBMITTED = 'WrongAnswerSubmitted',
    HINT_TAKEN = 'HintTaken',
    SOLUTION_DISPLAYED = 'SolutionDisplayed',
    ASSESSMENT_ANSWERS = 'AssessmentAnswers',
    COMMAND = 'Command',
}
