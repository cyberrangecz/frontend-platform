/**
 * Axes configuration
 */
export interface AxesConfig {
    xAxis: {
        position: {
            x: number;
            y: number;
        };
        tickSize: number;
    };
    yAxis: {
        position: {
            x: number;
            y: number;
        };
        tickSize: number;
        ticks: number;
        tickPadding: number;
        tickPositionY: number;
    };
}
