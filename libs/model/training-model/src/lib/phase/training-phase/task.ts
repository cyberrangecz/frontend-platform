import { Phase } from '../phase';

export class Task extends Phase {
    answer!: string;
    content!: string;
    solution!: string;
    incorrectAnswerLimit!: number;
    modifySandbox!: boolean;

}
