/** Hue increment in degrees that places each successive categorical index maximally far from all previous ones. */
const GOLDEN_ANGLE_DEGREES = 137.50776405003785;

/** OKLCH lightness of the bold member of a categorical pair. */
const PAIR_DARK_LIGHTNESS = 0.56;
/** OKLCH lightness of the pale member of a categorical pair. */
const PAIR_LIGHT_LIGHTNESS = 0.84;
/** OKLCH chroma of the bold member of a categorical pair. */
const PAIR_DARK_CHROMA = 0.14;
/** OKLCH chroma of the pale member of a categorical pair. */
const PAIR_LIGHT_CHROMA = 0.09;

/** A bold/pale colour pair sharing a single hue, for header-and-detail categorical encoding. */
export interface CategoricalColorPair {
    /** Bold member, for solid fills such as a header or total bar. */
    readonly dark: string;
    /** Pale member, for subdued fills such as nested detail bars. */
    readonly light: string;
}

/**
 * Maps a linear-light sRGB channel to its gamma-encoded display value, clamping
 * out-of-gamut input into the displayable range first.
 *
 * @param channel Linear-light channel intensity, nominally in [0, 1].
 * @returns       Gamma-encoded channel intensity in [0, 1].
 */
function gammaEncode(channel: number): number {
    const clamped = Math.min(Math.max(channel, 0), 1);
    return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/**
 * Formats a gamma-encoded channel intensity as a two-digit hexadecimal byte.
 *
 * @param value Gamma-encoded channel intensity in [0, 1].
 * @returns     Two-character lowercase hex string.
 */
function channelHex(value: number): string {
    return Math.round(value * 255).toString(16).padStart(2, '0');
}

/**
 * Converts an OKLCH colour to a six-digit sRGB hex string. Colours outside the
 * sRGB gamut are clamped per channel.
 *
 * @param lightness  OKLCH perceptual lightness in [0, 1].
 * @param chroma     OKLCH chroma; 0 is achromatic, higher is more saturated.
 * @param hueDegrees Hue angle in degrees.
 * @returns          The colour as `#rrggbb`.
 */
function oklchToHex(lightness: number, chroma: number, hueDegrees: number): string {
    const hueRadians = (hueDegrees * Math.PI) / 180;
    const a = chroma * Math.cos(hueRadians);
    const b = chroma * Math.sin(hueRadians);

    const longRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const mediumRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const shortRoot = lightness - 0.0894841775 * a - 1.291485548 * b;

    const long = longRoot ** 3;
    const medium = mediumRoot ** 3;
    const short = shortRoot ** 3;

    const red = gammaEncode(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short);
    const green = gammaEncode(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short);
    const blue = gammaEncode(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short);

    return `#${channelHex(red)}${channelHex(green)}${channelHex(blue)}`;
}

/**
 * Returns the hue, in degrees, assigned to a categorical index by golden-angle
 * rotation, so any number of indices stay evenly spread around the hue circle.
 *
 * @param index Zero-based categorical index.
 * @returns     Hue angle in [0, 360).
 */
function categoricalHue(index: number): number {
    return (((index * GOLDEN_ANGLE_DEGREES) % 360) + 360) % 360;
}

/**
 * Builds the bold/pale colour pair for a hue. Both members share the hue and
 * differ only in lightness and chroma, so they read as one colour family. The
 * chroma scale dials saturation: 1 is full saturation, lower values mute the
 * pair toward grey while preserving its hue.
 *
 * @param hueDegrees  Hue angle in degrees.
 * @param chromaScale Multiplier applied to both members' chroma; defaults to 1.
 * @returns           The hex colour pair for that hue and saturation.
 */
function pairFromHue(hueDegrees: number, chromaScale = 1): CategoricalColorPair {
    return {
        dark: oklchToHex(PAIR_DARK_LIGHTNESS, PAIR_DARK_CHROMA * chromaScale, hueDegrees),
        light: oklchToHex(PAIR_LIGHT_LIGHTNESS, PAIR_LIGHT_CHROMA * chromaScale, hueDegrees),
    };
}

/**
 * Generates the bold/pale colour pair for a categorical index from its
 * golden-angle hue. The sequence is unbounded and never cycles.
 *
 * @param index Zero-based categorical index.
 * @returns     The hex colour pair for that index.
 */
function categoricalPair(index: number): CategoricalColorPair {
    return pairFromHue(categoricalHue(index));
}

/** Rec. 709 luma coefficients, summing to 1, for relative-luminance grey. */
const REC_709_LUMA = { red: 0.2126, green: 0.7152, blue: 0.0722 } as const;

/**
 * Parses a `#rgb` or `#rrggbb` hex colour into its three gamma-encoded sRGB
 * channel intensities.
 *
 * @param hex Hex colour, with or without leading `#`, in 3- or 6-digit form.
 * @returns   Tuple of red, green, blue intensities in [0, 1].
 * @throws {RangeError} When the string is not a 3- or 6-digit hex colour.
 */
function parseHexChannels(hex: string): [number, number, number] {
    const body = hex.replace(/^#/, '');
    const full = body.length === 3 ? body.replace(/./g, '$&$&') : body;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        throw new RangeError(`Not a 3- or 6-digit hex colour: ${hex}`);
    }
    return [
        parseInt(full.slice(0, 2), 16) / 255,
        parseInt(full.slice(2, 4), 16) / 255,
        parseInt(full.slice(4, 6), 16) / 255,
    ];
}

/**
 * Desaturates a hex colour by blending each channel toward the colour's own
 * relative-luminance grey, muting colourfulness while preserving luminance and
 * hue. An amount of 0 returns the colour unchanged; 1 returns full grey.
 *
 * @param hex    Source colour as `#rgb` or `#rrggbb`.
 * @param amount Blend fraction toward grey; clamped to [0, 1].
 * @returns      The desaturated colour as `#rrggbb`.
 * @throws {RangeError} When `hex` is not a 3- or 6-digit hex colour.
 */
function desaturate(hex: string, amount: number): string {
    const [red, green, blue] = parseHexChannels(hex);
    const fraction = Math.min(Math.max(amount, 0), 1);
    const luma = REC_709_LUMA.red * red + REC_709_LUMA.green * green + REC_709_LUMA.blue * blue;
    const towardGrey = (channel: number): number => channel + (luma - channel) * fraction;
    return `#${channelHex(towardGrey(red))}${channelHex(towardGrey(green))}${channelHex(towardGrey(blue))}`;
}

export const ColorUtils = {
    categoricalHue,
    categoricalPair,
    pairFromHue,
    oklchToHex,
    desaturate,
};
