import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, skipWhile } from 'rxjs';
import { withCache } from '@ngneat/cashew';
import { LoadingTracker } from '@crczp/utils';

const ICON_PATHS = {
    LINUX: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg',
    WINDOWS:
        'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg',
    CONSOLE: '/assets/topology/console.svg',
    ROUTER: '/assets/topology/router.svg',
    HOST: '/assets/topology/host.svg',
    INTERNET: '/assets/topology/internet.svg',
};

function getIconSize(key: keyof typeof ICON_PATHS) {
    switch (key) {
        case 'WINDOWS':
            return 20;
        case 'LINUX':
        case 'CONSOLE':
            return 24;
        case 'ROUTER':
        case 'HOST':
        case 'INTERNET':
            return 64;
        default:
            return 32;
    }
}

const CONFIG = {
    // Dimensions
    NODE_MIN_WIDTH: 150,
    NODE_MAX_WIDTH: 320,
    // NODE_MAIN_CARD_HEIGHT is now calculated dynamically
    MAIN_CARD_BOTTOM_PADDING: 8, // Padding below the label inside the card
    CARD_RX: 20,

    SUBNET_MIN_RADIUS: 100,

    INDICATOR: {
        SIZE: 24,
        BACKDROP_SIZE: 32,
        MARGIN: 24,
        BACKDROP_RADIUS: 12,
        BACKDROP_FILL: {
            CONSOLE: '#F0FFF4',
            LINUX: '#fff4d1',
            WINDOWS: '#d8f8f5',
        },
        BACKDROP_STROKE: {
            CONSOLE: '#9AE6B4',
            LINUX: '#fffa94',
            WINDOWS: '#43c7f9',
        },
    },

    // Positioning
    HEADER_PADDING: 2,
    ICON_SIZE: 64,
    LABEL_TOP_MARGIN: 10,
    LABEL_SIDE_PADDING: 20,

    // Fonts
    LABEL_FONT_SIZE: 18,
    LABEL_FONT_FAMILY: "'Inter', sans-serif",
    IP_TOP_MARGIN: 6,
    IP_COLOR: '#718096',

    // Colors & Styles
    ACCENT_COLOR: '#4299e1',
    COLORS: {
        primary: {
            main: '#4299e1',
            bg: '#EDF2F7',
            text: '#2D3748',
            border: '#CBD5E0',
        },
        secondary: {
            main: '#48bb78',
            bg: '#F0FFF4',
            text: '#2F855A',
            border: '#9AE6B4',
        },
    },
};

type IndicatorData = {
    uri: string;
    fillColor: string;
    strokeColor: string;
};

@Injectable({
    providedIn: 'root',
})
export class TopologyNodeSvgService {
    private readonly http = inject(HttpClient);
    private readonly domParser = new DOMParser();
    private textMeasureContext?: CanvasRenderingContext2D;

    private preloadedIconUris: Map<string, string> = new Map();
    private loadingTracker = new LoadingTracker();

    constructor() {
        Object.keys(ICON_PATHS)
            .concat()
            .forEach((key: string) =>
                this.loadingTracker
                    .trackRequest(() =>
                        this.http.get(ICON_PATHS[key], {
                            responseType: 'text',
                            context: withCache({
                                storage: 'localStorage',
                                ttl: 7.2e6,
                            }),
                        })
                    )
                    .subscribe((res) =>
                        this.preloadedIconUris.set(
                            key,
                            `data:image/svg+xml;base64,${btoa(
                                this.processIcon(
                                    res,
                                    getIconSize(key as keyof typeof ICON_PATHS)
                                )
                            )}`
                        )
                    )
            );
    }

    public generateNodeSvg(
        label: string,
        deviceType: 'ROUTER' | 'HOST' | 'INTERNET',
        osType: 'LINUX' | 'WINDOWS',
        ip: string,
        consoleAccess: boolean
    ): Observable<string> {
        return this.loadingTracker.isLoading$.pipe(
            skipWhile((loading) => loading),
            map(() => {
                const svgString = this.buildNodeSvg(
                    label,
                    this.getPreloadedIcon(deviceType),
                    consoleAccess && deviceType !== 'INTERNET'
                        ? {
                              uri: this.getPreloadedIcon('CONSOLE'),
                              fillColor: CONFIG.INDICATOR.BACKDROP_FILL.CONSOLE,
                              strokeColor:
                                  CONFIG.INDICATOR.BACKDROP_STROKE.CONSOLE,
                          }
                        : null,
                    deviceType !== 'INTERNET'
                        ? {
                              uri: this.getPreloadedIcon(osType),
                              fillColor: CONFIG.INDICATOR.BACKDROP_FILL[osType],
                              strokeColor:
                                  CONFIG.INDICATOR.BACKDROP_STROKE[osType],
                          }
                        : null,
                    ip
                );
                return `data:image/svg+xml;base64,${btoa(svgString)}`;
            })
        );
    }

