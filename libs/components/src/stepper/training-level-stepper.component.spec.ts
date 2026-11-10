import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LevelStepperAdapter } from './level-stepper-adapter';
import { TrainingLevelStepperComponent } from './training-level-stepper.component';

function adapterOf(id: number | undefined, title: string): LevelStepperAdapter {
    return { id, title, icon: 'info', state: undefined, level: undefined } as unknown as LevelStepperAdapter;
}

describe('TrainingLevelStepperComponent', () => {
    let fixture: ComponentFixture<TrainingLevelStepperComponent>;

    const stepperModel = (): unknown => (fixture.componentInstance as unknown as { levelStepper(): unknown }).levelStepper();

    function show(levels: LevelStepperAdapter[]): void {
        fixture.componentRef.setInput('levels', levels);
        fixture.detectChanges();
    }

    it('keeps one stepper model while a new level list has the same ids and icons', () => {
        fixture = TestBed.createComponent(TrainingLevelStepperComponent);
        fixture.componentRef.setInput('activeStep', 0);
        show([adapterOf(1, 'One'), adapterOf(2, 'Two')]);
        const first = stepperModel();

        show([adapterOf(1, 'One'), adapterOf(2, 'Two')]);

        expect(stepperModel()).toBe(first);
    });

    it('shows a renamed level in the same stepper model', () => {
        fixture = TestBed.createComponent(TrainingLevelStepperComponent);
        fixture.componentRef.setInput('activeStep', 0);
        show([adapterOf(1, 'One'), adapterOf(2, 'Two')]);
        const first = stepperModel() as { items: LevelStepperAdapter[] };

        show([adapterOf(1, 'One'), adapterOf(2, 'Renamed')]);

        expect(stepperModel()).toBe(first);
        expect(first.items.map(({ title }) => title)).toEqual(['One', 'Renamed']);
    });

    it('creates a new stepper model when levels are added, removed or reordered', () => {
        fixture = TestBed.createComponent(TrainingLevelStepperComponent);
        fixture.componentRef.setInput('activeStep', 0);
        show([adapterOf(1, 'One')]);
        const first = stepperModel();

        show([adapterOf(1, 'One'), adapterOf(2, 'Two')]);
        const second = stepperModel() as { items: LevelStepperAdapter[] };
        show([adapterOf(2, 'Two'), adapterOf(1, 'One')]);
        const third = stepperModel() as { items: LevelStepperAdapter[] };
        show([adapterOf(2, 'Two')]);
        const fourth = stepperModel() as { items: LevelStepperAdapter[] };

        expect(second).not.toBe(first);
        expect(third).not.toBe(second);
        expect(third.items.map(({ id }) => id)).toEqual([2, 1]);
        expect(fourth).not.toBe(third);
        expect(fourth.items.map(({ id }) => id)).toEqual([2]);
    });

    describe('rendered steps', () => {
        const renderedLabels = (): string[] =>
            Array.from<HTMLElement>(
                fixture.nativeElement.querySelectorAll('.item-name'),
            ).map((label) => label.textContent?.trim() ?? '');

        beforeEach(() => {
            fixture = TestBed.createComponent(TrainingLevelStepperComponent);
            fixture.componentRef.setInput('activeStep', 0);
            show([adapterOf(1, 'One'), adapterOf(2, 'Two')]);
        });

        it('shows a level added without an id', () => {
            show([adapterOf(1, 'One'), adapterOf(2, 'Two'), adapterOf(undefined, 'New')]);

            expect(renderedLabels()).toEqual(['1. One', '2. Two', '3. New']);
        });

        it('shows the new title of a level renamed in place, keeping the mounted stepper', () => {
            const stepperElement = fixture.nativeElement.querySelector('sentinel-stepper');

            show([adapterOf(1, 'One'), adapterOf(2, 'Tw')]);
            show([adapterOf(1, 'One'), adapterOf(2, 'Two!')]);

            expect(renderedLabels()).toEqual(['1. One', '2. Two!']);
            expect(fixture.nativeElement.querySelector('sentinel-stepper')).toBe(stepperElement);
        });

        it('shows removed and reordered levels', () => {
            show([adapterOf(2, 'Two'), adapterOf(1, 'One')]);
            expect(renderedLabels()).toEqual(['1. Two', '2. One']);

            show([adapterOf(1, 'One')]);
            expect(renderedLabels()).toEqual(['1. One']);
        });
    });
});
