function extractCssVariable(key: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(key);
}

export const DocumentUtils = {
    extractCssVariable,
};
