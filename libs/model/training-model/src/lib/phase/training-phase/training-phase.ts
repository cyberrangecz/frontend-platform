import {Phase} from '../phase';
import {DecisionMatrixRow} from './decision-matrix-row';
import {MitreTechnique} from '../../mitre-techniques/mitre-technique';
import {AdaptiveTask} from './adaptive-task';

export class TrainingPhase extends Phase {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    tasks: AdaptiveTask[] = [];
    decisionMatrix: DecisionMatrixRow[] = [];
    currentTask?: AdaptiveTask;
    mitreTechniques: MitreTechnique[] = [];
    expectedCommands: string[] = [];

}
