import {SvgConfig} from '../../../../shared/interfaces/configurations/svg-config';
import {SvgMarginConfig} from '../../../../shared/interfaces/configurations/svg-margin-config';
import {BarConfig} from '../../../../shared/interfaces/configurations/bar-config';
import {AxesConfig} from '../../../../shared/interfaces/configurations/axes-config';
import {CrosshairConfig} from '../../../../shared/interfaces/configurations/crosshair-config';
import {LevelLabelsConfig} from '../interfaces/level-labels-config';

export const colorScheme: string[] = ['#307bc1', '#41ae43', '#ff9d3c', '#fc5248', '#f2d64f', '#8035c6'];

export const SVG_CONFIG: SvgConfig = {
    width: 1200,
    height: 500,
};

export const SVG_MARGIN_CONFIG: SvgMarginConfig = {
    top: 20,
    right: 20,
    bottom: 50,
    left: 80,
};

export const BARS_CONFIG: BarConfig = {
    width: SVG_CONFIG.width * 0.7,
    height: SVG_CONFIG.height,
    padding: 0.3,
    maxBarOpacity: 0.6,
};

export const PLAYER_POINT_CONFIG = {
    pointRadius: 5,
    pointHighlight: 1.3,
    feedbackLearner: {
        pointRadius: 10,
    },
};

export const AXES_CONFIG: AxesConfig = {
    xAxis: {
        position: {
            x: -PLAYER_POINT_CONFIG.pointRadius / 2,
            y: SVG_CONFIG.height + BARS_CONFIG.padding * BARS_CONFIG.padding,
        },
        tickSize: 7,
    },
    yAxis: {
        position: {
            x: -PLAYER_POINT_CONFIG.pointRadius / 2,
            y: 0,
        },
        tickSize: 0,
        ticks: 2,
        tickPadding: 10,
        tickPositionY: 0,
    },
};

export const LEVEL_LABELS_CONFIG: LevelLabelsConfig = {
    padding: {
        left: 20,
        top: 10,
    },
};

export const CROSSHAIR_CONFIG: CrosshairConfig = {
    score: {
        line: {
            y1: -10,
            y2: SVG_CONFIG.height + 30,
        },
        label: {
            x: -30,
            y: 15,
        },
    },
    time: {
        line: {
            x1: -10,
            x2: BARS_CONFIG.width + 10,
        },
        label: {
            x: 5,
            y: SVG_CONFIG.height + BARS_CONFIG.padding * BARS_CONFIG.padding - 5,
        },
    },
};
