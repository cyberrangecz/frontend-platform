import {AssessmentAnswer} from '@crczp/visualization-model';
import {UserMapper} from '@crczp/training-api';
import {AnswerDTO} from '../dtos';

export class AnswerMapper {
    static fromDTOs(dtos: AnswerDTO[]): AssessmentAnswer[] {
        return dtos.map((dto) => AnswerMapper.fromDTO(dto));
    }

    static fromDTO(dto: AnswerDTO): AssessmentAnswer {
        const answer = new AssessmentAnswer();
        answer.text = dto.text;
        answer.correct = dto.correct;
        answer.participants = UserMapper.fromDTOs(dto.participants);
        return answer;
    }
}
