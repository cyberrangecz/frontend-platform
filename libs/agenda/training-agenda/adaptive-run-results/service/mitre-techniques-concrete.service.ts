import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { MitreTechniquesOverviewService } from './mitre-techniques.service';
import { Router } from '@angular/router';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class MitreTechniquesOverviewConcreteService extends MitreTechniquesOverviewService {
    private router = inject(Router);

    showMitreTechniques(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.mitre_techniques.build(),
            ])
        );
    }
}
