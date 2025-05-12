import { SvgConfig } from '../../../../shared/interfaces/configurations/svg-config';
import { SvgMarginConfig } from '../../../../shared/interfaces/configurations/svg-margin-config';
import { AxesConfig } from '../../../../shared/interfaces/configurations/axes-config';
import { ContextConfig } from './interfaces/context-config';

export const colorScheme: string[] = ['#307bc1', '#41ae43', '#ff9d3c', '#fc5248', '#f2d64f', '#8035c6'];

export const SVG_CONFIG: SvgConfig = {
    width: 1000,
    height: 600,
};
export const SVG_MARGIN_CONFIG: SvgMarginConfig = {
    top: 70,
    right: 72,
    bottom: 200,
    left: 120,
};
export const AXES_CONFIG: AxesConfig = {
    xAxis: {
        position: {
            x: 0,
            y: SVG_CONFIG.height + 20,
        },
        tickSize: 7,
    },
    yAxis: {
        position: {
            x: 0,
            y: 0,
        },
        tickSize: 0,
        ticks: 2,
        tickPadding: 10,
        tickPositionY: -5,
    },
};
export const CONTEXT_CONFIG: ContextConfig = {
    height: 70,
};
