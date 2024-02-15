import { Component, ElementRef, Input, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { format } from 'date-fns';
import { ChartOptions } from 'src/app/models/Survey';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
})
export class ChartComponent implements OnInit, AfterViewInit {

  private readonly _logger: Logger;

  @Input()
  public definition: ChartOptions;

  @ViewChild('graphCanvas')
  private _graphCanvas: ElementRef;
  private _graphChart: Chart;

  constructor(
    logSvc: ILogService
  ) {
    this._logger = logSvc.getLogger("ChartComponent");
  }

  ngOnInit() { }

  ngAfterViewInit() {
    this._logger.LogDebug("ngAfterViewInit", this.definition);

    if (!this.definition) {
      return;
    }

    const chartConfig: ChartConfiguration = {
      type: this.definition.type,
      data: this.definition.data
    };

    if (this.definition.options){
      chartConfig.options = this.definition.options;
    }

    //Deal with config based options
    Object.keys(this.definition.add_ons || {})
      .forEach(add_on => {
        const options = this.definition.add_ons[add_on];
        switch (add_on) {
          case "axis_x_currency":
            this.axisAsCurrency(chartConfig, "x", options?.scale);
            break;
          case "axis_y_currency":
            this.axisAsCurrency(chartConfig, "y", options?.scale);
            break;
          case "axis_x_baseline":
            this.axisBaseline_before(chartConfig, "x", options?.value, options?.show_label || false, options?.color || "black");
            break;
          case "axis_y_baseline":
            this.axisBaseline_before(chartConfig, "y", options?.value, options?.show_label || false, options?.color || "black");
            break;
          case "doughut_title":
            this.doughtnut_text_before(chartConfig, options?.text, options?.font)
        }
      });

    this._graphChart = new Chart(this._graphCanvas.nativeElement, chartConfig);

    //Deal with after display based options
    Object.keys(this.definition.add_ons || {})
      .forEach(add_on => {
        const options = this.definition.add_ons[add_on];
        switch (add_on) {
          case "axis_x_baseline":
            this.axisBaseline_after(this._graphChart, "x", options?.value, options?.show_label || false, options?.color || "black");
            break;
          case "axis_y_baseline":
            this.axisBaseline_after(this._graphChart, "y", options?.value, options?.show_label || false, options?.color || "black");
            break;
        }
      });

    if (this.definition.tooltip_options && this._graphChart.tooltip) {
      Object.keys(this.definition.tooltip_options)
        .forEach(k => this._graphChart.tooltip.options[k] = this.definition.tooltip_options[k]);
    }

    if (this.definition.legend_options && this._graphChart.legend) {
      Object.keys(this.definition.legend_options)
        .forEach(k => this._graphChart.legend.options[k] = this.definition.legend_options[k]);
    }
  }

  private axisAsCurrency(chartConfig: ChartConfiguration, axis: "x" | "y", scale?: number) {

    this._logger.LogDebug("axisAsCurrency", axis, scale);

    chartConfig.options = chartConfig.options || {};
    chartConfig.options.scales = chartConfig.options.scales || {};
    chartConfig.options.scales[axis] = chartConfig.options.scales[axis] || {};
    chartConfig.options.scales[axis].ticks = chartConfig.options.scales[axis].ticks || {};

    const ticks = chartConfig.options.scales[axis].ticks;
    scale = scale == null ? 2 : scale

    ticks.callback = (val, idx) => {
      if (typeof val == 'number' && val != 0) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: scale }).format(val);
      }
      return "";
    };
    this._logger.LogDebug("axisAsCurrency", chartConfig);
  }

  private axisBaseline_before(chartConfig: ChartConfiguration, axis: "x" | "y", value: number, showLabel: boolean, color: string) {
    this._logger.LogDebug("axisBaseline_before", axis, value, showLabel, color);

    chartConfig.options = chartConfig.options || {};
    chartConfig.options.scales = chartConfig.options.scales || {};
    chartConfig.options.scales[axis] = chartConfig.options.scales[axis] || {};
    chartConfig.options.scales[axis].grid = chartConfig.options.scales[axis].grid || {};

    const chartGrid = chartConfig.options.scales[axis].grid;

    chartGrid.color = (context) => {
      return context.tick.value == value
        ? color : "rgba(192, 192, 192, .4)";
    }
  }

  private axisBaseline_after(chartConfig: Chart, axis: "x" | "y", value: number, showLabel: boolean, color: string) {

    this._logger.LogDebug("axisBaseline", value, showLabel);

    const axisScale = axis == "x"
      ? chartConfig.scales?.x
      : chartConfig.scales?.y

    if (!axisScale || !axisScale.ticks) {
      return;
    }

    const baselineTick = axisScale.ticks?.find(x => x.value == value);
    if (!baselineTick) {
      axisScale.ticks.push({
        value: value,
        label: showLabel ? `${value}` : "",
        major: false
      });
    } else if (!showLabel) {
      baselineTick.label = "";
    }

    this._logger.LogDebug("axisBaseline", axisScale.ticks, baselineTick);
  }

  private doughtnut_text_before(chartConfig: ChartConfiguration, text: string, font: string){

    const titleFx = ()=> text;

    const perfTitlePlugin = {
      id: "perfTitlePlugin",
      afterDatasetsDraw(chart, args, pluginOptions) {
        const { ctx } = chart;
        ctx.save();

        const x = chart.getDatasetMeta(0).data[0].x
        const y = chart.getDatasetMeta(0).data[0].y
        const title = titleFx()

        ctx.font = font || 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, x, y);
      }
    }

    chartConfig.plugins = chartConfig.plugins || [];
    chartConfig.plugins.push(perfTitlePlugin);
  }
}
