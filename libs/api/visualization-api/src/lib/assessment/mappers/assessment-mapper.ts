import { Assessment } from '@crczp/visualization-model';
import { QuestionMapper } from './question-mapper';
import { AssessmentDTO } from '../dtos';

export class AssessmentMapper {
    static fromDTOs(dtos: AssessmentDTO[]): Assessment[] {
        return dtos.map((dto) => AssessmentMapper.fromDTO(dto));
    }

    static fromDTO(dto: AssessmentDTO): Assessment {
        const assessment = new Assessment();
        assessment.id = dto.id;
        assessment.order = dto.order;
        assessment.title = dto.title;
        assessment.assessmentType = dto.assessment_type;
        assessment.questions = QuestionMapper.fromDTOs(dto.questions);
        return assessment;
    }
}
