import { IsCorrectAnswerDTO } from '../../dto/phase/training-phase/is-correct-answer-dto';
import { AnswerCheckResult } from '@crczp/training-model';

export class AnswerCheckResultMapper {
    static fromDTO(dto: IsCorrectAnswerDTO): AnswerCheckResult {
        return new AnswerCheckResult(
            dto.correct,
            dto.remaining_attempts,
            dto.solution,
        );
    }
}
