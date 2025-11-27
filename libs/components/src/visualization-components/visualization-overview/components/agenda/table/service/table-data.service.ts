import { inject, Injectable } from '@angular/core';
import { TableApiService } from '../../../api/table/table-api.service';
import { TraineeModeInfo } from '../../../../shared/interfaces/trainee-mode-info';
import { Observable, throwError } from 'rxjs';
import { TableData } from '../../../model/table/table-data';
import { catchError, map } from 'rxjs/operators';
import { TableMapper } from '../../../api/mappers/table/table-mapper';

@Injectable()
export class TableDataService {
    private tableApiService = inject(TableApiService);

    getAllData(
        traineeModeInfo: TraineeModeInfo,
        trainingInstanceId: number,
    ): Observable<TableData> {
        const service = TraineeModeInfo.isTrainee(traineeModeInfo)
            ? this.tableApiService.getAnonymizedTableVisualizationData(
                  traineeModeInfo.trainingRunId,
              )
            : this.tableApiService.getTableVisualizationData(
                  trainingInstanceId,
              );

        return service.pipe(
            map((data) => TableMapper.fromDTO(data)),
            catchError((error) => {
                return throwError(
                    'tableService not connect to API: ' + error.message,
                );
            }),
        );
    }
}
