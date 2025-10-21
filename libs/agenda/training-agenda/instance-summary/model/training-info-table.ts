import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { TrainingRunInfo } from '@crczp/training-model';

/**
 * @dynamic
 */
export class TrainingInfoTable extends SentinelTable<TrainingRunInfo, string> {
    constructor(resource: TrainingRunInfo[]) {
        const columns = [
            new Column<string>('levelId', 'level id', false),
            new Column<string>('levelOrder', 'level order', false),
            new Column<string>('levelTitle', 'level title', false),
            new Column<string>('correctAnswer', 'correct answer', false),
            new Column<string>('variableName', 'variable name', false),
        ];
        const rows = resource.map((element) =>
            TrainingInfoTable.createRow(element),
        );
        super(rows, columns);
        this.filterable = false;
    }

    static createRow(element: TrainingRunInfo): Row<TrainingRunInfo> {
        element.variableName = element.variableName
            ? element.variableName
            : '-';
        return new Row(element);
    }
}
