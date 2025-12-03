import {
    AfterViewInit,
    Component,
    ElementRef,
    inject,
    input,
    OnDestroy,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OAuthService } from 'angular-oauth2-oidc';
import { GuacamoleStatus } from './status/guacamole-status';
import {
    GuacamoleClientState,
    GuacamoleTunnelState,
    mapGuacamoleClientState,
    mapGuacamoleTunnelState,
} from './status/guacamoleStatusMapper';
import Guacamole from '@dushixiang/guacamole-common-js';
import { GuacamoleKeyCodes } from './keycodes';
import { PortalConfig } from '@crczp/utils';

export type ConnectionParams = {
    sandboxUuid: string;
    nodeName: string;
    withGui: boolean;
};

@Component({
    selector: 'crczp-console-view',
    imports: [CommonModule, GuacamoleStatus],
    templateUrl: './console-view.component.html',
    styleUrl: './console-view.component.scss',
})
export class ConsoleView implements AfterViewInit, OnDestroy {
    @ViewChild('guacContainer', { static: true })
    guacContainer!: ElementRef;

    @ViewChild('guacWrapper', { static: true })
    guacWrapper!: ElementRef;
    connectionParams = input.required<ConnectionParams>();
    tunnelStateCode = signal<GuacamoleTunnelState>('INVALID');
    clientStateCode = signal<GuacamoleClientState>('INVALID');
    protected readonly keyboardLocked = signal(false);
    private readonly PADDING_NO_GUI = 12;
    private readonly authService = inject(OAuthService);
    private guacClient: Guacamole.Client | null = null;
    private guacMouse: Guacamole.Mouse | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private listeners: (() => void)[] = [];
    private clipboardInterval: number | null = null;
    private lastClipboardContent = '';
    private resizeTimeout: number | null = null;
    private RESIZE_DEBOUNCE_MS = 50;
    private INITIAL_RESOLUTION_COEFFICIENT = 1;
    private currentScale = signal<number>(1);
    private readonly platformConfig = inject(PortalConfig);
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

    ngAfterViewInit(): void {
        this.connectGuacamole();
        this.setupResizeObserver();
        this.setupClipboardSync();
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.clipboardInterval) {
            clearInterval(this.clipboardInterval);
            this.clipboardInterval = null;
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        if (this.guacClient) {
            console.log('Disconnecting Guacamole client...');
            this.guacClient.disconnect();
            this.guacClient = null;
        }

        for (const remove of this.listeners) remove();
        this.listeners = [];
    }

    getCursorStyle(): CSSStyleDeclaration['cursor'] {
        switch (this.clientStateCode()) {
            case 'CONNECTED':
                return undefined;
            case 'CONNECTING':
                return 'wait';
            case 'DISCONNECTED':
            case 'DISCONNECTING':
            case 'INVALID':
                return 'not-allowed';
            case 'WAITING':
                return 'progress';
            default:
                return undefined;
        }
    }

    buildWrapperStyle() {
        return {
            ...(this.getCursorStyle() !== undefined
                ? { cursor: this.getCursorStyle() }
                : {}),
            ...(!this.connectionParams().withGui
                ? {
                      padding: '0.75rem 0 0.75rem 0.75rem',
                  }
                : {}),
        };
    }

    protected lockKeyboard() {
        if (this.keyboardLocked()) return;
        this.keyboardLocked.set(true);

        if (this.keydownHandler && this.keyupHandler) {
            document.addEventListener('keydown', this.keydownHandler, {
                passive: false,
            });
            document.addEventListener('keyup', this.keyupHandler, {
                passive: false,
            });
        }
    }

    protected unlockKeyboard() {
        if (!this.keyboardLocked()) return;
        this.keyboardLocked.set(false);

        if (this.keydownHandler && this.keyupHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            document.removeEventListener('keyup', this.keyupHandler);
        }
    }

    private get_keysym(
        keysyms: number[] | null,
        location: number,
    ): number | null {
        if (!keysyms) return null;
        return keysyms[location] || keysyms[0];
    }

