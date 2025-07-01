import {TrainingRunPathNodeDTO} from '../../../dto/training-run-path-node-dto';
import {RunVisualizationPathNode} from "@crczp/visualization-model";

export class TrainingRunPathMapper {
    static fromDTOs(dtos: TrainingRunPathNodeDTO[]): RunVisualizationPathNode[] {
        return dtos.map((dto) => TrainingRunPathMapper.fromDTO(dto));
    }

    static fromDTO(dto: TrainingRunPathNodeDTO): RunVisualizationPathNode {
        const result = new RunVisualizationPathNode();
        result.phaseId = dto.phase_id;
        result.phaseOrder = dto.phase_order;
        result.taskId = dto.task_id;
        result.taskOrder = dto.task_order;
        return result;
    }
}
