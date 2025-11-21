import { Phase } from '../phase';
import { DecisionMatrixRow } from './decision-matrix-row';
import { MitreTechnique } from '../../mitre-techniques/mitre-technique';
import { AdaptiveTask } from './adaptive-task';
import { LevelWithSolution } from '../../level-with-solution-interface';

export class TrainingPhase extends Phase implements LevelWithSolution {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    tasks: AdaptiveTask[] = [];
    decisionMatrix: DecisionMatrixRow[] = [];
    currentTask?: AdaptiveTask;
    mitreTechniques: MitreTechnique[] = [];
    expectedCommands: string[] = [];

    solutionRevealed(): boolean {
        return (
            this.currentTask?.solution !== null &&
            this.currentTask?.solution !== undefined
        );
    }

    getSolutionContent(): string {
        return this.currentTask?.solution || '';
    }

    setSolutionContent(content: string): void {
        if (this.currentTask) {
            this.currentTask.solution = content;
        }
    }

    solutionPenalized(): boolean {
        return true;
    }
}
