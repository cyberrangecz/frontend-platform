import {Question} from './question';
import {ExtendedMatchingStatement} from './extended-matching-statement';
import {ExtendedMatchingOption} from './extended-matching-option';

export class ExtendedMatchingItems extends Question {
    extendedMatchingStatements: ExtendedMatchingStatement[] = [];
    extendedMatchingOptions: ExtendedMatchingOption[] = [];
    userAnswers: { [key: number]: number } = {}

    constructor(title: string) {
        super(title);
    }
}
