import { MitreTechnique } from '../mitre-techniques/mitre-technique';
import { Hint } from './hint';
import { Level } from './level';
import { ReferenceSolutionNode } from './reference-solution-node';
import { LevelWithSolution } from '../level-with-solution-interface';

/**
 * Class representing level in a training of type Training
 */
export class TrainingLevel extends Level implements LevelWithSolution {
    answer!: string;
    answerVariableName!: string;
    hints: Hint[] = [];
    content!: string;
    solution!: string;
    incorrectAnswerLimit = 5;
    isSolutionPenalized = true;
    referenceSolution: ReferenceSolutionNode[] = [];
    variantAnswers!: boolean;
    mitreTechniques: MitreTechnique[] = [];
    expectedCommands: string[] = [];
    commandsRequired = true;

    solutionRevealed(): boolean {
        return this.solution !== null && this.solution !== undefined;
    }

    getSolutionContent(): string {
        return this.solution;
    }

    setSolutionContent(content: string): void {
        this.solution = content;
    }

    solutionPenalized(): boolean {
        return this.isSolutionPenalized;
    }
}
