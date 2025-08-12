import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, skipWhile, take } from 'rxjs';
import { withCache } from '@ngneat/cashew';
import { LoadingTracker } from '@crczp/utils';
import { OsType } from '../topology-vis-types';
import { TOPOLOGY_CONFIG } from '../topology-config';

const CONFIG = TOPOLOGY_CONFIG.NODE_VISUALIZATION;

function getIconSize(key: keyof typeof CONFIG.ICON_PATHS) {
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

@Injectable()
export class TopologyNodeSvgService {
    private readonly http = inject(HttpClient);
    private readonly domParser = new DOMParser();
    private textMeasureContext?: CanvasRenderingContext2D;

    private preloadedIconUris: Map<string, string> = new Map();
    private loadingTracker = new LoadingTracker();

    private internetSvg = new BehaviorSubject<string | null>(null);

    constructor() {
        Object.keys(CONFIG.ICON_PATHS)
            .concat()
            .forEach((key: string) =>
                this.loadingTracker
                    .trackRequest(() =>
                        this.http.get(CONFIG.ICON_PATHS[key], {
                            responseType: 'text',
                            context: withCache({
                                storage: 'localStorage',
                                ttl: 7.2e6,
                            }),
                        })
                    )
                    .subscribe((res) => {
                        this.preloadedIconUris.set(
                            key,
                            `data:image/svg+xml;base64,${btoa(
                                this.processIcon(
                                    res,
                                    getIconSize(
                                        key as keyof typeof CONFIG.ICON_PATHS
                                    )
                                )
                            )}`
                        );
                        if (key === 'INTERNET') {
                            this.internetSvg.next(
                                `data:image/svg+xml;base64,${btoa(
                                    this.buildSvg(
                                        'Internet',
                                        this.getPreloadedIcon('INTERNET'),
                                        null,
                                        null,
                                        null
                                    )
                                )}`
                            );
                        }
                    })
            );
    }

    public get internetUri$() {
        return this.internetSvg.pipe(
            skipWhile((uri) => uri === null),
            map((uri) => uri as string),
            take(1)
        );
    }

    public generateRouterSvg(
        label: string,
        osType: OsType,
        guiAccess: boolean
    ): Observable<string> {
        return this.generateNodeSvg(
            label,
            'ROUTER',
            osType,
            null,
            guiAccess
        ).pipe(take(1));
    }

    public generateHostSvg(
        label: string,
        osType: OsType,
        ip: string,
        guiAccess: boolean
    ): Observable<string> {
        return this.generateNodeSvg(label, 'HOST', osType, ip, guiAccess).pipe(
            take(1)
        );
    }

    public generateSubnetSvg(
        label: string,
        cidr: string,
        color: string,
        children: number
    ): Observable<{ collapsed: string; expanded: string }> {
        return this.loadingTracker.isLoading$.pipe(
            skipWhile((loading) => loading),
            map(() => {
                const collapsedSvg = this.buildSubnetSvg(
                    label,
                    cidr,
                    color,
                    children,
                    true
                );
                const expandedSvg = this.buildSubnetSvg(
                    label,
                    cidr,
                    color,
                    children,
                    false
                );

                return {
                    collapsed: `data:image/svg+xml;base64,${btoa(
                        collapsedSvg
                    )}`,
                    expanded: `data:image/svg+xml;base64,${btoa(expandedSvg)}`,
                };
            }),
            take(1)
        );
    }

    private generateNodeSvg(
        label: string,
        deviceType: 'ROUTER' | 'HOST',
        osType: 'LINUX' | 'WINDOWS',
        ip: string | null,
        guiAccess: boolean
    ): Observable<string> {
        return this.loadingTracker.isLoading$.pipe(
            skipWhile((loading) => loading),
            map(() => {
                const svgString = this.buildSvg(
                    label,
                    this.getPreloadedIcon(deviceType),
                    guiAccess
                        ? {
                              uri: this.getPreloadedIcon('CONSOLE'),
                              fillColor:
                                  TOPOLOGY_CONFIG.NODE_VISUALIZATION.INDICATOR
                                      .BACKDROP_FILL.CONSOLE,
                              strokeColor:
                                  CONFIG.INDICATOR.BACKDROP_STROKE.CONSOLE,
                          }
                        : null,
                    {
                        uri: this.getPreloadedIcon(osType),
                        fillColor: CONFIG.INDICATOR.BACKDROP_FILL[osType],
                        strokeColor: CONFIG.INDICATOR.BACKDROP_STROKE[osType],
                    },
                    ip
                );
                return `data:image/svg+xml;base64,${btoa(svgString)}`;
            })
        );
    }

    private getPreloadedIcon(key: keyof typeof CONFIG.ICON_PATHS): string {
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

    private buildSubnetSvg(
        label: string,
        cidr: string,
        color: string,
        children: number,
        isCollapsed: boolean
    ): string {
        const labelFont = `700 ${CONFIG.LABEL_FONT_SIZE}px ${CONFIG.LABEL_FONT_FAMILY}`;
        const cidrFont = `400 ${CONFIG.LABEL_FONT_SIZE - 2}px ${
            CONFIG.LABEL_FONT_FAMILY
        }`;

        const labelWidth = this.measureTextWidth(label, labelFont);
        const cidrWidth = this.measureTextWidth(cidr, cidrFont);
        const maxTextWidth = Math.max(labelWidth, cidrWidth);

        const padding = 24;
        const baseTextHeight = CONFIG.LABEL_FONT_SIZE * 2.2;
        const additionalHeight = isCollapsed ? CONFIG.LABEL_FONT_SIZE + 8 : 0;
        const textHeight = baseTextHeight + additionalHeight;

        const radius = Math.max(
            65,
            Math.max(maxTextWidth / 2 + padding, textHeight / 2 + padding)
        );

        const svgSize = radius * 2 + 12;
        const centerX = svgSize / 2;
        const centerY = svgSize / 2;

        let textContent: string;
        if (isCollapsed) {
            const labelY = centerY - CONFIG.LABEL_FONT_SIZE / 2 - 2;
            const cidrY = centerY + CONFIG.LABEL_FONT_SIZE / 3;
            const childrenY = centerY + CONFIG.LABEL_FONT_SIZE + 6;
            const childrenText = `${children} host${children !== 1 ? 's' : ''}`;

            textContent = `
            <text x="${centerX}" y="${labelY}" font-family="${
                CONFIG.LABEL_FONT_FAMILY
            }"
                  font-size="${CONFIG.LABEL_FONT_SIZE}px" font-weight="700"
                  fill="#1a202c" text-anchor="middle" letter-spacing="-0.01em">
                  ${this.escapeXml(label)}
            </text>
            <text x="${centerX}" y="${cidrY}" font-family="${
                CONFIG.LABEL_FONT_FAMILY
            }"
                  font-size="${CONFIG.LABEL_FONT_SIZE - 2}px" font-weight="400"
                  fill="#4a5568" text-anchor="middle">
                  ${this.escapeXml(cidr)}
            </text>
            <text x="${centerX}" y="${childrenY}" font-family="${
                CONFIG.LABEL_FONT_FAMILY
            }"
                  font-size="${CONFIG.LABEL_FONT_SIZE - 1}px" font-weight="600"
                  fill="#2d3748" text-anchor="middle">
                  ${this.escapeXml(childrenText)}
            </text>
        `;
        } else {
            const labelY = centerY - CONFIG.LABEL_FONT_SIZE / 6;
            const cidrY = centerY + CONFIG.LABEL_FONT_SIZE - 2;

            textContent = `
            <text x="${centerX}" y="${labelY}" font-family="${
                CONFIG.LABEL_FONT_FAMILY
            }"
                  font-size="${CONFIG.LABEL_FONT_SIZE}px" font-weight="700"
                  fill="#1a202c" text-anchor="middle" letter-spacing="-0.01em">
                  ${this.escapeXml(label)}
            </text>
            <text x="${centerX}" y="${cidrY}" font-family="${
                CONFIG.LABEL_FONT_FAMILY
            }"
                  font-size="${CONFIG.LABEL_FONT_SIZE - 2}px" font-weight="400"
                  fill="#4a5568" text-anchor="middle">
                  ${this.escapeXml(cidr)}
            </text>
        `;
        }

        return `
        <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${centerX}" cy="${centerY}" r="${radius}"
                    stroke="${color}"
                    stroke-width="2.5"/>
            ${textContent}
        </svg>
    `;
    }

    private buildSvg(
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

        // --- Step 3: Calculate Heights ---

        const totalHeight =
            CONFIG.HEADER_PADDING +
            CONFIG.ICON_SIZE +
            CONFIG.LABEL_TOP_MARGIN +
            CONFIG.LABEL_FONT_SIZE +
            CONFIG.MAIN_CARD_BOTTOM_PADDING;

        // --- Step 4: Build SVG Parts ---
        const definitions = this.buildSvgDefinitions(dynamicWidth);
        const mainCard = this.buildMainCard(totalHeight, dynamicWidth);
        // Pass the new console icon URI to buildHeader
        const header = this.buildHeader(
            mainIconDataUri,
            consoleIndicatorData,
            osIndicatorData,
            label,
            dynamicWidth
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
        const clipRectHeight = CONFIG.LABEL_FONT_SIZE * 2;
        const textClipPathX = CONFIG.LABEL_SIDE_PADDING / 2;
        const textClipPathWidth = width - CONFIG.LABEL_SIDE_PADDING;

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
        width: number
    ): string {
        const centerX = width / 2;
        const iconY = CONFIG.HEADER_PADDING + 8;
        const labelY = iconY + CONFIG.ICON_SIZE + CONFIG.LABEL_TOP_MARGIN;

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
