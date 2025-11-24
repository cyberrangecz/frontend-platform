export interface LevelWithSolution {
    solutionRevealed(): boolean;
    getSolutionContent(): string;
    setSolutionContent(content: string): void;
    solutionPenalized(): boolean;
}
