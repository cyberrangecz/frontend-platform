import {TrainingUser} from '@crczp/training-model';
import {TransitionPhase} from './phase/transition-phase-model';

export class RunVisualizationPathNode {
    phaseId!: number;
    phaseOrder!: number;
    taskId!: number;
    taskOrder!: number;
}


export class AdaptiveRunVisualization {
    trainingRunId!: number;
    trainee!: TrainingUser;
    trainingRunPathNodes!: RunVisualizationPathNode[];
    localEnvironment!: boolean;
}

export class TransitionVisualizationData {
    phases!: TransitionPhase[];
    trainingRunsData!: AdaptiveRunVisualization[];
}

export class TraineePhasePerformance {
    phaseId: number;
    phaseTime: number;
    wrongAnswers: number;
    solutionDisplayed: boolean;
    numberOfCommands: number;
    keywordsInCommands: number;
    questionnaireAnswered: boolean;
}
