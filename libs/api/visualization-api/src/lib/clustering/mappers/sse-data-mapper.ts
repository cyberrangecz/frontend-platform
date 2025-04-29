import { SseDTO } from '../dto/sse-dto';
import { SseData } from '@crczp/visualization-model';


export class SseDataMapper {
    static fromDTO(dto: SseDTO | any): SseData {
        return dto;
    }
}
