import { Component, OnInit } from '@angular/core';
import { FormDesign } from 'src/app/form';
import { UiService } from 'src/app/models/ui/state/ui.service';
import { PhenomenaService } from '../services/phenomena.service';
import { CampaignQuery } from 'src/app/models/campaign/campaign.query';
import { CampaignService } from 'src/app/models/campaign/campaign.service';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'osem-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnInit {

  phenomena

  model = new FormDesign();

  submitted = false;
  allCampaigns$ = this.campaignQuery.selectAll();
  singleCampaign$ = this.campaignQuery.selectLast();

  onSubmit() {
              this.submitted = true;
            }

  constructor(private campaignQuery: CampaignQuery, private campaignservice: CampaignService, private phenomenaService: PhenomenaService, private uiService: UiService, private activatedRoute: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
     this.phenomena = this.phenomenaService.getPhenomena();
     this.campaignservice.get().subscribe();
     this.uiService.setFilterVisible(false);
     
//      this.activatedRoute.params.subscribe(params => {
//        if(params.id){
//        this.campaignservice.getSingleCampaign(params.id).subscribe();      

// }
// })
     this.campaignservice.getSingleCampaign('61b9e714a5c04e6f68f7dfd3').subscribe();
}
}  
