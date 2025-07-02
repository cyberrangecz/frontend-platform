import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import {AbstractPhaseTypeEnum, Phase, TrainingPhase} from '@crczp/training-model';

import {ModelSimulatorService} from './service/model-simulator.service';
import {PerformanceComponent} from "../performance-simulator/performance.component";
import {MatDivider} from "@angular/material/divider";
import {PathwaySimulatorComponent} from "../pathway-simulator/pathway-simulator.component";
import {TraineePhasePerformance, TransitionPhase, TransitionVisualizationData} from "@crczp/visualization-model";

@Component({
    selector: 'crczp-adaptive-instance-simulator',
    templateUrl: './model-simulator.component.html',
    styleUrls: ['./model-simulator.component.css'],
    imports: [
        PerformanceComponent,
        MatDivider,
        PathwaySimulatorComponent
    ]
})
export class ModelSimulatorComponent implements OnInit, OnChanges {
    private modelSimulatorService = inject(ModelSimulatorService);

    @Input() phases: Phase[];

    inspectedPhase: TrainingPhase;
    relatedTrainingPhases: TrainingPhase[];
    traineesSimulatedPath: TransitionVisualizationData;
    traineePerformance: TraineePhasePerformance[];

    ngOnInit(): void {
        this.relatedTrainingPhases = this.phases.filter(
            (phase) => phase.type === AbstractPhaseTypeEnum.Training,
        ) as TrainingPhase[];
        this.inspectedPhase = this.relatedTrainingPhases[this.relatedTrainingPhases.length - 1];
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phases' in changes) {
            this.prepareData();
            this.relatedTrainingPhases = this.phases.filter(
                (phase) => phase.type === AbstractPhaseTypeEnum.Training,
            ) as TrainingPhase[];
            this.inspectedPhase = this.relatedTrainingPhases[this.relatedTrainingPhases.length - 1];
        }
    }

    updateTransition(traineePerformance: TraineePhasePerformance[]): void {
        this.traineePerformance = traineePerformance;
    }

    generate(): void {
        this.computeTraineePath(this.traineePerformance);
    }

    private computeTraineePath(performanceStatistics: TraineePhasePerformance[]) {
        this.traineesSimulatedPath.trainingRunsData = [];
        this.traineesSimulatedPath.phases.sort((a, b) => a.order - b.order);
        this.traineesSimulatedPath.trainingRunsData = this.modelSimulatorService.computeTraineePath(
            this.phases,
            this.relatedTrainingPhases,
            performanceStatistics,
        );
    }

    private prepareData(): void {
        this.traineesSimulatedPath = new TransitionVisualizationData();
        this.traineesSimulatedPath.trainingRunsData = [];
        this.traineesSimulatedPath.phases = [];
        this.traineesSimulatedPath.phases = this.phases as unknown as TransitionPhase[];
    }
}
