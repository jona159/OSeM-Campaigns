import { MapService } from 'src/app/modules/explore/services/map.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CampaignQuery } from 'src/app/models/campaign/campaign.query';
import { CampaignService } from 'src/app/models/campaign/campaign.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Campaign } from 'src/app/models/campaign/campaign.model';
import { SubjectSubscriber } from 'rxjs/internal/Subject';
import { tap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { PhenomenaService } from '../services/phenomena.service';
import { SessionService } from 'src/app/models/session/state/session.service';
import { SessionQuery } from 'src/app/models/session/state/session.query';
import { UiService } from 'src/app/models/ui/state/ui.service';

@Component({
  selector: 'osem-campaigns',
  templateUrl: './campaigns.component.html',
  styleUrls: ['./campaigns.component.scss']
})
export class CampaignsComponent implements OnInit, OnDestroy {

  loggedIn$ = this.sessionQuery.isLoggedIn$;

  username
  
  currentUser= this.sessionQuery.user$;

  allCampaigns$ = this.campaignQuery.selectAll();

  campaignToBeUpdated: any;

  isUpdateActivated = false;

  updateCampaignSub: Subscription;

  deleteCampaignSub: Subscription;

  phenomena

  //Accordion stuff
  view_ac='';
  //Function for opening and closing accordion
  changeAccordion(ac) {
    if (this.view_update !== ''){
      this.view_update = '';
      this.mapService.disableCampPolygons();
    }
    if (ac == this.view_ac) {
      this.view_ac = '';
      this.mapService.disableCampPolygons();
    }
    else {
      this.view_ac = ac;
      this.mapService.enableCampPolygons();
    }
  }

  //Function for opening "update" functionality only for currently selected campaign
  view_update = '';
  changeUpdate(update) {
   if (update == this.view_update) {
      this.view_update = '';
    }
    else {
      this.view_update = update
      this.view_ac = update;
    }
  }
  constructor(private sessionQuery: SessionQuery,
              private phenomenaService: PhenomenaService,
              private datePipe : DatePipe,
              private campaignQuery: CampaignQuery,
              private campaignservice: CampaignService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private uiService: UiService,
              private mapService: MapService) { }

  ngOnInit() {
    this.campaignservice.get().subscribe();
    this.phenomena = this.phenomenaService.getPhenomena();
    //Hide menu on the left side
    this.uiService.setFilterVisible(false);
    this.currentUser.subscribe(result => {
      console.log(result.name);
    })
  }

  getUsername(){
    this.currentUser.subscribe(result =>
           this.username = result.name);
    }

  ngOnDestroy(){
    console.log("Destroy");
    this.mapService.disableCampPolygons();
  }

  //zoom to currently selected campaign
  clickToZoom(coordinates: any) {
    this.mapService.zoomMe(coordinates);
    //this.mapService.Plotpolygon(coordinates);
  }

  formatStartdate(event){
    this.campaignToBeUpdated.startDate = new Date(event);
  }

  formatEnddate(event){
    this.campaignToBeUpdated.endDate = new Date(event);
  }
  
  showUpdateForm(campaign: Campaign){
    this.campaignToBeUpdated = {...campaign};
    this.isUpdateActivated = true;
    console.log(campaign);
    console.log(this.campaignToBeUpdated);
  }

  joinCampaign(campaign: Campaign){
  //     this.campaignToBeUpdated = {...campaign};
  //     console.log(this.campaignToBeUpdated);
  //     this.getUsername();
  //     console.log(this.username);
  //     // this.sessionQuery.user$.subscribe(result =>
  //     //  this.currentUser = result.name);
  //  //alert('Follow this link to join the discussion on Slack: https://join.slack.com/t/opensensemapcampaigns/shared_invite/zt-11uz1lkc3-w98lYPWGllA1iZdMVZFNzQ');

  //     //console.log(this.currentUser);
  //     this.campaignToBeUpdated.participants =this.username;
  //     console.log(this.campaignToBeUpdated);
  //    this.updateCampaignSub = this.campaignservice.updateCampaign(
  //        this.campaignToBeUpdated._id, this.campaignToBeUpdated).subscribe(result =>
  //         console.log(result)
  //         );
  //      //this.campaignToBeUpdated = null;
        window.open('https://join.slack.com/t/opensensemapcampaigns/shared_invite/zt-11uz1lkc3-w98lYPWGllA1iZdMVZFNzQ');
      }

  updateCampaign(updateForm) {
      // let sd= updateForm.value.startDate;
      // sd = this.datePipe.transform(sd, 'yyyy-MM-dd');
      // sd = new Date(sd);
      // console.log(sd);
      //console.log(updateForm);
      console.log(updateForm.value);
      this.updateCampaignSub = this.campaignservice.updateCampaign(
       this.campaignToBeUpdated._id, updateForm.value).subscribe(result =>
         console.log(result)
         //console.log(updateForm.value)
       );
     this.isUpdateActivated = false;
      //reset the "Update" button again to non-updating state
      this.view_update = '';
     //this.campaignToBeUpdated = null;
   }

  deleteCampaign(campaignId: string){
    this.deleteCampaignSub = this.campaignservice.deleteCampaign(campaignId).subscribe(result => {
      console.log(result);
    })
  }

}
