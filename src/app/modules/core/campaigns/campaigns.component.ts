import { Component, OnInit } from '@angular/core';
import { CampaignQuery } from 'src/app/models/campaign/campaign.query';
import { CampaignService } from 'src/app/models/campaign/campaign.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Campaign } from 'src/app/models/campaign/campaign.model';
import { SubjectSubscriber } from 'rxjs/internal/Subject';

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
  
  constructor(private campaignQuery: CampaignQuery, private campaignservice: CampaignService, private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.campaignservice.get().subscribe();
  }

  showUpdateForm(campaign: Campaign){
    this.campaignToBeUpdated = {...campaign};
    this.isUpdateActivated = true;
  }

  updateCampaign(updateForm) {
    this.updateCampaignSub = this.campaignservice.updateCampaign(
      this.campaignToBeUpdated._id, updateForm.value).subscribe(result => console.log(result)
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
