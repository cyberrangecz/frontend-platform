import { z } from 'zod';
import { AbstractLevelBasic } from './abstract-level-basic';
import { MitreTechnique, MitreTechniqueBasic } from '../mitre-techniques/mitre-technique';
import { Hint, HintBasic } from './hint';
import { Level } from './level';
import { ReferenceSolutionNode } from './reference-solution-node';
import { LevelWithSolution } from '../level-with-solution-interface';

/** Basic read-only training level data safe for all roles. Subset of {@link TrainingLevel}. */
export class TrainingLevelBasic extends AbstractLevelBasic.extend({
    incorrectAnswerLimit: z.number(),
    isSolutionPenalized: z.boolean(),
    hints: z.array(HintBasic.schema()),
    mitreTechniques: z.array(MitreTechniqueBasic.schema()),
}) {}

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
