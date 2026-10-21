import {
    AbstractLevelTypeEnum,
    AccessLevel,
    AssessmentLevel,
    AssessmentTypeEnum,
    InfoLevel,
    Level,
    TrainingLevel,
} from '@crczp/training-model';

/**
 * Builds a level of the given type holding placeholder content for the designer to replace.
 * The level carries no id; the backend issues one when the definition is saved.
 * @param levelType type of the level to build
 */
export function createNewLevel(levelType: AbstractLevelTypeEnum): Level {
    switch (levelType) {
        case AbstractLevelTypeEnum.Info:
            return createInfoLevel();
        case AbstractLevelTypeEnum.Access:
            return createAccessLevel();
        case AbstractLevelTypeEnum.Training:
            return createTrainingLevel();
        case AbstractLevelTypeEnum.Assessment:
            return createAssessmentLevel();
        default:
            throw new TypeError(`Unsupported level type "${levelType}"`);
    }
}

/**
 * Builds the introductory info level and the access level a new training definition starts with.
 */
export function createDefaultLevels(): Level[] {
    return [createInfoLevel(), createAccessLevel()];
}

function createInfoLevel(): InfoLevel {
    const level = new InfoLevel();
    level.type = AbstractLevelTypeEnum.Info;
    level.title = 'Introduction level';
    level.content =
        "Welcome to the CyberRangeCZ Platform. We've prepared training composed of multiple types of levels. In training levels, you need to read an assignment and find an answer to process to the next level.";
    level.estimatedDuration = 0;
    return level;
}

function createAccessLevel(): AccessLevel {
    const level = new AccessLevel();
    level.type = AbstractLevelTypeEnum.Access;
    level.title = 'Get Access';
    level.passkey = 'start-training';
    level.cloudContent =
        'For accessing CyberRangeCZ Platform virtual machines using your local command-line tool, click on `Get SSH access` button to download ZIP file and then follow the instructions in the [documentation](https://docs.platform.cyberrange.cz/user-guide-advanced/sandboxes/sandbox-access/#user-access). When you are ready to advance to the next phase, submit the answer provided by the organizer.';
    level.localContent =
        'Before proceeding further, you need to start a sandbox on your machine. \nPlease clone [this Gitlab repository](https://<link_to_a_repo>) and follow steps in the README file.\nWhen your sandbox is ready at your host, submit the passkey from the README file.';
    level.estimatedDuration = 0;
    return level;
}

function createTrainingLevel(): TrainingLevel {
    const level = new TrainingLevel();
    level.type = AbstractLevelTypeEnum.Training;
    level.title = 'Title of training level';
    level.maxScore = 100;
    level.incorrectAnswerLimit = 100;
    level.answer = 'Secret answer';
    level.isSolutionPenalized = true;
    level.solution = 'Solution of the training should be here';
    level.content = 'The test entry should be here';
    level.estimatedDuration = 1;
    return level;
}

function createAssessmentLevel(): AssessmentLevel {
    const level = new AssessmentLevel();
    level.type = AbstractLevelTypeEnum.Assessment;
    level.title = 'Title of assessment level';
    level.maxScore = 0;
    level.assessmentType = AssessmentTypeEnum.Questionnaire;
    level.instructions = 'Instructions should be here';
    level.estimatedDuration = 1;
    return level;
}
