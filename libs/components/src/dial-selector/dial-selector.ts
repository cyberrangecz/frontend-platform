import {
  Component,
  computed,
  effect,
  input,
  model,
  output,
  ChangeDetectionStrategy
} from '@angular/core';


export interface DialItem {
    key: string;
    label: string;
}

@Component({
    selector: 'crczp-dial-selector',
    imports: [],
    templateUrl: './dial-selector.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './dial-selector.scss',
})
export class DialSelector {
    readonly items = input.required<DialItem[]>();
    readonly currentIndex = model.required<number>();
    readonly selected = output<{ key: string; index: number }>();

    readonly visibleItems = computed(() => {
        const items = this.items();
        const index = this.currentIndex();
        return {
            prev: index > 0 ? items[index - 1] : null,
            current: items[index],
            next: index < items.length - 1 ? items[index + 1] : null,
        };
    });

    constructor() {
        effect(() => {
            const items = this.items();
            const index = this.currentIndex();
            if (items[index]) {
                this.selected.emit({ key: items[index].key, index });
            }
        });
    }

    selectIndex(offset: number): void {
        const newIndex = this.currentIndex() + offset;
        if (newIndex >= 0 && newIndex < this.items().length) {
            this.currentIndex.set(newIndex);
        }
    }

    onWheel(event: WheelEvent): void {
        event.preventDefault();
        if (event.deltaY > 0) {
            this.selectIndex(1);
        } else if (event.deltaY < 0) {
            this.selectIndex(-1);
        }
    }
}
