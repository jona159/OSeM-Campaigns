import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';

import { BoxService } from 'src/app/models/box/state/box.service';
import { UiQuery } from 'src/app/models/ui/state/ui.query';
import { UiService } from 'src/app/models/ui/state/ui.service';
import { SensorService } from 'src/app/models/sensor/state/sensor.service';
import { slideInOutHorizontalBoolean } from 'src/app/helper/animations';

@Component({
  selector: 'osem-filter-container',
  templateUrl: './filter-container.component.html',
  styleUrls: ['./filter-container.component.scss'],
  animations: [slideInOutHorizontalBoolean]
})
export class FilterContainerComponent implements OnInit {

  selectDateRange$ = this.uiQuery.selectDateRange$;
  selectedPheno$ = this.uiQuery.selectSelectedPheno$;
  filterVisible$ = this.uiQuery.selectFilterVisible$;
  activeTab = 'phenos';

  minimizedBoolean = false;

  constructor(
    private boxService: BoxService,
    private sensorService: SensorService,
    private uiService: UiService, 
    private uiQuery: UiQuery) { }

  ngOnInit() {
   
    combineLatest(this.selectDateRange$, this.selectedPheno$).subscribe(res => {
      if(res[0] && res[1]){
        this.boxService.getValues(res[1].title, res[0]).subscribe();
        if(window.matchMedia("(max-width: 768px)").matches){
          this.uiService.setFilterVisible(false);
        }
      }
    })
  }

  changeDateRange(range){
    this.uiService.updateDateRange(range);
    this.sensorService.resetHasData();
  }

  changeStartDate(startDate){
    this.uiService.updateStartDate(startDate);
  }

  changeEndDate(startDate){
    this.uiService.updateEndDate(startDate);
  }

  selectPheno(pheno){
    this.uiService.updateSelectedPheno(pheno);
  }

  setActiveTab(activeTab){
    this.activeTab = activeTab;
    if(this.minimizedBoolean)
      this.minimizedBoolean = false;
  }

  minimize(){
    this.minimizedBoolean = !this.minimizedBoolean;
  }

  toggleMinimizeFilter(){
    this.uiService.toggleFilterVisible();
  }
}