import { AnswerCheckResult } from '@crczp/training-model';
import { IsCorrectAnswerDTO } from '../../dto/training-run/is-correct-answer-dto';

export class AnswerCheckResultMapper {
    static fromDTO(dto: IsCorrectAnswerDTO): AnswerCheckResult {
        return new AnswerCheckResult(
            dto.correct,
            dto.remaining_attempts,
            dto.solution,
        );
    }
}
