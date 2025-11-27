import {
    AfterViewInit,
    Component,
    computed,
    effect,
    ElementRef,
    HostListener,
    input,
    OnDestroy,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';

export type StepperItem = {
    icon?: string;
    label: string;
};

@Component({
    selector: 'crczp-stepper',
    imports: [MatIcon, NgClass],
    templateUrl: './stepper.html',
    styleUrl: './stepper.scss',
})
export class Stepper implements OnDestroy, AfterViewInit {
    selectedIndex = input<number>(3);
    lastEnabledIndex = input<number | null>(3);
    steps = input<StepperItem[]>([
        { icon: 'security', label: 'Security Basics' },
        { icon: 'vpn_key', label: 'Authentication' },
        { icon: 'lock', label: 'Encryption 101' },
        { icon: 'shield', label: 'Network Defense' },
        { icon: 'bug_report', label: 'Threat Detection' },
        { icon: 'admin_panel_settings', label: 'Access Control' },
        { icon: 'policy', label: 'Security Policies' },
        { icon: 'fingerprint', label: 'Biometrics' },
        { icon: 'verified_user', label: 'Identity Management' },
        { icon: 'gpp_maybe', label: 'Vulnerability Assessment' },
        { icon: 'phishing', label: 'Phishing Defense' },
        { icon: 'password', label: 'Password Security' },
        { icon: 'https', label: 'SSL/TLS' },
        { icon: 'storage', label: 'Data Protection' },
        { icon: 'cloud_sync', label: 'Cloud Security' },
        { icon: 'device_hub', label: 'IoT Security' },
        { icon: 'crisis_alert', label: 'Incident Response' },
        { icon: 'token', label: 'Token Management' },
        { icon: 'encrypted', label: 'Advanced Encryption' },
        { icon: 'military_tech', label: 'Security Expert' },
    ]);

    stepClicked = output<number>();
    maxAccessibleIndex = computed(() => {
        const lastAccessible = this.lastEnabledIndex();
        return lastAccessible !== null
            ? lastAccessible
            : this.steps().length - 1;
    });
    protected isOverflowing = signal<boolean>(false);
    private containerEl =
        viewChild<ElementRef<HTMLElement>>('stepperContainer');
    private resizeObserver?: ResizeObserver;

    constructor() {
        effect(() => {
            const selectedIdx = this.selectedIndex();
            setTimeout(() => this.scrollSelectedIntoView(selectedIdx), 0);
        });
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        const container = this.containerEl()?.nativeElement;
        if (container) {
            this.isOverflowing.set(
                container.scrollWidth > container.clientWidth,
            );
        }
    }

    ngAfterViewInit() {
        this.onWindowResize();
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
    }

    onStepClick(index: number): void {
        if (index <= this.maxAccessibleIndex()) {
            this.stepClicked.emit(index);
        }
    }

    isAccessible(index: number): boolean {
        return index <= this.maxAccessibleIndex();
    }

    isSelected(index: number): boolean {
        return index === this.selectedIndex() && this.isAccessible(index);
    }

    private scrollSelectedIntoView(selectedIdx: number): void {
        const container = this.containerEl()?.nativeElement;

        if (!container) {
            return;
        }

        const nodeWidth = 120;
        const nodeImageWidth = 80;
        const scrollPadding = 200;

        const nodeLeft = selectedIdx * nodeWidth;
        const nodeRight = nodeLeft + nodeImageWidth;

        const scrollLeft = container.scrollLeft;
        const scrollRight = scrollLeft + container.clientWidth;

        // Cancel if already fully visible
        if (nodeLeft >= scrollLeft && nodeRight <= scrollRight) {
            return;
        }

        const targetScroll =
            nodeLeft < scrollLeft
                ? nodeLeft - scrollPadding
                : nodeRight + scrollPadding - container.clientWidth;

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth',
        });
    }
}
