export interface MitreTechniquesListDTO {
    techniques: MitreTechniquePythonDTO[];
}

export class MitreTechniquePythonDTO {
    code: string;
    name: string;
}
