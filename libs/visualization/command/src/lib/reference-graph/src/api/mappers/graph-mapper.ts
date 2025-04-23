import { GraphDTO } from '../dto/graph-dto';
import { Graph } from '../../model/graph';

export class GraphMapper {
    static fromDTO(dto: GraphDTO): Graph {
        const result = new Graph();
        result.graph = dto.graph;
        return result;
    }
}
