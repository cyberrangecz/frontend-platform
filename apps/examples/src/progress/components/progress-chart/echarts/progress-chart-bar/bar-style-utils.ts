import { SingleBarData } from '../progress-chart';

type FillColorType =
    | 'UNKNOWN'
    | 'OK'
    | 'WARNING'
    | 'LATE'
    | 'INACTIVE'
    | 'ABANDONED'
    | 'INACTIVE_HIGHLIGHTED';

function minutesToUnix(minutes: number): number {
    return minutes * 60 * 1000;
}

function getFillColor(item: SingleBarData): CSSStyleDeclaration['color'] {
    const state = stateByEstimate(item);
    return BAR_COLORS[state];
}

function getEstimatePattern(item: SingleBarData): HTMLCanvasElement {
    const state = stateByEstimate(item);
    return ESTIMATE_PATTERNS[state];
}

const BAR_COLORS: Record<FillColorType, CSSStyleDeclaration['color']> = {
    UNKNOWN: 'rgba(84,112,198)',
    OK: 'rgba(76,175,80)',
    WARNING: 'rgba(255,152,0)',
    LATE: 'rgba(244,67,54)',
    ABANDONED: 'rgb(92,68,68)',
    INACTIVE: 'rgb(167,200,223)',
    INACTIVE_HIGHLIGHTED: 'rgb(106,106,106)',
};

const ESTIMATE_PATTERNS: Record<FillColorType, HTMLCanvasElement> = {
    OK: createStripePattern('#225e00'),
    WARNING: createStripePattern('#bc5e00'),
    LATE: createStripePattern('#aa0000'),
    ABANDONED: createStripePattern('#08102b'),
    UNKNOWN: createStripePattern('#0c1e8c'),
    INACTIVE: createStripePattern('#4d4a4a'),
    INACTIVE_HIGHLIGHTED: createStripePattern('#aeaeae'),
};

function stateByEstimate(item: SingleBarData): FillColorType {
    if (item.state !== 'RUNNING') {
        if (item.isHighlighted) {
            return 'INACTIVE_HIGHLIGHTED';
        }
        return 'INACTIVE';
    }
    if (item.isOtherHighlighted) {
        return 'INACTIVE';
    }

    if (item.estimatedEndTime === undefined) {
        return 'UNKNOWN';
    }

    if (item.estimatedEndTime >= item.endTime) {
        return 'OK';
    }

    const delay = item.endTime - item.estimatedEndTime;
    const estimatedDuration = item.estimatedEndTime - item.startTime;

    // If estimate is less than 5 minutes (300000ms)
    if (estimatedDuration < minutesToUnix(5)) {
        if (delay <= minutesToUnix(2)) {
            // 2 min late
            return 'WARNING';
        } else if (delay <= minutesToUnix(5)) {
            // 5 min late
            return 'LATE';
        } else {
            // 60 min late (or more)
            return 'ABANDONED';
        }
    }

    // If estimate is >= 5 minutes, use percentage scale
    const delayPercentage = (delay / estimatedDuration) * 100;

    if (delayPercentage < 10) {
        return 'OK';
    } else if (delayPercentage >= 10 && delayPercentage <= 30) {
        // 10% late
        return 'WARNING';
    } else if (delayPercentage > 30 && delayPercentage < 200) {
        // 30% late
        return 'LATE';
    } else {
        // 200% late (or more)
        return 'ABANDONED';
    }
}

function createStripePattern(
    stroke: CSSStyleDeclaration['color'],
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    // Diagonal stripes - draw multiple lines to ensure seamless tiling
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    // Main diagonal
    ctx.moveTo(-1, -1);
    ctx.lineTo(9, 9);
    // Top-left overflow to connect with bottom-right of adjacent tile
    ctx.moveTo(-1, 7);
    ctx.lineTo(1, 9);
    // Bottom-right overflow to connect with top-left of adjacent tile
    ctx.moveTo(7, -1);
    ctx.lineTo(9, 1);
    ctx.stroke();
    return canvas;
}

function getScaleFactor(item: SingleBarData): number {
    if (
        item.isOtherHighlighted ||
        (item.isHighlighted && item.state !== 'RUNNING')
    ) {
        return 0.6;
    } else if (item.state === 'RUNNING') {
        return 1.1;
    } else {
        return 1;
    }
}

export const ProgressBarStyleUtils = {
    getFillColor,
    getEstimatePattern,
    getScaleFactor,
};
