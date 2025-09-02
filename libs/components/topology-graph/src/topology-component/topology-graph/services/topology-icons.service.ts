import { inject, Injectable } from '@angular/core';
import { withCache } from '@ngneat/cashew';
import { LoadingTracker } from '@crczp/utils';
import { HttpClient } from '@angular/common/http';

export type TopologyIcon = keyof typeof TopologyIconsService.ICONS;

@Injectable()
export class TopologyIconsService {
    public static readonly ICONS = {
        LINUX: '/assets/topology/skill-icons--linux-light.svg',
        WINDOWS: '/assets/topology/skill-icons--windows-light.svg',
        LINUX_NO_BG: '/assets/topology/skill-icons--linux-light--no-bg.svg',
        WINDOWS_NO_BG: '/assets/topology/skill-icons--windows-light--no-bg.svg',
        CONSOLE: '/assets/topology/console.svg',
        ROUTER: '/assets/topology/router.svg',
        HOST: '/assets/topology/host.svg',
        INTERNET: '/assets/topology/internet.svg',
    };
    private readonly http = inject(HttpClient);
    private readonly domParser = new DOMParser();
    private preloadedIconUris: Map<string, string> = new Map();
    private loadingTracker = new LoadingTracker();

    constructor() {
        Object.keys(TopologyIconsService.ICONS)
            .concat()
            .forEach((key: string) =>
                this.loadingTracker
                    .trackRequest(() =>
                        this.http.get(TopologyIconsService.ICONS[key], {
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
                                this.processIcon(res, 64)
                            )}`
                        )
                    )
            );
    }

    get isLoading$() {
        return this.loadingTracker.isLoading$;
    }

    public getPreloadedIcon(key: TopologyIcon): string {
        return this.preloadedIconUris.get(key);
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
}