    public generateSubnetSvg(name: string, cidr: string): string {
        // Font configurations - name is bold, cidr is regular but 2 sizes larger
        const nameFont = `700 ${CONFIG.LABEL_FONT_SIZE}px ${CONFIG.LABEL_FONT_FAMILY}`;
        const cidrFont = `500 ${CONFIG.LABEL_FONT_SIZE}px ${CONFIG.LABEL_FONT_FAMILY}`;

        // Measure text dimensions
        const nameWidth = this.measureTextWidth(name, nameFont);
        const cidrWidth = this.measureTextWidth(cidr, cidrFont);

        // Calculate required dimensions
        const maxTextWidth = Math.max(nameWidth, cidrWidth);
        const totalTextHeight =
            CONFIG.LABEL_FONT_SIZE + CONFIG.LABEL_FONT_SIZE + 16; // 16px gap between texts

        // Calculate circle radius with padding (ensure circle is big enough for content)
        const horizontalRadius = maxTextWidth / 2 + 24; // 24px horizontal padding
        const verticalRadius = totalTextHeight / 2 + 20; // 20px vertical padding
        const radius = Math.max(
            horizontalRadius,
            verticalRadius,
            CONFIG.SUBNET_MIN_RADIUS
        );

        // SVG dimensions with small border margin
        const svgSize = radius * 2 + 4;
        const centerX = svgSize / 2;
        const centerY = svgSize / 2;

        // Text positions - name above center, cidr below center
        const nameY = centerY - 8;
        const cidrY = centerY + 14;

        const circleFill = 'rgba(255, 255, 255, 0.95)';

        const svgContent = `
                <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
                    <circle
                        cx="${centerX}"
                        cy="${centerY}"
                        r="${radius}"
                        fill="${circleFill}"
                        stroke="white"
                        stroke-width="1.5"
                    />
                    <text
                        x="${centerX}"
                        y="${nameY}"
                        font-family="${CONFIG.LABEL_FONT_FAMILY}"
                        font-size="${CONFIG.LABEL_FONT_SIZE}px"
                        font-weight="700"
                        fill="#1a202c"
                        text-anchor="middle"
                        dominant-baseline="middle"
                    >
                        ${this.escapeXml(name)}
                    </text>
                    <text
                        x="${centerX}"
                        y="${cidrY}"
                        font-family="${CONFIG.LABEL_FONT_FAMILY}"
                        font-size="${CONFIG.LABEL_FONT_SIZE}px"
                        font-weight="400"
                        fill="#4a5568"
                        text-anchor="middle"
                        dominant-baseline="middle"
                    >
                        ${this.escapeXml(cidr)}
                    </text>
                </svg>`.trim();

        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    }

    private getPreloadedIcon(key: keyof typeof ICON_PATHS): string {
        return this.preloadedIconUris.get(key);
    }

