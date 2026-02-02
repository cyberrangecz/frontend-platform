import { AsyncPipe } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CommandCorrectnessApi } from '@crczp/visualization-api';
import {
    AggregatedCommands,
    CommandResourceSelect,
    mistakeTypes,
} from '@crczp/visualization-model';
import {
    SentinelResourceSelectorComponent,
    SentinelResourceSelectorMapping,
} from '@sentinel/components/resource-selector';
import {
    SentinelTable,
    SentinelTableComponent,
} from '@sentinel/components/table';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { CommandMistakeService } from './command-mistake.service';
import { CommandTable } from './command-table';

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
    providers: [CommandCorrectnessApi, CommandMistakeService],
})
export class MistakeComponent implements OnInit {
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'desc';
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;

    aggregatedWrongCommands$: Observable<
        SentinelTable<AggregatedCommands, string>
    >;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    traineesDropdownList: CommandResourceSelect[] = [];
    resourcesMapping: SentinelResourceSelectorMapping;
    mistakesResources: CommandResourceSelect[] = [];
    correct = false;

    private commandService = inject(CommandMistakeService);
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
                    .map((mistake) => mistake.title),
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
                    .map((mistake) => mistake.title),
            )
            .pipe(take(1))
            .subscribe();
    }

    private initTable() {
        this.hasError$ = this.commandService.hasError$;
        this.isLoading$ = this.commandService.isLoading$;
        this.aggregatedWrongCommands$ =
            this.commandService.aggregatedCommands$.pipe(
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
                                title: trainingRun.player.name,
                                subtitle: `Training Run ID: ${trainingRun.id}`,
                            };
                        });
                    }),
                    take(1),
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
