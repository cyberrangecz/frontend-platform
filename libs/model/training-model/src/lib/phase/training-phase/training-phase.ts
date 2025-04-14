import { Phase } from '../phase';
import { Task } from './task';
import { DecisionMatrixRow } from './decision-matrix-row';
import { MitreTechnique } from '../../mitre-techniques/mitre-technique';

export class TrainingPhase extends Phase {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    tasks: Task[] = [];
    decisionMatrix: DecisionMatrixRow[] = [];
    currentTask?: Task;
    mitreTechniques: MitreTechnique[] = [];
    expectedCommands: string[] = [];

}
