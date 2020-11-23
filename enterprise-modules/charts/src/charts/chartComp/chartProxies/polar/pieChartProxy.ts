import { AgChart, AgPolarChartOptions, ChartTheme, PieSeries, PolarChart } from "ag-charts-community";
import { AgPieSeriesOptions, HighlightOptions, PieSeriesOptions, PolarChartOptions } from "@ag-grid-community/core";
import { ChartProxyParams, FieldDefinition, UpdateChartParams } from "../chartProxy";
import { PolarChartProxy } from "./polarChartProxy";
import { LegendClickEvent } from "ag-charts-community/dist/cjs/chart/legend";

export class PieChartProxy extends PolarChartProxy {

    public constructor(params: ChartProxyParams) {
        super(params);

        this.initChartOptions();
        this.recreateChart();
    }

    protected createChart(options: PolarChartOptions<PieSeriesOptions>): PolarChart {
        options = options || this.chartOptions;
        const seriesDefaults = options.seriesDefaults;
        const agChartOptions = options as AgPolarChartOptions;

        agChartOptions.autoSize = true;
        agChartOptions.series = [{
            ...seriesDefaults,
            fills: seriesDefaults.fill.colors,
            fillOpacity: seriesDefaults.fill.opacity,
            strokes: seriesDefaults.stroke.colors,
            strokeOpacity: seriesDefaults.stroke.opacity,
            strokeWidth: seriesDefaults.stroke.width,
            type: 'pie'
        }];

        return AgChart.create(agChartOptions, this.chartProxyParams.parentElement);
    }

    protected getDefaultOptionsFromTheme(theme: ChartTheme): PolarChartOptions<PieSeriesOptions> {
        const options = super.getDefaultOptionsFromTheme(theme);

        const seriesDefaults = theme.getConfig<AgPieSeriesOptions>('pie.series.pie');
        options.seriesDefaults = {
            title: seriesDefaults.title,
            label: {
                ...seriesDefaults.label,
                minRequiredAngle: seriesDefaults.label!.minAngle
            },
            callout: seriesDefaults.callout,
            shadow: seriesDefaults.shadow,
            tooltip: {
                enabled: seriesDefaults.tooltip && seriesDefaults.tooltip.enabled,
                renderer: seriesDefaults.tooltip && seriesDefaults.tooltip.renderer
            },
            fill: {
                colors: theme.palette.fills,
                opacity: seriesDefaults.fillOpacity
            },
            stroke: {
                colors: theme.palette.strokes,
                opacity: seriesDefaults.strokeOpacity,
                width: seriesDefaults.strokeWidth
            },
            lineDash: seriesDefaults.lineDash,
            lineDashOffset: seriesDefaults.lineDashOffset,
            highlightStyle: seriesDefaults.highlightStyle as HighlightOptions,
            listeners: seriesDefaults.listeners
        } as PieSeriesOptions;

        return options;
    }

    public update(params: UpdateChartParams): void {
        const {chart} = this;

        if (params.fields.length === 0) {
            chart.removeAllSeries();
            return;
        }

        const field = params.fields[0];
        let angleField = field;

        if (this.crossFiltering) {
            const filteredField = params.fields[1];

            params.data.forEach(d => {
                d[field.colId + '-total'] = d[field.colId] + d[filteredField.colId];
                d[field.colId] = d[field.colId] / d[field.colId + '-total'];
                d[filteredField.colId] = 1;
            });

            let opaqueSeries = chart.series[1] as PieSeries;
            let radiusField = filteredField;
            opaqueSeries = this.updateSeries(chart, opaqueSeries, angleField, radiusField, params, undefined);

            radiusField = angleField;
            const filteredSeries = chart.series[0] as PieSeries;
            this.updateSeries(chart, filteredSeries, angleField, radiusField, params, opaqueSeries);

        } else {
            const series = chart.series[0] as PieSeries;
            this.updateSeries(chart, series, angleField, angleField, params, undefined);
        }
    }

    private updateSeries(
        chart: PolarChart,
        series: PieSeries,
        angleField: FieldDefinition,
        field: FieldDefinition,
        params: UpdateChartParams,
        opaqueSeries: PieSeries | undefined
    ) {
        const existingSeriesId = series && series.angleKey;
        const {fills, strokes} = this.getPalette();
        const {seriesDefaults} = this.chartOptions;

        let pieSeries = series;
        const calloutColors = seriesDefaults.callout && seriesDefaults.callout.colors;

        if (existingSeriesId !== field.colId) {
            chart.removeSeries(series);

            pieSeries = AgChart.createComponent({
                ...seriesDefaults,
                type: 'pie',
                angleKey: this.crossFiltering ? angleField.colId + '-total' : angleField.colId,
                radiusKey: this.crossFiltering ? field.colId : undefined,
                title: {
                    ...seriesDefaults.title,
                    text: seriesDefaults.title.text || params.fields[0].displayName,
                },
                fills: seriesDefaults.fill.colors,
                fillOpacity: seriesDefaults.fill.opacity,
                strokes: seriesDefaults.stroke.colors,
                strokeOpacity: seriesDefaults.stroke.opacity,
                strokeWidth: seriesDefaults.stroke.width,
                tooltip: {
                    renderer: seriesDefaults.tooltip && seriesDefaults.tooltip.enabled && seriesDefaults.tooltip.renderer,
                },
            }, 'pie.series');
        }

        pieSeries.angleName = field.displayName!;
        pieSeries.labelKey = params.category.id;
        pieSeries.labelName = params.category.name;
        pieSeries.data = params.data;

        if (this.crossFiltering) {
            pieSeries.radiusMin = 0;
            pieSeries.radiusMax = 1;

            const isOpaqueSeries = !opaqueSeries;
            if (isOpaqueSeries) {
                pieSeries.fills = fills.map(fill => this.hexToRGB(fill, '0.3'));
                pieSeries.strokes = strokes.map(stroke => this.hexToRGB(stroke, '0.3'));
                pieSeries.showInLegend = false;
            } else {
                chart.legend.addEventListener('click', (event: LegendClickEvent) => {
                    if (opaqueSeries) {
                        (opaqueSeries as PieSeries).toggleSeriesItem(event.itemId as any, event.enabled);
                    }
                });
                pieSeries.fills = fills;
                pieSeries.strokes = strokes;
                if (calloutColors) {
                    pieSeries.callout.colors = strokes;
                }
            }

            // disable series highlighting by default
            pieSeries.highlightStyle.fill = undefined;

            pieSeries.addEventListener("nodeClick", this.crossFilterCallback);
        } else {
            pieSeries.fills = fills;
            pieSeries.strokes = strokes;

            if (calloutColors) {
                pieSeries.callout.colors = strokes;
            }
        }

        chart.addSeries(pieSeries);

        return pieSeries;
    }

    protected getDefaultOptions(): PolarChartOptions<PieSeriesOptions> {
        const {strokes} = this.getPredefinedPalette();
        const options = this.getDefaultChartOptions() as PolarChartOptions<PieSeriesOptions>;
        const fontOptions = this.getDefaultFontOptions();

        options.seriesDefaults = {
            ...options.seriesDefaults,
            title: {
                ...fontOptions,
                enabled: false,
                fontSize: 12,
                fontWeight: 'bold',
            },
            callout: {
                colors: strokes,
                length: 10,
                strokeWidth: 2,
            },
            label: {
                ...fontOptions,
                enabled: false,
                offset: 3,
                minRequiredAngle: 0,
            },
            tooltip: {
                enabled: true,
            },
            shadow: this.getDefaultDropShadowOptions(),
        };

        return options;
    }
}