import { OptionDTO } from './option-dto';
import { AnswerDTO } from './answer-dto';

export class EmiAnswerDTO extends AnswerDTO {
    options: OptionDTO[];
}
