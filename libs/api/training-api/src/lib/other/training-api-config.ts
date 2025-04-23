export class TrainingApiConfig {
    trainingBasePath: string;
    adaptiveBasePath: string;
    mitreTechniqueBasePath: string;

    constructor(trainingBasePath: string, adaptiveBasePath: string, mitreTechniqueBasePath: string) {
        this.trainingBasePath = trainingBasePath;
        this.adaptiveBasePath = adaptiveBasePath;
        this.mitreTechniqueBasePath = mitreTechniqueBasePath;
    }
}