    private measureTextWidth(text: string, font: string): number {
        if (!this.textMeasureContext) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return text.length * 8; // Fallback
            this.textMeasureContext = context;
        }
        this.textMeasureContext.font = font;
        return this.textMeasureContext.measureText(text).width;
    }

    private processIcon(rawIconSvg: string, size: number): string {
        const svgDoc = this.domParser.parseFromString(
            rawIconSvg,
            'image/svg+xml'
        );
        const svgElement = svgDoc.documentElement;
        svgElement.setAttribute('width', size.toString());
        svgElement.setAttribute('height', size.toString());
        return svgElement.outerHTML;
    }

    private buildNodeSvg(
        label: string,
        mainIconDataUri: string,
        consoleIndicatorData: IndicatorData | null,
        osIndicatorData: IndicatorData | null,
        ip: string | null
    ): string {
        // --- Step 1: Independently calculate required widths ---
        const labelFont = `600 ${CONFIG.LABEL_FONT_SIZE}px ${CONFIG.LABEL_FONT_FAMILY}`;
        const mainCardContentWidth =
            this.measureTextWidth(label, labelFont) +
            CONFIG.LABEL_SIDE_PADDING * 2;

        // --- Step 2: Determine final SVG width, clamping it within bounds ---
        const dynamicWidth = Math.max(
            CONFIG.NODE_MIN_WIDTH,
            Math.min(mainCardContentWidth, CONFIG.NODE_MAX_WIDTH)
        );

        // --- Step 3: Calculate Heights (now includes IP if present) ---
        const baseHeight =
            CONFIG.HEADER_PADDING +
            CONFIG.ICON_SIZE +
            CONFIG.LABEL_TOP_MARGIN +
            CONFIG.LABEL_FONT_SIZE +
            CONFIG.MAIN_CARD_BOTTOM_PADDING;

        const ipHeight = ip
            ? CONFIG.IP_TOP_MARGIN +
              CONFIG.LABEL_FONT_SIZE +
              CONFIG.MAIN_CARD_BOTTOM_PADDING
            : 0;
        const totalHeight = baseHeight + ipHeight;

        // --- Step 4: Build SVG Parts ---
        const definitions = this.buildSvgDefinitions(dynamicWidth);
        const mainCard = this.buildMainCard(totalHeight, dynamicWidth);
        const header = this.buildHeader(
            mainIconDataUri,
            consoleIndicatorData,
            osIndicatorData,
            label,
            dynamicWidth,
            ip // Pass IP to header builder
        );

        return `
    <svg width="${dynamicWidth}" height="${totalHeight}" viewBox="0 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        ${definitions}
        <g> ${mainCard} ${header}</g>
    </svg>`;
    }

    private buildSvgDefinitions(width: number): string {
        const iconY = CONFIG.HEADER_PADDING + 8;
        const labelBaselineY =
            iconY + CONFIG.ICON_SIZE + CONFIG.LABEL_TOP_MARGIN;
        const clipRectY = labelBaselineY - CONFIG.LABEL_FONT_SIZE;
        const clipRectHeight =
            CONFIG.LABEL_FONT_SIZE * 3 +
            CONFIG.IP_TOP_MARGIN +
            CONFIG.LABEL_FONT_SIZE;
        const textClipPathX = CONFIG.LABEL_SIDE_PADDING / 2;
        const textClipPathWidth = width - CONFIG.LABEL_SIDE_PADDING;

        return `
         <defs>
            <clipPath id="label-clip-path">
                <rect x="${textClipPathX}" y="${clipRectY}" width="${textClipPathWidth}" height="${clipRectHeight}" />
            </clipPath>
                    <clipPath id="label-clip-path">
                    <rect x="${textClipPathX}" y="${clipRectY}" width="${textClipPathWidth}" height="${clipRectHeight}" />
                </clipPath>


            <linearGradient id="main-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" style="stop-color:#ffffff;"/>
                 <stop offset="100%" style="stop-color:#f8fafb;"/>
            </linearGradient>

            <linearGradient id="footer-glow-gradient" x1="0%" x2="100%">
                <stop offset="0%" stop-color="${
                    CONFIG.ACCENT_COLOR
                }" stop-opacity="0"/>
                <stop offset="50%" stop-color="${
                    CONFIG.ACCENT_COLOR
                }" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="${
                    CONFIG.ACCENT_COLOR
                }" stop-opacity="0"/>
            </linearGradient>

            <linearGradient id="indicator-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${CONFIG.COLORS.primary.main}" />
                <stop offset="100%" stop-color="${this.chroma(
                    CONFIG.COLORS.primary.main
                ).darken(0.5)}" />
            </linearGradient>

            <linearGradient id="indicator-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${
                    CONFIG.COLORS.secondary.main
                }" />
                <stop offset="100%" stop-color="${this.chroma(
                    CONFIG.COLORS.secondary.main
                ).darken(0.5)}" />
            </linearGradient>
         </defs>`;
    }

    private buildMainCard(height: number, width: number): string {
        return `<rect x="1" y="1" width="${width - 2}" height="${
            height - 2
        }" rx="${CONFIG.CARD_RX}" ry="${
            CONFIG.CARD_RX
        }" fill="url(#main-bg)" stroke="rgba(226, 232, 240, 0.8)" stroke-width="1.5"/>`;
    }

    private buildIndicatorShapes(iconData: IndicatorData) {
        return `<rect
                width="${CONFIG.INDICATOR.BACKDROP_SIZE}"
                height="${CONFIG.INDICATOR.BACKDROP_SIZE}"
                x="${-CONFIG.INDICATOR.BACKDROP_SIZE / 2}"
                y="${-CONFIG.INDICATOR.BACKDROP_SIZE / 2}"
                fill="${iconData.fillColor}"
                stroke="${iconData.strokeColor}"
                stroke-width="1"
                rx="${CONFIG.INDICATOR.BACKDROP_RADIUS}"
                ry="${CONFIG.INDICATOR.BACKDROP_RADIUS}"
            />
            <image
                href="${iconData.uri}"
                x="-${CONFIG.INDICATOR.SIZE / 2}"
                y="-${CONFIG.INDICATOR.SIZE / 2}"
                height="${CONFIG.INDICATOR.SIZE}"
                width="${CONFIG.INDICATOR.SIZE}"
            />`;
    }

    private buildHeader(
        mainIconDataUri: string,
        consoleIndicatorData: IndicatorData | null,
        osIndicatorData: IndicatorData | null,
        label: string,
        width: number,
        ip: string | null = null // Add IP parameter
    ): string {
        const centerX = width / 2;
        const iconY = CONFIG.HEADER_PADDING + 8;
        const labelY = iconY + CONFIG.ICON_SIZE + CONFIG.LABEL_TOP_MARGIN;
        const ipY = labelY + CONFIG.IP_TOP_MARGIN + CONFIG.LABEL_FONT_SIZE;

        const consoleIndicatorMarkup = consoleIndicatorData
            ? `<g transform="translate(${width - CONFIG.INDICATOR.MARGIN}, ${
                  CONFIG.INDICATOR.MARGIN
              })">${this.buildIndicatorShapes(consoleIndicatorData)}</g>`
            : '';

        const osIndicatorMarkup = osIndicatorData
            ? `<g transform="translate(${CONFIG.INDICATOR.MARGIN}, ${
                  CONFIG.INDICATOR.MARGIN
              })">${this.buildIndicatorShapes(osIndicatorData)}</g>`
            : '';

        // Stylish IP address markup - only if IP is present
        const ipMarkup = ip
            ? `
        <g clip-path="url(#label-clip-path)">
            <text
                x="${centerX}"
                y="${ipY}"
                font-family="${CONFIG.LABEL_FONT_FAMILY}"
                font-size="${CONFIG.LABEL_FONT_SIZE}px"
                font-weight="400"
                fill="${CONFIG.IP_COLOR}"
                text-anchor="middle"
                letter-spacing="0.025em"
                opacity="0.9"
            >
                ${this.escapeXml(ip)}
            </text>
        </g>
    `
            : '';

        return `
    <g>
        <!-- Main Icon -->
        <image href="${mainIconDataUri}" x="${
            centerX - CONFIG.ICON_SIZE / 2
        }" y="${iconY}" height="${CONFIG.ICON_SIZE}" width="${
            CONFIG.ICON_SIZE
        }"/>
    </g>
    <g clip-path="url(#label-clip-path)">
         <!-- Main Label -->
         <text x="${centerX}" y="${labelY}" font-family="${
            CONFIG.LABEL_FONT_FAMILY
        }" font-size="${
            CONFIG.LABEL_FONT_SIZE
        }px" font-weight="600" fill="#1a202c" text-anchor="middle" letter-spacing="-0.01em">
            ${this.escapeXml(label)}
        </text>
    </g>
    ${ipMarkup}
    ${osIndicatorMarkup}
    ${consoleIndicatorMarkup}
`;
    }

    private escapeXml(unsafe: string): string {
        return unsafe.replace(
            /[<>&'"]/g,
            (c) =>
                ({
                    '<': '&lt;',
                    '>': '&gt;',
                    '&': '&amp;',
                    "'": '&apos;',
                    '"': '&quot;',
                }[c] || c)
        );
    }

    private chroma = (hex: string) => ({
        darken: (factor: number) => {
            const f = parseInt(hex.slice(1), 16),
                t = factor < 0 ? 0 : 255,
                p = Math.abs(factor),
                R = f >> 16,
                G = (f >> 8) & 0x00ff,
                B = f & 0x0000ff;
            return (
                '#' +
                (
                    0x1000000 +
                    (Math.round((t - R) * p) + R) * 0x10000 +
                    (Math.round((t - G) * p) + G) * 0x100 +
                    (Math.round((t - B) * p) + B)
                )
                    .toString(16)
                    .slice(1)
            );
        },
    });
}
