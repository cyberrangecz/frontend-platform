export interface HintDTO {
    content?: string;
    hint_penalty?: number;
    id?: number;
    title?: string;
    order?: number;
}

export class HintDTOClass implements HintDTO {
    content: string;
    hint_penalty: number;
    id: number;
    title: string;
    order: number;
}
