/**
 * Crosshair configuration
 */
export interface CrosshairConfig {
    score: {
        line: {
            y1: number;
            y2: number;
        };
        label: {
            x: number;
            y: number;
        };
    };
    time: {
        line: {
            x1: number;
            x2: number;
        };
        label: {
            x: number;
            y: number;
        };
    };
}
