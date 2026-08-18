interface UserAgentBrand {
    brand: string;
}

interface UserAgentData {
    brands: readonly UserAgentBrand[];
}

const CHROMIUM_BRAND = 'Chromium';
const CHROMIUM_USER_AGENT_PATTERN = /\b(?:Chrome|Chromium|CriOS|Edg|OPR)\//;

/**
 * Determines whether the current browser is built on the Chromium engine.
 * Reads the user agent client hints where the browser exposes them, otherwise matches the user agent string.
 *
 * @returns {boolean} True for Chromium-based browsers such as Chrome, Edge, Brave and Opera.
 */
function isChromiumBased(): boolean {
    const brands = (navigator as Navigator & { userAgentData?: UserAgentData })
        .userAgentData?.brands;
    return brands
        ? brands.some(({ brand }) => brand.includes(CHROMIUM_BRAND))
        : CHROMIUM_USER_AGENT_PATTERN.test(navigator.userAgent);
}

export const BrowserUtils = {
    isChromiumBased,
};
