import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {ReferenceGraphApi} from '@crczp/visualization-api';

export class Graph {
    constructor(public graph: string) {}
}

@Injectable()
export class SummaryGraphService {
    private summaryGraphApiService = inject(ReferenceGraphApi);


    getSummaryGraph(instanceId: number): Observable<Graph> {
        return this.summaryGraphApiService.getSummaryGraph(instanceId);
    }
}
