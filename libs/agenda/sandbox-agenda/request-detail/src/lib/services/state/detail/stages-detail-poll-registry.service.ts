import {BehaviorSubject, Observable} from 'rxjs';
import {RequestStagesService} from '../request-stages.service';
import {map, switchMap} from 'rxjs/operators';
import {RequestStage} from '@crczp/sandbox-model';
import { Injectable, inject } from '@angular/core';

@Injectable()
export class StagesDetailPollRegistry {
    private stagesService = inject(RequestStagesService);

    private displayedDetailIdsSubject$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
    private displayedDetailIds$: Observable<number[]> = this.displayedDetailIdsSubject$.asObservable();

    polledStageIds$: Observable<number[]>;

    constructor() {
        const stagesService = this.stagesService;

        this.polledStageIds$ = stagesService.stages$.pipe(
            map((stages) => this.getIdsOfActiveStages(stages)),
            switchMap((stages) => this.filterStagesWithDisplayedDetail(stages)),
        );
    }

    add(stage: RequestStage): void {
        if (!(stage.id in this.displayedDetailIdsSubject$.getValue())) {
            this.displayedDetailIdsSubject$.next([...this.displayedDetailIdsSubject$.getValue(), stage.id]);
        }
    }

    remove(stage: RequestStage): void {
        const currIds = this.displayedDetailIdsSubject$.getValue();
        const toRemoveIndex = currIds.findIndex((id) => id === stage.id);
        if (toRemoveIndex > -1) {
            currIds.splice(toRemoveIndex, 1);
            this.displayedDetailIdsSubject$.next(currIds);
        }
    }

    private getIdsOfActiveStages(stages: RequestStage[]): number[] {
        return stages.filter((stage) => !stage.hasFinished() && !stage.hasFailed()).map((stage) => stage.id);
    }

    private filterStagesWithDisplayedDetail(activeStageIds: number[]): Observable<number[]> {
        return this.displayedDetailIds$.pipe(
            map((displayedDetailIds) => displayedDetailIds.filter((id) => activeStageIds.includes(id))),
        );
    }
}
