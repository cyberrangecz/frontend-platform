import {EmiAnswerDTO} from '../dtos';
import {AssessmentEmiAnswers} from '@crczp/visualization-model';
import {OptionMapper} from './option-mapper';


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
