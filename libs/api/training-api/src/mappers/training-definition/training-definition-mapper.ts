import {
    TrainingDefinition,
    TrainingDefinitionWithLevels,
    TrainingDefinitionStateEnum,
} from '@crczp/training-model';
import { TrainingDefinitionCreateDTO } from '../../dto/training-definition/training-definition-create-dto';
import {
    TrainingDefinitionDTO,
    TrainingDefinitionDTOStateEnum,
    TrainingDefinitionWithLevelsDTO,
} from '../../dto/training-definition/training-definition-dto';
import { TrainingDefinitionUpdateDTO } from '../../dto/training-definition/training-definition-update-dto';
import { LevelMapper } from '../level/level-mapper';

/**
 * @dynamic
 */
export class TrainingDefinitionMapper {
    static fromDTO(dto: TrainingDefinitionDTO): TrainingDefinition {
        const result = new TrainingDefinition();
        TrainingDefinitionMapper.assignSharedAttributes(result, dto);
        return result;
    }

    static fromDTOs(dtos: TrainingDefinitionDTO[]): TrainingDefinition[] {
        return dtos.map((dto) => TrainingDefinitionMapper.fromDTO(dto));
    }

    static withLevelsFromDTO(
        dto: TrainingDefinitionWithLevelsDTO,
    ): TrainingDefinitionWithLevels {
        const result = new TrainingDefinitionWithLevels();
        TrainingDefinitionMapper.assignSharedAttributes(result, dto);
        if (dto.levels) {
            result.levels = LevelMapper.fromDTOs(dto.levels);
        }
        return result;
    }

    static withLevelsFromDTOs(
        dtos: TrainingDefinitionWithLevelsDTO[],
    ): TrainingDefinitionWithLevels[] {
        return dtos.map((dto) => TrainingDefinitionMapper.withLevelsFromDTO(dto));
    }

    private static assignSharedAttributes(
        target: TrainingDefinition,
        dto: TrainingDefinitionDTO,
    ): void {
        target.id = dto.id;
        target.title = dto.title;
        target.description = dto.description;
        target.prerequisites = dto.prerequisites ? dto.prerequisites : [];
        target.outcomes = dto.outcomes ? dto.outcomes : [];
        target.state = TrainingDefinitionMapper.stateFromDTO(dto.state);
        target.lastEditTime = dto.last_edited;
        target.estimatedDuration = dto.estimated_duration;
        target.lastEditBy = dto.last_edited_by;
        target.createdAt = dto.created_at;
    }

    static stateFromDTO(
        stateDTO: TrainingDefinitionDTOStateEnum,
    ): TrainingDefinitionStateEnum {
        switch (stateDTO) {
            case TrainingDefinitionDTOStateEnum.ARCHIVED:
                return TrainingDefinitionStateEnum.Archived;
            case TrainingDefinitionDTOStateEnum.RELEASED:
                return TrainingDefinitionStateEnum.Released;
            case TrainingDefinitionDTOStateEnum.UNRELEASED:
                return TrainingDefinitionStateEnum.Unreleased;
            default: {
                console.error(
                    `Attribute "state" of TrainingDefinitionWithLevelsDTO with value: ${stateDTO}
                    does not match any of the TrainingDefinitionWithLevels states`,
                );
                return undefined;
            }
        }
    }

    static stateToDTO(
        state: TrainingDefinitionStateEnum,
    ): TrainingDefinitionDTOStateEnum {
        switch (state) {
            case TrainingDefinitionStateEnum.Unreleased:
                return TrainingDefinitionDTOStateEnum.UNRELEASED;
            case TrainingDefinitionStateEnum.Released:
                return TrainingDefinitionDTOStateEnum.RELEASED;
            case TrainingDefinitionStateEnum.Archived:
                return TrainingDefinitionDTOStateEnum.ARCHIVED;
            default: {
                console.error(
                    `Attribute "state" of TrainingDefinitionWithLevels with value ${state} does not match any of the TrainingDefinitionWithLevelsDTO states`,
                );
                return undefined;
            }
        }
    }

    static toUpdateDTO(
        trainingDefinition: TrainingDefinitionWithLevels,
    ): TrainingDefinitionUpdateDTO {
        const result = new TrainingDefinitionUpdateDTO();
        result.id = trainingDefinition.id;
        result.description = trainingDefinition.description;
        result.prerequisites = trainingDefinition.prerequisites.filter(
            (prerequisite) => prerequisite.length > 1,
        );
        result.outcomes = trainingDefinition.outcomes.filter(
            (outcome) => outcome.length > 1,
        );
        result.state = TrainingDefinitionMapper.stateToDTO(
            trainingDefinition.state,
        );
        result.title = trainingDefinition.title;
        return result;
    }

    static toCreateDTO(
        trainingDefinition: TrainingDefinitionWithLevels,
    ): TrainingDefinitionCreateDTO {
        const result = new TrainingDefinitionCreateDTO();
        result.prerequisites = trainingDefinition.prerequisites.filter(
            (prerequisite) => prerequisite.length > 1,
        );
        result.outcomes = trainingDefinition.outcomes.filter(
            (outcome) => outcome.length > 1,
        );
        result.description = trainingDefinition.description;
        result.state = TrainingDefinitionDTOStateEnum.UNRELEASED;
        result.title = trainingDefinition.title;
        result.default_content = trainingDefinition.defaultContent;
        return result;
    }
}
