import { Component, OnInit } from '@angular/core';
import { CampaignQuery } from 'src/app/models/campaign/campaign.query';
import { CampaignService } from 'src/app/models/campaign/campaign.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Campaign } from 'src/app/models/campaign/campaign.model';
import { SubjectSubscriber } from 'rxjs/internal/Subject';
import { tap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { PhenomenaService } from '../services/phenomena.service';

@Component({
  selector: 'osem-campaigns',
  templateUrl: './campaigns.component.html',
  styleUrls: ['./campaigns.component.scss']
})
export class CampaignsComponent implements OnInit {

  allCampaigns$ = this.campaignQuery.selectAll();
    
  campaignToBeUpdated: any;

  isUpdateActivated = false; 

  updateCampaignSub: Subscription; 

  deleteCampaignSub: Subscription;

  phenomena
  
  constructor(private phenomenaService: PhenomenaService, private datePipe : DatePipe, private campaignQuery: CampaignQuery, private campaignservice: CampaignService, private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.campaignservice.get().subscribe();
    this.phenomena = this.phenomenaService.getPhenomena();
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

  updateCampaign(updateForm) {
      // let sd= updateForm.value.startDate;
      // sd = this.datePipe.transform(sd, 'yyyy-MM-dd');
      // sd = new Date(sd);
      // console.log(sd);
      
      this.updateCampaignSub = this.campaignservice.updateCampaign(
       this.campaignToBeUpdated._id, updateForm.value).subscribe(result => 
         console.log(result)
       );
     this.isUpdateActivated = false;
     this.campaignToBeUpdated = null;
   }

  deleteCampaign(campaignId: string){
    this.deleteCampaignSub = this.campaignservice.deleteCampaign(campaignId).subscribe(result => {
      console.log(result);
    })
  }

}
