import { DestroyRef, inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class ProgressDataService {
    protected readonly config = inject(PortalConfig);

    private readonly destroyRef = inject(DestroyRef);
}
