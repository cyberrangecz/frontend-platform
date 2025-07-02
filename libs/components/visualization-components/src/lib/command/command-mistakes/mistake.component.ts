import { Component, Input, OnInit, inject } from '@angular/core';
import {CommandMistakeService} from './command-mistake.service';
import {map, take, tap} from 'rxjs/operators';
import {SentinelTable, SentinelTableComponent, TableActionEvent,} from '@sentinel/components/table';
import {BehaviorSubject, Observable} from 'rxjs';
import {
    SentinelResourceSelectorComponent,
    SentinelResourceSelectorMapping,
} from '@sentinel/components/resource-selector';
import {AggregatedCommands, CommandResourceSelect, mistakeTypes,} from '@crczp/visualization-model';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {AsyncPipe} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {CommandTable} from './command-table';
import {CommandCorrectnessApi, VisualizationApiConfig,} from '@crczp/visualization-api';
import {provideComponentProperty} from '@crczp/common';

@Component({
    selector: 'crczp-mistake',
    templateUrl: './mistake.component.html',
    styleUrls: ['./mistake.component.css'],
    imports: [
        SentinelResourceSelectorComponent,
        MatSlideToggleModule,
        SentinelTableComponent,
        AsyncPipe,
        MatButtonModule,
    ],
    providers: [
        provideComponentProperty(
            MistakeComponent,
            VisualizationApiConfig,
            'apiConfig'
        ),
        CommandCorrectnessApi,
        CommandMistakeService,
    ],
})
export class MistakeComponent implements OnInit {
    private commandService = inject(CommandMistakeService);

    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'desc';

    @Input() apiConfig: VisualizationApiConfig;
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;

    aggregatedWrongCommands$: Observable<SentinelTable<AggregatedCommands>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;

    traineesDropdownList: CommandResourceSelect[] = [];
    resourcesMapping: SentinelResourceSelectorMapping;
    mistakesResources: CommandResourceSelect[] = [];
    correct = false;
    private selectedTrainingRunSubject$: BehaviorSubject<
        CommandResourceSelect[]
    > = new BehaviorSubject([]);
    selectedTrainingRuns$: Observable<CommandResourceSelect[]> =
        this.selectedTrainingRunSubject$.asObservable();
    private selectedMistakeTypesSubject$: BehaviorSubject<
        CommandResourceSelect[]
    > = new BehaviorSubject([]);
    selectedMistakeTypes$: Observable<CommandResourceSelect[]> =
        this.selectedMistakeTypesSubject$.asObservable();

    ngOnInit(): void {
        this.selectedTrainingRuns$ = this.commandService.selectedTrainingRuns$;
        this.selectedMistakeTypes$ = this.commandService.selectedMistakeTypes$;
        this.initResources();
        this.initTable();
    }

    onCommandTypeSelect(event): void {
        this.correct = event.checked;
        if (this.trainingRunId && this.correct) {
            this.sendTraineeRequest();
        } else {
            this.commandService.resetCommands();
        }
    }

    /**
     * Resolves type of action and call appropriate handler
     * @param event action event emitted by table component
     */
    onTableAction(event: TableActionEvent<AggregatedCommands>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onMistakeSelect(event): void {
        this.commandService.setSelectedMistakeTypes(event);
    }

    onTraineeSelect(event: CommandResourceSelect[]): void {
        if (event.length > 0) {
            this.commandService.setSelectedTrainees(event);
        } else {
            this.commandService.resetCommands();
        }
    }

    sendRequest(): void {
        if (this.trainingRunId) {
            this.sendTraineeRequest();
        } else {
            this.sendOrganizerRequest();
        }
    }

    sendTraineeRequest(): void {
        this.commandService
            .getAggregatedCommandsForTrainee(
                this.trainingRunId,
                this.correct,
                this.commandService
                    .getSelectedMistakeTypes()
                    .map((mistake) => mistake.title)
            )
            .pipe(take(1))
            .subscribe();
    }

    sendOrganizerRequest(): void {
        this.commandService
            .getAggregatedCommandsForOrganizer(
                this.trainingInstanceId,
                this.commandService
                    .getSelectedTrainees()
                    .map((trainee) => trainee.id),
                this.correct,
                this.commandService
                    .getSelectedMistakeTypes()
                    .map((mistake) => mistake.title)
            )
            .pipe(take(1))
            .subscribe();
    }

    private initTable() {
        this.hasError$ = this.commandService.hasError$;
        this.isLoading$ = this.commandService.isLoading$;
        this.aggregatedWrongCommands$ =
            this.commandService.aggregatedCommands$.pipe(
                map((resource) => new CommandTable(resource))
            );
    }

    private initResources() {
        this.resourcesMapping = {
            id: 'id',
            title: 'title',
            subtitle: 'subtitle',
        };

        if (!this.trainingRunId) {
            this.commandService
                .getTrainingRuns(this.trainingInstanceId)
                .pipe(
                    tap((res) => {
                        this.traineesDropdownList = res.map((trainingRun) => {
                            return {
                                id: trainingRun.id,
                                title: trainingRun.player.name,
                                subtitle: `Training Run ID: ${trainingRun.id}`,
                            };
                        });
                    }),
                    take(1)
                )
                .subscribe();
        }
        mistakeTypes.forEach((mistakeType, index) => {
            const mistake = new CommandResourceSelect();
            mistake.id = index;
            mistake.title = mistakeType;
            mistake.subtitle = 'Mistake Type';
            this.mistakesResources.push(mistake);
        });
    }
}
