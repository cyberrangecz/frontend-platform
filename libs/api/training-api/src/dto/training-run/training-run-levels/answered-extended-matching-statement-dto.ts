export class AnsweredExtendedMatchingStatementDTO {
    id: number;
    order: number;
    text: string;
    user_option_order: number;

    constructor(id: number, order: number, text: string, user_option_order: number) {
        this.id = id;
        this.order = order;
        this.text = text;
        this.user_option_order = user_option_order;
    }
}
