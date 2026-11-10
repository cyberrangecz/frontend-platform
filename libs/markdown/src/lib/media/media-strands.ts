/** One string of a media card's strands: a carrier wave swinging inside a shared envelope. */
export interface Strand {
    /** Distance between two crests, in pixels. */
    readonly wavelength: number;
    /** Offset of the crests, in radians. */
    readonly phase: number;
    /** Pixels per second the crests travel toward the download edge. */
    readonly speed: number;
    /** Share of the envelope the string swings out to. */
    readonly reach: number;
    readonly alpha: number;
    readonly lineWidth: number;
}

/** The layered strings the audio and video cards draw their downloads with. */
export const STRANDS: readonly Strand[] = [
    { wavelength: 31, phase: 0, speed: 26, reach: 1, alpha: 1, lineWidth: 1.75 },
    { wavelength: 21, phase: 2.2, speed: 17, reach: 0.74, alpha: 0.5, lineWidth: 1.25 },
    { wavelength: 44, phase: 4.1, speed: 38, reach: 0.86, alpha: 0.32, lineWidth: 1.25 },
];

const SWELL_WAVELENGTH = 170;
const SWELL_SPEED = 21;
const SWELL_DEPTH = 0.35;

/**
 * Share of its full swing the strands keep at a point, as a slow swell travels along them so
 * their height breathes instead of standing uniform.
 */
export function swellAt(x: number, travelSeconds: number): number {
    return 1 - SWELL_DEPTH * (0.5 + 0.5 * Math.sin((2 * Math.PI * (x - SWELL_SPEED * travelSeconds)) / SWELL_WAVELENGTH));
}

/**
 * How far a string swings from its line at a point, as a share of the envelope: its crests moved
 * on by the travel so far and packed by the given share of the wavelength around the origin.
 */
export function strandSwingAt(strand: Strand, x: number, origin: number, wavelengthShare: number, travelSeconds: number): number {
    const travelledCycles = (strand.speed / strand.wavelength) * travelSeconds;
    const cycles = (x - origin) / (strand.wavelength * wavelengthShare) - travelledCycles;
    return strand.reach * Math.sin(2 * Math.PI * cycles + strand.phase);
}

/** 0 at both ends of a span, rising smoothly to 1 within the fade distance of each end. */
export function fadeAtEnds(x: number, span: number, fade: number): number {
    const distance = Math.max(1, Math.min(fade, span / 2));
    return smoothStep(x / distance) * smoothStep((span - x) / distance);
}

export function smoothStep(value: number): number {
    const bounded = clamp(value);
    return bounded * bounded * (3 - 2 * bounded);
}

export function clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(value: number): number {
    return 1 - (1 - value) ** 3;
}

export function easeInOutCubic(value: number): number {
    const bounded = clamp(value);
    return bounded < 0.5 ? 4 * bounded ** 3 : 1 - (-2 * bounded + 2) ** 3 / 2;
}

/** Moves a value toward a target by an exponential ease with the given time constant. */
export function approach(value: number, target: number, stepMs: number, timeConstantMs: number): number {
    return value + (target - value) * (1 - Math.exp(-stepMs / timeConstantMs));
}
