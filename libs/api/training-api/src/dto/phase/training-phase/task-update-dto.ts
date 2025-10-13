export class TaskUpdateDTO {
    id: number;
    title: string;
    content: string;
    solution: string;
    answer: string;
    incorrect_answer_limit: number;
    modify_sandbox: boolean;
}
