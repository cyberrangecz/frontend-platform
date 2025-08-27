import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, skipWhile } from 'rxjs';
import { withCache } from '@ngneat/cashew';
import { LoadingTracker } from '@crczp/utils';
import { TOPOLOGY_CONFIG } from '../topology-graph-config';

const CONFIG = TOPOLOGY_CONFIG.SVG;

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

    public get INTERNET_SVG(): string {
        const internetIconUri = this.getPreloadedIcon('INTERNET');

        const radius = 128;

        const svgSize = radius * 2;
        const centerX = svgSize / 2;
        const centerY = svgSize / 2;

        const svgContent = `
            <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">

                    <defs>
                       <radialGradient id="internet-border"
                    cx="50  %" cy="50%" r="50%"
                    gradientUnits="objectBoundingBox"
                    gradientTransform="scale(0.98)">
                    <stop offset="69%"  stop-color="#ffffff" stop-opacity="0.99"/>
                    <stop offset="70%"  stop-color="${
                        CONFIG.COLORS.PRIMARY.BORDER
                    }" stop-opacity="0.9"/>
                    <stop offset="74%" stop-color="${
                        CONFIG.COLORS.PRIMARY.BORDER
                    }" stop-opacity="0.4"/>
                    <stop offset="80%" stop-color="${
                        CONFIG.COLORS.PRIMARY.BORDER
                    }" stop-opacity="0"/>
                </radialGradient>

                <!-- Gentle backdrop gradient for text -->
                <radialGradient id="text-backdrop"
                    cx="50%" cy="50%" r="60%"
                    gradientUnits="objectBoundingBox">
                    <stop offset="70%"  stop-color="#ffffff" stop-opacity="0.4"/>
                    <stop offset="80%" stop-color="#ffffff" stop-opacity="0.1"/>
                    <stop offset="95%" stop-color="#ffffff" stop-opacity="0"/>
                </radialGradient>

                <!-- Filter for subtle shadow -->
                <filter id="gentle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.1"/>
                </filter>
                    </defs>

                <circle
                    cx="${centerX}"
                    cy="${centerY}"
                    r="${radius}"
                    fill="url(#internet-border)"
                />

                <image href="${internetIconUri}"
                   x="${centerX - CONFIG.ICON_SIZE.INTERNET / 2 - 2.5}"
                   y="${centerY - CONFIG.ICON_SIZE.INTERNET / 2 - 2.5}"
                   width="${CONFIG.ICON_SIZE.INTERNET}"
                   height="${CONFIG.ICON_SIZE.INTERNET}"
                   opacity="0.3"
                   />

            <rect
                x="${centerX - 75}"
                y="${centerY - 25}"
                width="150"
                height="50"
                rx="16"
                ry="20"
                fill="url(#text-backdrop)"
                filter="url(#gentle-shadow)"
            />

            <g clip-path="url(#label-clip-path)">
                <text x="${centerX}" y="${centerY + 10}"
                      font-family="${CONFIG.FONT.FAMILY}"
                      font-size="34px"
                      font-weight="800"
                      fill="${CONFIG.COLORS.PRIMARY.TEXT}"
                      text-anchor="middle"
                      text-rendering="optimizeSpeed"
                      >
                    Internet
                </text>
            </g>
            </svg>`.trim();

        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
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

    public generateSubnetSvg(name: string, cidr: string, idx: number): string {
        // Font configurations - name is bold, cidr is regular but 2 sizes larger
        const nameFont = `700 ${CONFIG.FONT.SIZE}px ${CONFIG.FONT.FAMILY}`;
        const cidrFont = `500 ${CONFIG.FONT.SIZE}px ${CONFIG.FONT.FAMILY}`;

        // Measure text dimensions
        const nameWidth = this.measureTextWidth(name, nameFont);
        const cidrWidth = this.measureTextWidth(cidr, cidrFont) + 10;

        // Calculate required dimensions
        const maxTextWidth = Math.max(nameWidth, cidrWidth);
        const totalTextHeight = CONFIG.FONT.SIZE * 2 + 16; // 16px gap between texts

        // Calculate circle radius with padding (ensure circle is big enough for content)
        const horizontalRadius = maxTextWidth / 2 + 24; // 24px horizontal padding
        const verticalRadius = totalTextHeight / 2 + 20; // 20px vertical padding
        const radius = Math.max(
            horizontalRadius,
            verticalRadius,
            CONFIG.SUBNET.MIN_RADIUS
        );

        // SVG dimensions with small border margin
        const svgSize = radius * 2 + 4;
        const centerX = svgSize / 2;
        const centerY = svgSize / 2;

        // Text positions - name above center, cidr below center
        const nameY = centerY - 8;
        const cidrY = centerY + CONFIG.CARD.PADDING.LABEL_ROW * 2;

        const brightness = Math.random() * 200;

        const fill = `rgba(${40 + brightness}, ${140 + brightness},${
            230 + brightness
        }, 0.95)`;

        const svgContent = `
                <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">

                        <defs>
                          ${this.buildSubnetBorderDefinition(idx)}
                        </defs>\`;

                    <circle
                        cx="${centerX}"
                        cy="${centerY}"
                        r="${radius}"
                        fill="url(#subnet-border${idx})"
                    />
                    <text
                        x="${centerX}"
                        y="${nameY}"
                        font-family="${CONFIG.FONT.FAMILY}"
                        font-size="${CONFIG.FONT.SIZE}px"
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
                        font-family="${CONFIG.FONT.FAMILY}"
                        font-size="${CONFIG.FONT.SIZE}px"
                        font-weight="500"
                        fill="${CONFIG.FONT.SECONDARY_COLOR}"
                        text-anchor="middle"
                        letter-spacing="0.025em"
                    >
                        ${this.escapeXml(cidr)}
                    </text>
                </svg>`.trim();

        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    }

    private readonly utf8ToBase64 = (str: string): string =>
        btoa(unescape(encodeURIComponent(str)));

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
        this.textMeasureContext.imageSmoothingEnabled = false;
        this.textMeasureContext.textRendering = 'optimizeSpeed';
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
        const labelFont = `600 ${CONFIG.FONT.SIZE}px ${CONFIG.FONT.FAMILY}`;
        const mainCardContentWidth =
            this.measureTextWidth(label, labelFont) +
            CONFIG.CARD.PADDING.LABEL_SIDE * 2;

        // --- Step 2: Determine final SVG width, clamping it within bounds ---
        const dynamicWidth = Math.max(
            CONFIG.CARD.MIN_WIDTH,
            Math.min(mainCardContentWidth, CONFIG.CARD.MAX_WIDTH)
        );

        // --- Step 3: Calculate Heights (now includes IP if present) ---
        const baseHeight =
            CONFIG.CARD.PADDING.HEADER +
            CONFIG.ICON_SIZE.MAIN +
            CONFIG.CARD.PADDING.LABEL_TOP +
            CONFIG.FONT.SIZE +
            CONFIG.CARD.PADDING.BOTTOM;

        const ipHeight = ip
            ? CONFIG.CARD.PADDING.LABEL_ROW +
              CONFIG.FONT.SIZE +
              CONFIG.CARD.PADDING.BOTTOM
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

    private buildSubnetBorderDefinition(idx: number): string {
        const colour = CONFIG.SUBNET.COLORS[idx % CONFIG.SUBNET.COLORS.length];

        return `
    <radialGradient id="subnet-border${idx}"
                    cx="50%" cy="50%" r="50%"
                    gradientUnits="objectBoundingBox"
                    gradientTransform="scale(0.98)">
      <stop offset="80%"   stop-color="#ffffff" stop-opacity="0.99"/>
      <stop offset="82%" stop-color="${colour}"  stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>`;
    }

    private buildSvgDefinitions(width: number): string {
        const iconY = CONFIG.CARD.PADDING.HEADER + 8;
        const labelBaselineY =
            iconY + CONFIG.ICON_SIZE.MAIN + CONFIG.CARD.PADDING.LABEL_TOP;
        const clipRectY = labelBaselineY - CONFIG.FONT.SIZE;
        const clipRectHeight =
            CONFIG.FONT.SIZE * 4 + CONFIG.CARD.PADDING.LABEL_ROW;
        const textClipPathX = CONFIG.CARD.PADDING.LABEL_SIDE / 2;
        const textClipPathWidth = width - CONFIG.CARD.PADDING.LABEL_SIDE;

        return `
         <defs>
            <clipPath id="label-clip-path">
                <rect x="${textClipPathX}" y="${clipRectY}" width="${textClipPathWidth}" height="${clipRectHeight}" />
            </clipPath>

            <linearGradient id="main-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" style="stop-color:#ffffff;"/>
                 <stop offset="100%" style="stop-color:#f8fafb;"/>
            </linearGradient>

            <linearGradient id="footer-glow-gradient" x1="0%" x2="100%">
                <stop offset="0%" stop-color="${
                    CONFIG.COLORS.PRIMARY.MAIN
                }" stop-opacity="0"/>
                <stop offset="50%" stop-color="${
                    CONFIG.COLORS.PRIMARY.MAIN
                }" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="${
                    CONFIG.COLORS.PRIMARY.MAIN
                }" stop-opacity="0"/>
            </linearGradient>

            <linearGradient id="indicator-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${CONFIG.COLORS.PRIMARY.MAIN}" />
                <stop offset="100%" stop-color="${this.chroma(
                    CONFIG.COLORS.PRIMARY.MAIN
                ).darken(0.5)}" />
            </linearGradient>

            <linearGradient id="indicator-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${
                    CONFIG.COLORS.SECONDARY.MAIN
                }" />
                <stop offset="100%" stop-color="${this.chroma(
                    CONFIG.COLORS.SECONDARY.MAIN
                ).darken(0.5)}" />
            </linearGradient>
         </defs>`;
    }

    private buildMainCard(height: number, width: number): string {
        return `<rect x="1" y="1" width="${width - 2}" height="${
            height - 2
        }" rx="${CONFIG.CARD.RADIUS}" ry="${
            CONFIG.CARD.RADIUS
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
        const iconY = CONFIG.CARD.PADDING.HEADER + 8;
        const labelY =
            iconY + CONFIG.ICON_SIZE.MAIN + CONFIG.CARD.PADDING.LABEL_TOP;
        const ipY = labelY + CONFIG.CARD.PADDING.LABEL_ROW + CONFIG.FONT.SIZE;

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
            ? `<g clip-path="url(#label-clip-path)">
                    <text
                        x="${centerX}"
                        y="${ipY}"
                        font-family="${CONFIG.FONT.FAMILY}"
                        font-size="${CONFIG.FONT.SIZE}px"
                        font-weight="500"
                        fill="${CONFIG.FONT.SECONDARY_COLOR}"
                        text-anchor="middle"
                        letter-spacing="0.025em"
                        text-rendering="optimizeSpeed"
                    >
                        ${this.escapeXml(ip)}
                    </text>
                </g>`
            : '';

        return `<g>
            <!-- Main Icon -->
            <image href="${mainIconDataUri}" x="${
            centerX - CONFIG.ICON_SIZE.MAIN / 2
        }" y="${iconY}" height="${CONFIG.ICON_SIZE.MAIN}" width="${
            CONFIG.ICON_SIZE.MAIN
        }"/>
        </g>
        <g clip-path="url(#label-clip-path)">
            <!-- Main Label -->
            <text x="${centerX}" y="${labelY}" font-family="${
            CONFIG.FONT.FAMILY
        }" font-size="${
            CONFIG.FONT.SIZE
        }px" font-weight="600" fill="#1a202c" text-anchor="middle" letter-spacing="-0.01em" text-rendering="optimizeSpeed">
            ${this.escapeXml(label)}
            </text>
        </g>
        ${ipMarkup}
        ${osIndicatorMarkup}
        ${consoleIndicatorMarkup}`;
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
