import { TrainingAnalysisComponent } from './training-analysis.component';

export interface TrainingAnalysisEventService {
    trainingAnalysisComponent: TrainingAnalysisComponent;

    trainingAnalysisOnBarMouseover(traineeId: string): void;

    trainingAnalysisOnBarMouseout(traineeId: string): void;

    trainingAnalysisOnBarClick(traineeId: string): void;

    registerTrainingAnalysisComponent(component: TrainingAnalysisComponent): void;
}
