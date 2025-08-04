import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    OnChanges,
    ViewChild,
} from '@angular/core';
import { ECharts, EChartsOption, init } from 'echarts';
import { Quota } from '@crczp/sandbox-model';
import { ChartData } from '../../../model/chart-data';
import { Utils } from '@crczp/utils';

@Component({
    selector: 'crczp-quota-pie-chart',
    templateUrl: './quota-pie-chart.component.html',
    styleUrls: ['./quota-pie-chart.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotaPieChartComponent implements AfterViewInit, OnChanges {
    @ViewChild('containerPieChart') element!: ElementRef<HTMLDivElement>;

    @Input() quota: Quota | null = null;
    @Input() quotaColor = '#007ACC';

    private chart!: ECharts;

    ngAfterViewInit(): void {
        this.chart = init(this.element.nativeElement);
        this.render();
    }

    ngOnChanges(): void {
        this.render();
    }

    /** Re-render when the @Input quota changes (host can call this) */
    render(): void {
        if (!this.chart) return;
        const option = this.quota
            ? this.buildQuotaOption(this.quota)
            : this.buildSpinnerOption();
        this.chart.setOption(option, true);
    }

    private buildQuotaOption(quota: Quota): EChartsOption {
        const data = new ChartData(quota.inUse, quota.limit - quota.inUse);
        const percentUsed = (
            (data.used / (data.used + data.free)) *
            100
        ).toFixed(1);
        const detailText = `${quota.inUse}${quota.units || ''} of ${
            quota.limit
        }${quota.units || ''}`;

        return {
            title: {
                text: `${percentUsed}%`,
                left: 'center',
                top: 'center',
                textStyle: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: this.quotaColor,
                },
            },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            graphic: [
                {
                    type: 'group',
                    left: 'center',
                    top: '62%',
                    children: this.buildTextLabels(detailText),
                },
            ],
            series: [this.buildBackgroundRing(), this.buildProgressRing(data)],
        };
    }

    private buildSpinnerOption(): EChartsOption {
        return {
            title: { show: false },
            tooltip: { show: false },
            graphic: [],
            series: [this.buildSpinnerLoadingChart()],
        };
    }

    private buildBackgroundRing() {
        return {
            type: 'pie' as const,
            radius: ['69%', '91%'],
            silent: true,
            label: { show: false },
            labelLine: { show: false },
            itemStyle: {
                color: Utils.Document.extractCssVariable('--primary-90'),
            },
            data: [{ value: 1 }],
            animation: true,
            animationDuration: 400,
            animationEasing: 'linear' as const,
            z: 1,
        };
    }

    private buildProgressRing(data: ChartData) {
        return {
            type: 'pie' as const,
            radius: ['70%', '90%'],
            avoidLabelOverlap: false,
            label: { show: false },
            labelLine: { show: false },
            data: [
                {
                    value: data.used,
                    name: 'Used',
                    itemStyle: {
                        color: this.quotaColor,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.15)',
                    },
                },
                {
                    value: data.free,
                    name: 'Remaining',
                    itemStyle: { color: 'transparent' },
                },
            ],
            animation: true,
            animationDuration: 400,
            animationDelay: 420,
            animationEasing: 'linear' as const,
            z: 2,
        };
    }

    private buildSpinnerLoadingChart() {
        return {
            type: 'pie' as const,
            radius: ['70%', '90%'],
            silent: true,
            label: { show: false },
            labelLine: { show: false },
            itemStyle: {
                color: Utils.Document.extractCssVariable('--primary-90'),
            },
            data: [{ value: 100, itemStyle: { opacity: 0.8 } }],
            animation: true,
            animationDuration: 5000,
            animationEasing: 'cubicInOut' as const,
            animationLoop: true,
            z: 2,
        };
    }

    private buildTextLabels(text: string) {
        if (text.length < 12) {
            return [
                {
                    type: 'text',
                    style: {
                        text,
                        fontSize: 14,
                        fill: '#333',
                        align: 'center',
                    },
                },
            ];
        }
        const splitIndex = text.indexOf(' ', text.indexOf(' ') + 1);
        const line1 = text.substring(0, splitIndex).trim();
        const line2 = text.substring(splitIndex).trim();
        return [
            {
                type: 'text',
                style: {
                    text: line1,
                    fontSize: 14,
                    fill: '#333',
                    align: 'center',
                },
            },
            {
                type: 'text',
                style: {
                    text: line2,
                    fontSize: 14,
                    fill: '#333',
                    y: 18,
                    align: 'center',
                },
            },
        ];
    }
}
