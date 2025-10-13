import {Phase} from '../phase';

export class AdaptiveTask extends Phase {
    answer!: string;
    content!: string;
    solution!: string;
    incorrectAnswerLimit!: number;
    modifySandbox!: boolean;

}
