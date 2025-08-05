import {
    Component,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VizOverviewTraineeInfo } from '../../../shared/interfaces/viz-overview-trainee-info';
import { take } from 'rxjs/operators';
import { TableData } from '../../model/table/table-data';
import { PlayerTableData } from '../../model/table/player-table-data';
import { LevelTableData } from '../../model/table/level-table-data';
import { TableDataService } from './service/table-data.service';
import { TableService } from '../../../services/table.service';
import { FiltersService } from '../../../services/filters.service';
import { VizConfigService } from '../../../../common/viz-config.service';

@Component({
    selector: 'crczp-visualization-overview-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.css'],
    // eslint-disable-next-line
    standalone: false,
})
export class TableComponent implements OnInit, OnChanges, OnDestroy {
    /**
     * Training data
     */
    @Input() tableData: TableData = { players: null };
    /**
     * JSON data to use instead of data from API
     */
    @Input() jsonTableData: TableData = { players: null };
    /**
     * Flag to use in standalone mode
     */
    @Input() standalone = false;
    /**
     * Id of training definition
     */
    @Input() trainingDefinitionId: number;
    /**
     * Id of training instance
     */
    @Input() trainingInstanceId: number;
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    @Input() traineeModeInfo: VizOverviewTraineeInfo;
    public tableLevelHeader: LevelTableData[] = [];
    public playersOrdered: PlayerTableData[] = [];
    public sortedColumn = null;
    public sortedDesc = false;
    public columnHovered = null;
    public filters;
    public traineesTrainingRun: number;
    private tableService = inject(TableService);
    private filtersService = inject(FiltersService);
    private dataService = inject(TableDataService);
    private playerColorScaleSource: Subscription;

    private readonly configService = inject(VizConfigService);

    constructor() {
        this.playerColorScaleSource =
            this.tableService.playerColorScale$.subscribe((scale) => {
                setTimeout(() => (this.playerColorScale = scale), 0);
            });
    }

    public playerColorScale = () => 'black';

    ngOnDestroy() {
        this.playerColorScaleSource.unsubscribe();
    }

    ngOnInit() {
        this.load();
    }

    ngOnChanges() {
        if (
            this.jsonTableData !== undefined &&
            this.jsonTableData.players !== null
        ) {
            this.tableData.players = this.jsonTableData.players;
        }
        this.configService.trainingDefinitionId = this.trainingDefinitionId;
        this.configService.trainingInstanceId = this.trainingInstanceId;
        if (this.traineeModeInfo) {
            this.configService.trainingRunId =
                this.traineeModeInfo.trainingRunId;
        }
        if (this.tableData.players) {
            this.getMaxReachedLevel();
            this.redraw();
        }
    }

    load() {
        this.dataService
            .getAllData(this.traineeModeInfo)
            .pipe(take(1))
            .subscribe((res) => {
                this.tableData = res;
                this.traineesTrainingRun = this.traineeModeInfo.trainingRunId;
                this.redraw();
                this.getMaxReachedLevel();
            });
    }

    redraw() {
        this.filters = this.filtersService.getFiltersObject();
        this.orderPlayers();
        this.checkFeedbackLearner();
    }

    orderPlayers() {
        if (this.tableData.players === null) {
            return [];
        }
        let i = 0;
        for (let index = 0; index < this.tableData.players.length; index++) {
            const element = this.tableData.players[index];
            if (element.trainingRunId === this.traineesTrainingRun) {
                i = index;
                break;
            }
        }
        const copy = this.tableData.players.slice();
        const splice = copy.splice(i);
        this.playersOrdered = splice.concat(copy);
        return this.playersOrdered;
    }

    /**
     * Sets checked attribute of feedback learner in players array to true
     */
    checkFeedbackLearner() {
        if (this.tableData.players === null) {
            return;
        }
        const feedbackLearner = this.tableData.players.find(
            (player) => player.trainingRunId === this.traineesTrainingRun
        );
        if (feedbackLearner !== undefined) {
            feedbackLearner.checked = !feedbackLearner.checked;
        }
    }

    onRowClick(player) {
        player.checked = !player.checked;
        this.tableService.sendTableRowClick(player);
    }

    onRowMouseover(player) {
        this.tableService.sendTableRowMouseover(player.trainingRunId);
    }

    onRowMouseout(player) {
        this.tableService.sendTableRowMouseout(player.trainingRunId);
    }

    onWrongClick(levelNumber) {
        if (this.sortedColumn === 'w' + levelNumber) {
            this.playersOrdered.reverse();
            this.sortedDesc = !this.sortedDesc;
            return;
        }
        this.playersOrdered.sort((a, b) => {
            if (
                typeof a.levels[levelNumber] === 'undefined' ||
                typeof b.levels[levelNumber] === 'undefined'
            ) {
                return 1;
            }
            const result =
                b.levels[levelNumber].wrongAnswers -
                a.levels[levelNumber].wrongAnswers;
            return this.sortedDesc ? result : -result;
        });
        this.sortedColumn = 'w' + levelNumber;
    }

    onHintsClick(levelNumber) {
        if (this.sortedColumn === 'h' + levelNumber) {
            this.playersOrdered.reverse();
            this.sortedDesc = !this.sortedDesc;
            return;
        }
        this.playersOrdered.sort((a, b) => {
            if (
                typeof a.levels[levelNumber] === 'undefined' ||
                typeof b.levels[levelNumber] === 'undefined'
            ) {
                return 1;
            }
            const result =
                b.levels[levelNumber].hintsTaken -
                a.levels[levelNumber].hintsTaken;
            return this.sortedDesc ? result : -result;
        });
        this.sortedColumn = 'h' + levelNumber;
    }

    onLevelClick(levelNumber) {
        if (this.sortedColumn === levelNumber) {
            this.playersOrdered.reverse();
            this.sortedDesc = !this.sortedDesc;
            return;
        }
        this.playersOrdered.sort((a, b) => {
            if (typeof a.levels[levelNumber] === 'undefined') {
                return -1;
            } else if (typeof b.levels[levelNumber] === 'undefined') {
                return 1;
            }
            const result =
                b.levels[levelNumber].participantLevelScore -
                a.levels[levelNumber].participantLevelScore;
            return this.sortedDesc ? result : -result;
        });
        this.sortedColumn = levelNumber;
    }

    onFinalClick() {
        if (this.sortedColumn === -2) {
            this.playersOrdered.reverse();
            this.sortedDesc = !this.sortedDesc;
            return;
        }
        this.playersOrdered.sort((a, b) => {
            return this.sortedDesc
                ? b.totalScore - a.totalScore
                : a.totalScore - b.totalScore;
        });
        this.sortedColumn = -2;
    }

    onPlayerClick() {
        if (this.sortedColumn === -1) {
            this.playersOrdered.reverse();
            this.sortedDesc = !this.sortedDesc;
            return;
        }
        this.playersOrdered.sort((a, b) => {
            return !this.sortedDesc
                ? a.trainingRunId - b.trainingRunId
                : b.trainingRunId - a.trainingRunId;
        });
        this.sortedColumn = -1;
    }

    private getMaxReachedLevel(): void {
        this.tableData.players.forEach((player) => {
            if (player.levels.length > this.tableLevelHeader.length) {
                this.tableLevelHeader = player.levels;
            }
        });
    }
}
