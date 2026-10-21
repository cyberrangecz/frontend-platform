export type TrainingDefinitionSort =
    | 'id'
    | 'title'
    | 'description'
    | 'state'
    | 'estimatedDuration'
    | 'lastEdited'
    | 'lastEditedBy'
    | 'createdAt';

export type TrainingInstanceSort =
    | 'id'
    | 'title'
    | 'startTime'
    | 'endTime'
    | 'poolId'
    | 'accessToken'
    | 'lastEdited'
    | 'lastEditedBy'
    | 'localEnvironment'
    | 'sandboxDefinitionId'
    | 'showStepperBar'
    | 'backwardMode';

export type TrainingRunSort =
    | 'id'
    | 'startTime'
    | 'endTime'
    | 'state'
    | 'incorrectAnswerCount'
    | 'solutionTaken'
    | 'totalTrainingScore'
    | 'totalAssessmentScore'
    | 'maxLevelScore'
    | 'currentPenalty'
    | 'hasDetectionEvent';

export type AccessedTrainingRunSort = TrainingRunSort | 'trainingInstance.title';

export type CheatingDetectionSort =
    | 'id'
    | 'executeTime'
    | 'executedBy'
    | 'proximityThreshold'
    | 'currentState'
    | 'results'
    | 'answerSimilarityState'
    | 'locationSimilarityState'
    | 'timeProximityState'
    | 'minimalSolveTimeState'
    | 'forbiddenCommandsState'
    | 'noCommandsState';

export type AbstractDetectionEventSort =
    | 'id'
    | 'detectedAt'
    | 'levelId'
    | 'levelOrder'
    | 'levelTitle'
    | 'participantCount'
    | 'detectionEventType'
    | 'trainingRunId';

export type DetectedForbiddenCommandSort =
    | 'id'
    | 'command'
    | 'type'
    | 'hostname'
    | 'occurredAt';

export type DetectionEventParticipantSort =
    | 'id'
    | 'occurredAt'
    | 'participantName'
    | 'ipAddress'
    | 'solvedInTime'
    | 'userId';

export type UserRefSort =
    | 'id'
    | 'sub'
    | 'iss'
    | 'fullName'
    | 'givenName'
    | 'familyName'
    | 'mail'
    | 'status'
    | 'externalId';
