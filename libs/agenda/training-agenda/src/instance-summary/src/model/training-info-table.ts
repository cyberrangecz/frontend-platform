import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { TrainingRunInfo } from '@crczp/training-model';

/**
 * @dynamic
 */
export class TrainingInfoTable extends SentinelTable<TrainingRunInfo> {
    constructor(resource: TrainingRunInfo[]) {
        const columns = [
            new Column('levelId', 'level id', false),
            new Column('levelOrder', 'level order', false),
            new Column('levelTitle', 'level title', false),
            new Column('correctAnswer', 'correct answer', false),
            new Column('variableName', 'variable name', false),
        ];
        const rows = resource.map((element) => TrainingInfoTable.createRow(element));
        super(rows, columns);
        this.filterable = false;
    }

    static createRow(element: TrainingRunInfo): Row<TrainingRunInfo> {
        element.variableName = element.variableName ? element.variableName : '-';
        return new Row(element);
    }
}
