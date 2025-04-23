import { ReferenceSolutionNode } from '@crczp/training-model';
import { ReferenceSolutionNodeDTO } from '../../../dto/level/training/reference-solution-node-dto';

export class ReferenceSolutionNodeMapper {
    static toDTO(referenceSolution: ReferenceSolutionNode): ReferenceSolutionNodeDTO {
        const result = new ReferenceSolutionNodeDTO();
        result.state_name = referenceSolution.state_name;
        result.cmd = referenceSolution.cmd;
        result.cmd_regex = referenceSolution.cmd_regex;
        result.cmd_type = referenceSolution.cmd_type;
        result.optional = referenceSolution.optional;
        result.prereq_state = referenceSolution.prereq_state;
        return result;
    }

    static toDTOs(referenceSolution: ReferenceSolutionNode[]): ReferenceSolutionNodeDTO[] {
        return referenceSolution.map((solution) => ReferenceSolutionNodeMapper.toDTO(solution));
    }

    static fromDTO(dto: ReferenceSolutionNodeDTO): ReferenceSolutionNode {
        const result = new ReferenceSolutionNode();
        result.state_name = dto.state_name;
        result.cmd = dto.cmd;
        result.cmd_regex = dto.cmd_regex;
        result.cmd_type = dto.cmd_type;
        result.optional = dto.optional;
        result.prereq_state = dto.prereq_state;
        return result;
    }

    static fromDTOs(dtos: ReferenceSolutionNodeDTO[]): ReferenceSolutionNode[] {
        return dtos.map((dto) => ReferenceSolutionNodeMapper.fromDTO(dto));
    }
}
