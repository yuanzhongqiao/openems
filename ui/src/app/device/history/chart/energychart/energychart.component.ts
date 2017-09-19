import { Component, Input, OnInit, OnChanges, ViewChild, AfterViewInit, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BaseChartDirective } from 'ng2-charts/ng2-charts';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';

import { Device } from '../../../../shared/device/device';
import { ConfigImpl } from '../../../../shared/device/config';
import { DefaultTypes } from '../../../../shared/service/defaulttypes';
import { Dataset, EMPTY_DATASET } from './../../../../shared/shared';
import { DEFAULT_TIME_CHART_OPTIONS, ChartOptions, TooltipItem, Data } from './../shared';
import { Utils } from './../../../../shared/service/utils';
import { CurrentDataAndSummary } from '../../../../shared/device/currentdata';

// TODO grid should be shown as "Netzeinspeisung"/"Netzbezug" instead of positive/negative value
@Component({
  selector: 'energychart',
  templateUrl: './energychart.component.html'
})
export class EnergyChartComponent implements OnChanges {

  @Input() private device: Device;
  @Input() private config: ConfigImpl;
  @Input() private channels: DefaultTypes.ChannelAddresses;
  @Input() private fromDate: moment.Moment;
  @Input() private toDate: moment.Moment;

  @ViewChild('energyChart') private chart: BaseChartDirective;

  constructor(
    private utils: Utils,
    private translate: TranslateService
  ) {
    this.grid = this.translate.instant('General.Grid');
    this.gridBuy = this.translate.instant('General.GridBuy');
    this.gridSell = this.translate.instant('General.GridSell');
  }

  public labels: moment.Moment[] = [];
  public datasets: Dataset[] = EMPTY_DATASET;
  public loading: boolean = true;

  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private grid: String = "";
  private gridBuy: String = "";
  private gridSell: String = "";

  private colors = [{
    backgroundColor: 'rgba(45,143,171,0.2)',
    borderColor: 'rgba(45,143,171,1)',
  }, {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(0,0,0,1)',
  }, {
    backgroundColor: 'rgba(221,223,1,0.2)',
    borderColor: 'rgba(221,223,1,1)',
  }];
  private options: ChartOptions;

  ngOnInit() {
    let options = <ChartOptions>this.utils.deepCopy(DEFAULT_TIME_CHART_OPTIONS);
    options.scales.yAxes[0].scaleLabel.labelString = "kW";
    options.tooltips.callbacks.label = function (tooltipItem: TooltipItem, data: Data) {
      let label = data.datasets[tooltipItem.datasetIndex].label;
      let value = tooltipItem.yLabel;
      if (label == this.grid) {
        if (value < 0) {
          value *= -1;
          label = this.gridBuy;
        } else {
          label = this.gridSell;
        }
      }
      return label + ": " + value.toPrecision(2) + " kW";
    }
    this.options = options;
  }

  ngOnChanges() {
    this.loading = true;
    this.device.historicDataQuery(this.fromDate, this.toDate, this.channels).then(historicData => {
      // prepare datas array and prefill with each device

      // prepare datasets and labels
      let activePowers = {
        production: [],
        grid: [],
        consumption: []
      }
      let labels: moment.Moment[] = [];
      for (let record of historicData.data) {
        labels.push(moment(record.time));
        let data = new CurrentDataAndSummary(record.channels, this.config);
        activePowers.grid.push(Utils.divideSafely(data.summary.grid.activePower, -1000)); // convert to kW and invert value
        activePowers.production.push(Utils.divideSafely(data.summary.production.activePower, 1000)); // convert to kW
        activePowers.consumption.push(Utils.divideSafely(data.summary.consumption.activePower, 1000)); // convert to kW
      }
      this.datasets = [{
        label: this.translate.instant('General.Production'),
        data: activePowers.production
      }, {
        label: this.translate.instant('General.Grid'),
        data: activePowers.grid
      }, {
        label: this.translate.instant('General.Consumption'),
        data: activePowers.consumption
      }];
      this.labels = labels;
      // stop loading spinner
      this.loading = false;
      setTimeout(() => {
        // Workaround, because otherwise chart data and labels are not refreshed...
        if (this.chart) {
          this.chart.ngOnChanges({} as SimpleChanges);
        }
      });
    }).catch(error => {
      this.datasets = EMPTY_DATASET;
      this.labels = [];
    });
  }
}