    private keysym_from_keycode(
        keyCode: number,
        location: number,
    ): number | null {
        return this.get_keysym(
            GuacamoleKeyCodes.keycodeKeysyms[keyCode],
            location,
        );
    }

    private keysym_from_key_identifier(
        identifier: string,
        location: number,
    ): number | null {
        if (!identifier) return null;
        if (identifier.length === 1) {
            return identifier.charCodeAt(0);
        }
        return this.get_keysym(
            GuacamoleKeyCodes.keyidentifier_keysym[identifier],
            location,
        );
    }

    private setupClipboardSync(): void {
        // Poll browser clipboard every 500ms to detect changes
        this.clipboardInterval = window.setInterval(async () => {
            if (!this.guacClient || this.clientStateCode() !== 'CONNECTED') {
                return;
            }

            try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText !== this.lastClipboardContent) {
                    this.lastClipboardContent = clipboardText;
                    this.sendClipboardToRemote(clipboardText);
                }
            } catch (_error) {
                // Clipboard access denied or not available - this is normal
                // when the tab is not focused
            }
        }, 500);
    }

    private sendClipboardToRemote(text: string): void {
        if (!this.guacClient) return;

        const stream = this.guacClient.createClipboardStream('text/plain');
        const writer = new Guacamole.StringWriter(stream);
        writer.sendText(text);
        writer.sendEnd();
    }

    private setupClipboardReceiver(): void {
        if (!this.guacClient) return;

        this.guacClient.onclipboard = (
            stream: Guacamole.InputStream,
            mimetype: string,
        ) => {
            if (mimetype !== 'text/plain') {
                return;
            }

            let clipboardContent = '';
            const reader = new Guacamole.StringReader(stream);

            reader.ontext = (text: string) => {
                clipboardContent += text;
            };

            reader.onend = async () => {
                try {
                    await navigator.clipboard.writeText(clipboardContent);
                    this.lastClipboardContent = clipboardContent;
                } catch (error) {
                    console.error('Failed to write to clipboard:', error);
                }
            };
        };
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = window.setTimeout(() => {
                this.handleResize();
            }, this.RESIZE_DEBOUNCE_MS);
        });

        this.resizeObserver.observe(this.guacWrapper.nativeElement);
    }

    private handleResize(): void {
        if (!this.guacClient) return;

        const container: HTMLDivElement = this.guacWrapper.nativeElement;
        const width = container.offsetWidth - this.PADDING_NO_GUI * 2;
        const height = container.offsetHeight - this.PADDING_NO_GUI;

        if (width > 0 && height > 0) {
            this.guacClient.sendSize(width, height);

            const display = this.guacClient.getDisplay();
            if (display) {
                const displayWidth = display.getWidth();
                const displayHeight = display.getHeight();

                if (displayWidth > 0 && displayHeight > 0) {
                    const scaleX = width / displayWidth;
                    const scaleY = height / displayHeight;

                    this.currentScale.set(Math.min(scaleX, scaleY));
                    display.scale(this.currentScale());
                }
            }
        }
    }

    private connectGuacamole() {
        const wssPath = this.platformConfig.basePaths.guacamole.startsWith(
            'https://',
        )
            ? this.platformConfig.basePaths.guacamole.replace(
                  'https://',
                  'wss://',
              )
            : this.platformConfig.basePaths.guacamole.startsWith('http://')
              ? this.platformConfig.basePaths.guacamole.replace(
                    'http://',
                    'ws://',
                )
              : this.platformConfig.basePaths.guacamole;

        if (!wssPath.startsWith('ws://') && !wssPath.startsWith('wss://')) {
            console.error(
                'Failed to derive WebSocket path from Guacamole base path:',
                this.platformConfig.basePaths.guacamole,
            );
            return;
        }

        const tunnel = new Guacamole.WebSocketTunnel(
            `${this.platformConfig.basePaths.guacamole.replace('https://', 'wss://')}/websocket/guacamole`,
        );

        tunnel.onerror = (error) => {
            console.error('Tunnel error:', error);
        };

        tunnel.onstatechange = (state: number) =>
            this.tunnelStateCode.set(mapGuacamoleTunnelState(state));

        this.guacClient = new Guacamole.Client(tunnel);

        this.setupClipboardReceiver();

        this.keydownHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            const keysym =
                this.keysym_from_key_identifier(e.key, e.location) ||
                this.keysym_from_keycode(e.keyCode, e.location);
            if (keysym !== null) {
                this.guacClient?.sendKeyEvent(1, keysym);
            }
        };
        this.keyupHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            const keysym =
                this.keysym_from_key_identifier(e.key, e.location) ||
                this.keysym_from_keycode(e.keyCode, e.location);
            if (keysym !== null) {
                this.guacClient?.sendKeyEvent(0, keysym);
            }
        };

        this.listeners.push(() => {
            if (this.keydownHandler) {
                document.removeEventListener('keydown', this.keydownHandler);
            }
        });
        this.listeners.push(() => {
            if (this.keyupHandler) {
                document.removeEventListener('keyup', this.keyupHandler);
            }
        });

        this.guacMouse = new Guacamole.Mouse(this.guacContainer.nativeElement);

        this.guacMouse.onEach(
            ['mousedown', 'mousemove', 'mouseup'],
            (e: { state: Guacamole.Mouse.State }) => {
                if (this.guacClient && this.currentScale() !== 1) {
                    // Correct for double scaling by dividing by the scale factor
                    const correctedState = {
                        ...e.state,
                        x: e.state.x / this.currentScale(),
                        y: e.state.y / this.currentScale(),
                    };
                    this.guacClient.sendMouseState(correctedState);
                } else {
                    this.guacClient?.sendMouseState(e.state);
                }
            },
        );

        this.guacClient.onstatechange = (state: number) => {
            this.clientStateCode.set(mapGuacamoleClientState(state));
            if (this.clientStateCode() === 'CONNECTED') {
                console.log(
                    'Guacamole client connected, setting up display...',
                );

                const display = this.guacClient?.getDisplay();
                if (display) {
                    display.onresize = (_width: number, _height: number) => {
                        this.handleResize();
                    };

                    display.showCursor(true);
                }

                this.handleResize();

                this.guacWrapper.nativeElement.focus();
            }
        };

        this.guacClient.onerror = (error) => {
            console.error('Guacamole client error:', error);
        };

        const display = this.guacClient.getDisplay();
        const displayElement = display.getElement();

        displayElement.style.display = 'block';
        displayElement.style.margin = '0';
        displayElement.style.padding = '0';
        displayElement.style.width = '100%';
        displayElement.style.height = '100%';
        displayElement.style.objectFit = 'contain';

        this.guacContainer.nativeElement.appendChild(displayElement);
        this.guacClient.connect(this.buildConnectionParams());
    }

    private buildConnectionParams(): string {
        let params = '';

        const appendParam = (key: string, value: string) => {
            params += `${encodeURIComponent(key)}=${encodeURIComponent(
                value,
            )}&`;
        };

        if (this.connectionParams().withGui) {
            const wrapperWidth =
                this.guacWrapper.nativeElement.offsetWidth || 0;
            const wrapperHeight =
                this.guacWrapper.nativeElement.offsetHeight || 0;
            const browserWidth = window.innerWidth;

            const avgWidth = Math.round((wrapperWidth + browserWidth) / 2);

            const initialWidth = Math.round(
                avgWidth * this.INITIAL_RESOLUTION_COEFFICIENT,
            );
            const initialHeight = Math.round(
                wrapperHeight * this.INITIAL_RESOLUTION_COEFFICIENT,
            );
            appendParam('width', String(initialWidth));
            appendParam('height', String(initialHeight));
        }

        appendParam('authToken', this.authService.getAccessToken() || '');
        appendParam('sandboxUuid', this.connectionParams().sandboxUuid);
        appendParam('nodeName', this.connectionParams().nodeName);
        appendParam(
            'withGui',
            this.connectionParams().withGui ? 'true' : 'false',
        );

        return params;
    }
}
