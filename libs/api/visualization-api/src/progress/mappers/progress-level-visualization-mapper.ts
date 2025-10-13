import {ProgressEventMapper} from './progress-event-mapper';
import {ScoreMapper} from './score-mapper';
import {ProgressLevelVisualizationData} from '@crczp/visualization-model';
import {ProgressLevelVisualizationDTO} from '../dtos';

export class ProgressLevelVisualizationMapper {
    static fromDTOs(dtos: ProgressLevelVisualizationDTO[]): ProgressLevelVisualizationData[] {
        return dtos.map((dto) => ProgressLevelVisualizationMapper.fromDTO(dto));
    }

    static fromDTO(dto: ProgressLevelVisualizationDTO): ProgressLevelVisualizationData {
        const result = new ProgressLevelVisualizationData();
        result.startTime = dto.start_time / 1000;
        result.endTime = dto.end_time / 1000;
        result.id = dto.id;
        result.state = dto.state;
        result.wrongAnswers_number = dto.wrong_answers_number;
        result.hintsTaken = dto.hints_taken;
        result.events = ProgressEventMapper.fromDTOs(dto.events);
        result.score = ScoreMapper.fromDTOs(dto.events);
        return result;
    }
}
