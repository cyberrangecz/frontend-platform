import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { DefinitionLevelTexts } from '@crczp/training-agenda/internal';
import { markdownTextsOf } from '../../../model/level-markdown-texts';
import { LevelEditService } from '../level/level-edit.service';

/** The markdown texts of the levels held by the level edit service. */
@Injectable()
export class LevelEditServiceTexts extends DefinitionLevelTexts {
    private readonly levelEditService = inject(LevelEditService);

    override readonly texts: Signal<readonly string[]> = toSignal(
        this.levelEditService.levels$.pipe(map((levels) => levels.flatMap(markdownTextsOf))),
        { initialValue: [] },
    );

    override rewrite(transform: (markdown: string) => string): void {
        this.levelEditService.rewriteTexts(transform);
    }
}
