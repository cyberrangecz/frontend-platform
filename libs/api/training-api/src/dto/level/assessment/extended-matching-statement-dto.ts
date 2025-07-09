export class ExtendedMatchingStatementDTO {
    id: number;
    order: number;
    text: string;
    correct_option_order: number;

    constructor(id: number, order: number, text: string, correct_option_order: number) {
        this.id = id;
        this.order = order;
        this.text = text;
        this.correct_option_order = correct_option_order;
    }
}
