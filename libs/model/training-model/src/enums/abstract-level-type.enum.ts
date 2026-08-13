export enum AbstractLevelTypeEnum {
    Access = 'linear_access',
    Training = 'linear_training',
    Assessment = 'linear_assessment',
    Info = 'linear_info',
}

/**
 * Level-type discriminator as carried by platform training events, spelled
 * differently from both the REST DTO discriminator and the model value.
 */
export enum EventLevelTypeEnum {
    Access = 'ACCESS',
    Training = 'TRAINING',
    Assessment = 'ASSESSMENT',
    Info = 'INFO',
}

/**
 * Translates the level-type discriminator of a platform training event into
 * its {@link AbstractLevelTypeEnum} counterpart.
 *
 * @param eventLevelType Level type exactly as carried by the event.
 * @returns The matching model level type.
 * @throws {Error} When the value lies outside {@link EventLevelTypeEnum}.
 */
export function levelTypeFromEvent(eventLevelType: string): AbstractLevelTypeEnum {
    switch (eventLevelType) {
        case EventLevelTypeEnum.Access:
            return AbstractLevelTypeEnum.Access;
        case EventLevelTypeEnum.Training:
            return AbstractLevelTypeEnum.Training;
        case EventLevelTypeEnum.Assessment:
            return AbstractLevelTypeEnum.Assessment;
        case EventLevelTypeEnum.Info:
            return AbstractLevelTypeEnum.Info;
        default:
            throw new Error(`Unknown event level type: ${eventLevelType}`);
    }
}
