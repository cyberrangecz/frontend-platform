
import { OptionMapper } from './option-mapper';
import { EmiAnswerDTO } from '../dto/emi-answer-dto';
import { AssessmentEmiAnswers } from '@crczp/visualization-model';

export class EmiAnswerMapper {
    static fromDTOs(dtos: EmiAnswerDTO[]): AssessmentEmiAnswers[] {
        return dtos.map((dto) => EmiAnswerMapper.fromDTO(dto));
    }

    static fromDTO(dto: EmiAnswerDTO): AssessmentEmiAnswers {
        const answer = new AssessmentEmiAnswers();
        answer.text = dto.text;
        answer.options = OptionMapper.fromDTOs(dto.options);
        return answer;
    }
}
