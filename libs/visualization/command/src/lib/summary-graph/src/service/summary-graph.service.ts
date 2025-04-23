import { Injectable } from '@angular/core';
import { SummaryGraphApiService } from '../api/summary-graph-api.service';
import { Observable } from 'rxjs';

export class Graph {
    constructor(public graph: string) {}
}

@Injectable()
export class SummaryGraphService {
    constructor(private summaryGraphApiService: SummaryGraphApiService) {}

    getSummaryGraph(instanceId: number): Observable<Graph> {
        return this.summaryGraphApiService.getSummaryGraph(instanceId);
    }
}
