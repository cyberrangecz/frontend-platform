import {TableData} from '../../../model/table/table-data';
import {PlayerTableDataMapper} from './player-table-data-mapper';
import {PlayerTableDataDTO} from '../../dto/table/player-table-data-dto';

/**
 * @dynamic
 */
export class TableMapper {
    static fromDTO(dtos: PlayerTableDataDTO[]): TableData {
        const result = new TableData();
        result.players = PlayerTableDataMapper.fromDTOs(dtos);
        return result;
    }
}
