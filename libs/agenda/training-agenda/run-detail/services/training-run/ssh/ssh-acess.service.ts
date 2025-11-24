import { inject, Injectable } from '@angular/core';
import { SandboxInstanceApi } from '@crczp/sandbox-api';

@Injectable()
export class SshAccessService {
    private sandboxApi = inject(SandboxInstanceApi);

    getAccessFile(sandboxInstanceId: string) {
        this.sandboxApi.getUserSshAccess(sandboxInstanceId).subscribe();
    }
}
