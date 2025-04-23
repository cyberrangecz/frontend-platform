import { WalkthroughVisualizationData } from '../model/walkthrough-visualization-data';
import { UserDataMapper } from './user-data-mapper';
import { LevelEventsDTO } from '../dto/level-events-dto';

export class VisualizationDataMapper {
    static fromDTO(dto: LevelEventsDTO): WalkthroughVisualizationData {
        const visualizationData = new WalkthroughVisualizationData();
        visualizationData.levelId = dto.level_id;
        visualizationData.title = dto.title;
        visualizationData.usersData = dto.users
            .map((userDataDto) => UserDataMapper.fromDTO(userDataDto, dto.level_id))
            .sort((a, b) => a.points - b.points);
        return visualizationData;
    }
}
