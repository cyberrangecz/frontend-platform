import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MediaSizeLimits } from './media-size-limits';
import { MediaSizeControlComponent } from './media-size-control.component';

const LIMITS: MediaSizeLimits = { minimum: 352, maximum: 2000 };

@Component({
    imports: [MediaSizeControlComponent],
    template: `
        <crczp-media-size-control
            [width]="width()"
            [limits]="limits()"
            [resizing]="resizing()"
            (widthTyped)="typed.push($event)"
        >
            <span class="test-grip" tabindex="0"></span>
        </crczp-media-size-control>
        <button class="test-outside" type="button"></button>
    `,
})
class SizeControlHostComponent {
    readonly width = signal<number | null>(480);
    readonly limits = signal<MediaSizeLimits | null>(LIMITS);
    readonly resizing = signal(false);
    readonly typed: (number | undefined)[] = [];
}

describe('MediaSizeControlComponent', () => {
    let fixture: ComponentFixture<SizeControlHostComponent>;
    let element: HTMLElement;

    const control = (): HTMLElement => element.querySelector('crczp-media-size-control') as HTMLElement;
    const readout = (): HTMLElement | null => element.querySelector('.size-readout');
    const readoutButton = (): HTMLButtonElement | null => element.querySelector('button.size-readout-content');
    const field = (): HTMLInputElement | null => element.querySelector('input.size-readout-number');

    function openField(): HTMLInputElement {
        readoutButton()?.click();
        fixture.detectChanges();
        return field() as HTMLInputElement;
    }

    function type(input: HTMLInputElement, value: string): void {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    function press(input: HTMLInputElement, key: string): KeyboardEvent {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        input.dispatchEvent(event);
        fixture.detectChanges();
        return event;
    }

    beforeEach(() => {
        fixture = TestBed.createComponent(SizeControlHostComponent);
        element = fixture.nativeElement;
        fixture.detectChanges();
    });

    describe('readout', () => {
        it('shows the width in px beside the projected handle', () => {
            expect(element.querySelector('.test-grip')).not.toBeNull();
            expect(readout()?.textContent?.replace(/\s+/g, '')).toBe('480px');
        });

        it('follows the width it is given, as during a drag', () => {
            fixture.componentInstance.width.set(612);
            fixture.detectChanges();

            expect(readoutButton()?.textContent).toContain('612');
        });

        it('names the width and the action for assistive technology', () => {
            expect(readoutButton()?.getAttribute('aria-label')).toBe('Edit width, 480 px');
        });

        it('is left out while the width is unknown', () => {
            fixture.componentInstance.width.set(null);
            fixture.detectChanges();

            expect(readout()).toBeNull();
        });

        it('is left out while the limits are unknown', () => {
            fixture.componentInstance.limits.set(null);
            fixture.detectChanges();

            expect(readout()).toBeNull();
        });

        it('makes room for as many characters as the width has', () => {
            expect(readout()?.style.getPropertyValue('--size-readout-characters')).toBe('3');
        });

        it('marks the host while a resize is in progress', () => {
            expect(control().classList).not.toContain('size-control--resizing');

            fixture.componentInstance.resizing.set(true);
            fixture.detectChanges();

            expect(control().classList).toContain('size-control--resizing');
        });
    });

    describe('click to edit', () => {
        it('turns the readout into a field holding the width, in the same box', async () => {
            const input = openField();
            await fixture.whenStable();

            expect(readoutButton()).toBeNull();
            expect(readout()?.classList).toContain('size-readout--editing');
            expect(input.value).toBe('480');
            expect(document.activeElement).toBe(input);
        });

        it('labels the field and keeps the unit beside it', () => {
            const input = openField();

            expect(input.getAttribute('aria-label')).toBe('Width in px');
            expect(element.querySelector('.size-readout-unit')?.textContent).toBe('px');
        });

        it('makes room for the characters typed', () => {
            type(openField(), '12000');

            expect(readout()?.style.getPropertyValue('--size-readout-characters')).toBe('5');
        });
    });

    describe('saving', () => {
        it('reports a changed width on Enter and closes the field', () => {
            const input = openField();
            type(input, '640');

            const event = press(input, 'Enter');

            expect(fixture.componentInstance.typed).toEqual([640]);
            expect(event.defaultPrevented).toBe(true);
            expect(field()).toBeNull();
            expect(readoutButton()).not.toBeNull();
        });

        it('reports a changed width on Escape', () => {
            const input = openField();
            type(input, '700');

            press(input, 'Escape');

            expect(fixture.componentInstance.typed).toEqual([700]);
        });

        it('reports a changed width when the field loses focus', () => {
            const input = openField();
            type(input, '800');

            input.dispatchEvent(new Event('blur'));
            fixture.detectChanges();

            expect(fixture.componentInstance.typed).toEqual([800]);
            expect(field()).toBeNull();
        });

        it('keeps Enter and Escape from reaching the card around it', () => {
            const input = openField();
            const reached: string[] = [];
            element.addEventListener('keydown', (event) => reached.push(event.key));

            press(input, 'Enter');

            expect(reached).toEqual([]);
        });

        it('brings a typed width into the limits', () => {
            const input = openField();
            type(input, '100');
            press(input, 'Enter');

            const reopened = openField();
            type(reopened, '9999');
            press(reopened, 'Enter');

            expect(fixture.componentInstance.typed).toEqual([352, 2000]);
        });

        it('reports nothing for an unchanged width and hands focus to the readout', async () => {
            const input = openField();

            press(input, 'Enter');
            await fixture.whenStable();

            expect(fixture.componentInstance.typed).toEqual([]);
            expect(document.activeElement).toBe(readoutButton());
        });

        it('reports nothing for a width equal to the shown one, even outside the limits', () => {
            fixture.componentInstance.width.set(5000);
            fixture.detectChanges();
            const input = openField();

            press(input, 'Enter');

            expect(fixture.componentInstance.typed).toEqual([]);
        });

        it('reports the removal of the saved width for an empty field', () => {
            const input = openField();
            type(input, '   ');

            press(input, 'Enter');

            expect(fixture.componentInstance.typed).toEqual([undefined]);
        });

        it('reports nothing for a value that is not a number', () => {
            const input = openField();
            type(input, 'wide');

            press(input, 'Enter');

            expect(fixture.componentInstance.typed).toEqual([]);
            expect(field()).toBeNull();
        });

        it('saves once when Enter closes the field and focus then leaves it', () => {
            const input = openField();
            type(input, '640');

            press(input, 'Enter');
            input.dispatchEvent(new Event('blur'));

            expect(fixture.componentInstance.typed).toEqual([640]);
        });
    });
});
