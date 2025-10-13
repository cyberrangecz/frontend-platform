import {LevelAnswersMapper} from './level-answers-mapper';
import {TrainingInstanceStatistics} from '@crczp/visualization-model';
import {ParticipantsMapper} from './participants-mapper';
import {TrainingInstanceStatisticsDTO} from '../dtos';

export class TrainingInstanceMapper {
    static fromDTOs(dtos: TrainingInstanceStatisticsDTO[]): TrainingInstanceStatistics[] {
        return dtos.map((dto) => TrainingInstanceMapper.fromDTO(dto));
    }

    static fromDTO(dto: TrainingInstanceStatisticsDTO): TrainingInstanceStatistics {
        const instance = new TrainingInstanceStatistics();
        instance.instanceId = dto.instance_id;
        instance.title = dto.title;
        instance.date = dto.date;
        instance.participants = ParticipantsMapper.fromDTOs(dto.participants, dto.instance_id);
        instance.duration = dto.duration;
        instance.averageScore = dto.average_score;
        instance.medianScore = dto.median_score;
        instance.levelsAnswers = LevelAnswersMapper.fromDTOs(dto.levels);
        return instance;
    }
}
