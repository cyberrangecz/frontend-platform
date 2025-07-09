import {IsCorrectAnswerDTO} from '../../dto/phase/training-phase/is-correct-answer-dto';
import {PhaseAnswerCheck} from '@crczp/training-model';

export class TaskAnswerMapper {
    static fromDTO(dto: IsCorrectAnswerDTO): PhaseAnswerCheck {
        const result = new PhaseAnswerCheck();
        result.isCorrect = dto.correct;
        result.remainingAttempts = dto.remaining_attempts;
        result.solution = dto.solution;
        return result;
    }
}
