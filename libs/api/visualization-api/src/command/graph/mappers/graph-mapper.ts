import {GraphDTO} from '../dto/graph-dto';
import {Graph} from '@crczp/visualization-model';

export class GraphMapper {
    static fromDTO(dto: GraphDTO): Graph {
        const result = new Graph();
        result.graph = dto.graph;
        return result;
    }
}
