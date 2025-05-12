import { SvgConfig } from '../../../../shared/interfaces/configurations/svg-config';
import { SvgMarginConfig } from '../../../../shared/interfaces/configurations/svg-margin-config';
import { BarConfig } from '../../../../shared/interfaces/configurations/bar-config';
import { PlayerPointConfig } from '../../../../shared/interfaces/configurations/player-point-config';
import { AxesConfig } from '../../../../shared/interfaces/configurations/axes-config';
import { CrosshairConfig } from '../../../../shared/interfaces/configurations/crosshair-config';

export const SVG_CONFIG: SvgConfig = {
    width: 1200,
    height: 100,
};

export const SVG_MARGIN_CONFIG: SvgMarginConfig = {
    top: 15,
    right: 25,
    bottom: 50,
    left: 80,
};

export const BAR_CONFIG: BarConfig = {
    width: SVG_CONFIG.width * 0.7,
    height: SVG_CONFIG.height,
    fillColorDark: '#979797',
    fillColorBright: '#dbdbdb',
};

export const PLAYER_POINT_CONFIG: PlayerPointConfig = {
    pointRadius: 5,
    pointHighlight: 1.2,
    fillColor: '#7b7b7b',
    feedbackLearner: {
        pointRadius: 10,
    },
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
            x2: BAR_CONFIG.width + 10,
        },
        label: {
            x: 5,
            y: SVG_CONFIG.height + 15,
        },
    },
};
