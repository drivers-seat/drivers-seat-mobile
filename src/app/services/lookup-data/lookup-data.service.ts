import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Employer } from 'src/app/models/Employer';
import { MetroArea } from 'src/app/models/MetroArea';
import { ApiService } from '../api.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { UserService } from '../user.service';

export abstract class ILookupDataService {

  public abstract isReady$: BehaviorSubject<boolean>;
  public abstract employers: Array<Employer>;
  public abstract employers_map: { [key: number]: Employer };
  public abstract employers_service_class_map: { [key: string]: Array<Employer> };
  public abstract metro_areas: Array<MetroArea>;
  public abstract metro_areas_map: { [key: number]: MetroArea };
  public abstract service_classes: Array<string>;
}

@Injectable({
  providedIn: 'root'
})
export class LookupDataService {

  private readonly _logger: Logger

  public isReady$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public employers: Array<Employer>;
  public employers_map: { [key: number]: Employer };
  public employers_service_class_map: { [key: string]: Array<Employer> };

  public service_classes: Array<string>;

  public metro_areas: Array<MetroArea>;
  public metro_areas_map: { [key: number]: MetroArea };

  private readonly _refershIntervalSeconds: number = 600;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _httpSvc: HttpClient
  ) { 
    this._logger = logSvc.getLogger("LookupDataService");

    this._userSvc.currentUser$.subscribe(async u=>{

      if(this.isReady$.value || !u){
        return;
      }

      
      await this.getLookupData();
      setInterval(this.getLookupData.bind(this), this._refershIntervalSeconds * 1000);
    });
  }

  private async getLookupData() {

    this._logger.LogInfo("getLookupData", "Fetching reference data from server");

    const promises = [];
    
    promises.push(this._httpSvc.get(`${this._apiSvc.url()}/employers`).toPromise()
      .then(data => {

        data["data"].forEach(emp=>emp.service_class = emp.service_class.toLowerCase());
        
        this.employers = data["data"].sort((a, b) => a.name.localeCompare(b.name));
        this.employers_map = {};
        this.employers.forEach(emp => this.employers_map[emp.id] = emp);

        this.employers_service_class_map = {};
        this.employers.forEach(emp => {
          this.employers_service_class_map[emp.service_class.toLowerCase()] = this.employers_service_class_map[emp.service_class] || new Array<Employer>();
          this.employers_service_class_map[emp.service_class].push(emp);
        });

        this.service_classes = Object.keys(this.employers_service_class_map).sort();

        Object.keys(this.employers_service_class_map).forEach(svcClass=>this.employers_service_class_map[svcClass].sort((a, b) => a.name.localeCompare(b.name)));

        this._logger.LogDebug("getLookupData", "Retrieved Employers", this.employers, this.employers_map, this.employers_service_class_map);
      })
    );

    promises.push(this._httpSvc.get(`${this._apiSvc.url()}/regions/metro_areas`).toPromise()
      .then(data => {

        
        this.metro_areas = data["data"]
          .map(x=>this.parseMetroArea(x))
          .sort((a, b) => a.name.localeCompare(b.name));

        this.metro_areas_map = {};
        this.metro_areas.forEach(ma => this.metro_areas_map[ma.id] = ma);

        this._logger.LogDebug("getLookupData", "Retrieved Metro Areas", this.metro_areas, this.metro_areas_map);
      })
    );

    await Promise.all(promises);

    this.isReady$.next(true);
  }

  private parseMetroArea(data: any): MetroArea {

    this._logger.LogDebug(data);
    const metroArea = new MetroArea;
    
    metroArea.id = data["id"];
    metroArea.name = data["name"];
    
    if(data["hourly_pay_stat_coverage_percent"] != null){
      metroArea.hourly_pay_stat_coverage_percent = parseFloat(data["hourly_pay_stat_coverage_percent"]);
    }

    if(data["hourly_pay_stat_coverage_percent_delivery"]  != null){
      metroArea.hourly_pay_stat_coverage_percent_delivery = parseFloat(data["hourly_pay_stat_coverage_percent_delivery"]);
    }

    if(data["hourly_pay_stat_coverage_percent_rideshare"]  != null){
      metroArea.hourly_pay_stat_coverage_percent_rideshare = parseFloat(data["hourly_pay_stat_coverage_percent_rideshare"]);
    }

    metroArea.hourly_pay_stat_coverage_count_workers = data["hourly_pay_stat_coverage_count_workers"];
    metroArea.hourly_pay_stat_coverage_count_workers_rideshare = data["hourly_pay_stat_coverage_count_workers_rideshare"];
    metroArea.hourly_pay_stat_coverage_count_workers_delivery = data["hourly_pay_stat_coverage_count_workers_delivery"];
    metroArea.hourly_pay_stat_coverage_count_employers = data["hourly_pay_stat_coverage_count_employers"];
    metroArea.hourly_pay_stat_coverage_count_employers_rideshare = data["hourly_pay_stat_coverage_count_employers_rideshare"];
    metroArea.hourly_pay_stat_coverage_count_employers_delivery = data["hourly_pay_stat_coverage_count_employers_delivery"];
    metroArea.hourly_pay_stat_coverage_count_jobs = data["hourly_pay_stat_coverage_count_jobs"];
    metroArea.hourly_pay_stat_coverage_count_jobs_rideshare = data["hourly_pay_stat_coverage_count_jobs_rideshare"];
    metroArea.hourly_pay_stat_coverage_count_jobs_delivery = data["hourly_pay_stat_coverage_count_jobs_delivery"];
    metroArea.hourly_pay_stat_coverage_count_tasks = data["hourly_pay_stat_coverage_count_tasks"];
    metroArea.hourly_pay_stat_coverage_count_tasks_rideshare = data["hourly_pay_stat_coverage_count_tasks_rideshare"];
    metroArea.hourly_pay_stat_coverage_count_tasks_delivery = data["hourly_pay_stat_coverage_count_tasks_delivery"];

    return metroArea;
  }
}
