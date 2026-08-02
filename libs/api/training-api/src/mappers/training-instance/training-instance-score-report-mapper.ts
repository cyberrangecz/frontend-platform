import { MapperBuilder } from '@crczp/api-common';
import { ParticipantScoreRow, TrainingInstanceScoreReport } from '@crczp/training-model';
import {
    ParticipantScoreRowDto,
    TrainingInstanceScoreReportDto,
} from '../../dto/training-instance/training-instance-score-report-dto';
import { levelBasicArrayMapper } from '../level/level-basic-mapper';

const participantScoreRowMapper = MapperBuilder.createDTOtoModelMapper<
    InstanceType<typeof ParticipantScoreRowDto>,
    ParticipantScoreRow
>({
    mappedProperties: [
        'rank',
        'trainingRunId',
        'userRefId',
        'login',
        'name',
        'mail',
        'finished',
        'durationSeconds',
        'trainingScore',
        'assessmentScore',
        'totalScore',
        'hintsTaken',
        'wrongAnswers',
        'solutionsDisplayed',
    ],
    mappers: {
        startedAt: (dto) => new Date(dto.started_at),
        endedAt: (dto) => (dto.ended_at === null ? null : new Date(dto.ended_at)),
        scoreByLevelId: (dto) =>
            new Map(
                Object.entries(dto.score_by_level_id).map(([levelId, score]) => [
                    Number(levelId),
                    score,
                ]),
            ),
    },
    constructor: (data) => ParticipantScoreRow.schema().parse(data),
});

export const trainingInstanceScoreReportMapper = MapperBuilder.createDTOtoModelMapper<
    InstanceType<typeof TrainingInstanceScoreReportDto>,
    TrainingInstanceScoreReport
>({
    mappedProperties: ['trainingInstanceId'],
    mappers: {
        instanceEndAt: (dto) => new Date(dto.instance_end_at),
        scoredLevels: (dto) => levelBasicArrayMapper(dto.scored_levels),
        rows: (dto) => dto.rows.map(participantScoreRowMapper),
    },
    constructor: (data) => TrainingInstanceScoreReport.schema().parse(data),
});
