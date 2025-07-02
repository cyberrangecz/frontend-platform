import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {InstanceSimulatorService} from './service/instance/instance-simulator.service';
import {InstanceModelSimulatorControls} from './model/instance/instance-model-simulator-controls';
import {BehaviorSubject, Observable, Subscription, take, tap} from 'rxjs';
import {InstanceModelSimulator} from './model/instance/instance-model-simulator';
import {TrainingPhase} from '@crczp/training-model';
import {SimulatorState} from './model/instance/simulator-state';
import {AsyncPipe} from "@angular/common";
import {DefinitionInfoComponent} from "./components/definition-info/definition-info.component";
import {InstanceSimulatorComponent} from "./components/instance-simulator/instance-simulator.component";
import {FileUploadProgressService} from "./service/instance/file-upload-progress.service";
import {InstanceSimulatorApiService} from "./service/instance/instance-simulator-api.service";
import {SankeyDataService} from "./service/sankey-data.service";

@Component({
    selector: 'crczp-instance-model-simulator',
    templateUrl: './instance-model-simulator.component.html',
    styleUrls: ['./instance-model-simulator.component.css'],
    imports: [
        AsyncPipe,
        DefinitionInfoComponent,
        SentinelControlsComponent,
        InstanceSimulatorComponent
    ],
    providers: [
        InstanceSimulatorService,
        FileUploadProgressService,
        InstanceSimulatorApiService,
        SankeyDataService,
    ],
})
export class InstanceModelSimulatorComponent implements OnInit, OnDestroy {
    private instanceSimulatorService = inject(InstanceSimulatorService);

    @Output() state: EventEmitter<SimulatorState> = new EventEmitter();
    definitionControls: SentinelControlItem[] = [];
    generateControls: SentinelControlItem[] = [];

    private instanceSimulatorDataSubject$: BehaviorSubject<InstanceModelSimulator> = new BehaviorSubject(null);
    instanceSimulatorData$: Observable<InstanceModelSimulator> = this.instanceSimulatorDataSubject$.asObservable();

    private disableGenerateSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    disableGenerate$: Observable<boolean> = this.disableGenerateSubject$.asObservable();

    private stateSubject$: BehaviorSubject<SimulatorState> = new BehaviorSubject(null);
    state$: Observable<SimulatorState> = this.stateSubject$.asObservable();

    private stateSubscription$: Subscription;

    ngOnInit(): void {
        this.definitionControls = InstanceModelSimulatorControls.createDefinition(this.instanceSimulatorService);
        this.generateControls = InstanceModelSimulatorControls.createGenerate(
            this.instanceSimulatorService,
            this.disableGenerate$,
        );
        this.instanceSimulatorData$ = this.instanceSimulatorService.uploadedInstanceData$;
        this.state$ = this.instanceSimulatorService.state$.pipe(tap((state) => this.state.emit(state)));
        this.stateSubscription$ = this.state$.subscribe();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    phaseChanged(phase: TrainingPhase): void {
        this.disableGenerateSubject$.next(false);
        this.instanceSimulatorService.updatePhase(phase);
    }

    phaseValid(isPhaseValid: boolean): void {
        this.disableGenerateSubject$.next(!isPhaseValid);
    }

    ngOnDestroy(): void {
        this.instanceSimulatorService.clearInstance();
        this.stateSubscription$.unsubscribe();
    }
}
