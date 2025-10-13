import { from, Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class MitreTechniquesOverviewService {
    private router = inject(Router);

    showMitreTechniques(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.mitre_techniques.build(),
            ])
        );
    }
}
