import {MitreTechnique} from '../mitre-techniques/mitre-technique';
import {Hint} from './hint';
import {Level} from './level';
import {ReferenceSolutionNode} from './reference-solution-node';

/**
 * Class representing level in a training of type Training
 */
export class TrainingLevel extends Level {
    answer!: string;
    answerVariableName!: string;
    hints: Hint[] = [];
    content!: string;
    solution!: string;
    incorrectAnswerLimit = 5;
    solutionPenalized = true;
    referenceSolution: ReferenceSolutionNode[] = [];
    variantAnswers!: boolean;
    mitreTechniques: MitreTechnique[] = [];
    expectedCommands: string[] = [];
    commandsRequired = true;

    hasSolution(): boolean {
        return this.solution !== null && this.solution !== undefined;
    }
}
