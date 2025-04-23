import { Component, Input, OnInit } from '@angular/core';
import { MistakeCommandService } from './service/mistake-command.service';
import { map, take, tap } from 'rxjs/operators';
import { SentinelTable, TableActionEvent } from '@sentinel/components/table';
import { BehaviorSubject, Observable } from 'rxjs';
import { CommandTable } from './model/command-table';
import { SentinelResourceSelectorMapping } from '@sentinel/components/resource-selector';
import { mistakeTypes, ResourceSelect } from './model/resource-select';
import { AggregatedCommands } from './model/aggregated-commands';

@Component({
    selector: 'crczp-mistake',
    templateUrl: './mistake.component.html',
    styleUrls: ['./mistake.component.css'],
})
export class MistakeComponent implements OnInit {
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'desc';

    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;

    aggregatedWrongCommands$: Observable<SentinelTable<AggregatedCommands>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;

    traineesDropdownList: ResourceSelect[] = [];

    private selectedTrainingRunSubject$: BehaviorSubject<ResourceSelect[]> = new BehaviorSubject([]);
    selectedTrainingRuns$: Observable<ResourceSelect[]> = this.selectedTrainingRunSubject$.asObservable();

    private selectedMistakeTypesSubject$: BehaviorSubject<ResourceSelect[]> = new BehaviorSubject([]);
    selectedMistakeTypes$: Observable<ResourceSelect[]> = this.selectedMistakeTypesSubject$.asObservable();

    resourcesMapping: SentinelResourceSelectorMapping;
    mistakesResources: ResourceSelect[] = [];
    correct = false;

    constructor(private commandService: MistakeCommandService) {}

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

    onTraineeSelect(event: ResourceSelect[]): void {
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
                this.commandService.getSelectedMistakeTypes().map((mistake) => mistake.title),
            )
            .pipe(take(1))
            .subscribe();
    }

    sendOrganizerRequest(): void {
        this.commandService
            .getAggregatedCommandsForOrganizer(
                this.trainingInstanceId,
                this.commandService.getSelectedTrainees().map((trainee) => trainee.id),
                this.correct,
                this.commandService.getSelectedMistakeTypes().map((mistake) => mistake.title),
            )
            .pipe(take(1))
            .subscribe();
    }

    private initTable() {
        this.hasError$ = this.commandService.hasError$;
        this.isLoading$ = this.commandService.isLoading$;
        this.aggregatedWrongCommands$ = this.commandService.aggregatedCommands$.pipe(
            map((resource) => new CommandTable(resource)),
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
                                title: trainingRun.participantRef.fullName,
                                subtitle: `Training Run ID: ${trainingRun.id}`,
                            };
                        });
                    }),
                    take(1),
                )
                .subscribe();
        }
        mistakeTypes.forEach((mistakeType, index) => {
            const mistake = new ResourceSelect();
            mistake.id = index;
            mistake.title = mistakeType;
            mistake.subtitle = 'Mistake Type';
            this.mistakesResources.push(mistake);
        });
    }
}
