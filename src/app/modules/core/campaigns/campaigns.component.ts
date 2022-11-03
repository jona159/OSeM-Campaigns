import { MapService } from "src/app/modules/explore/services/map.service";
import { Component, OnInit } from "@angular/core";
import { CampaignQuery } from "src/app/models/campaign/campaign.query";
import { CampaignService } from "src/app/models/campaign/campaign.service";
import { Router, ActivatedRoute } from "@angular/router";
import { Observable, Subscription } from "rxjs";
import { Campaign } from "src/app/models/campaign/campaign.model";
import { SubjectSubscriber } from "rxjs/internal/Subject";
import { tap } from "rxjs/operators";
import { DatePipe } from "@angular/common";
import { PhenomenaService } from "../services/phenomena.service";
import { SessionService } from "src/app/models/session/state/session.service";
import { SessionQuery } from "src/app/models/session/state/session.query";
import { UiService } from "src/app/models/ui/state/ui.service";
import { ThreadService } from "src/app/models/threads/threads.service";
import { ThreadStore } from "src/app/models/threads/threads.store";
import { CursorError } from "@angular/compiler/src/ml_parser/lexer";
import { filter, map } from "rxjs/operators";
import { pipe } from "rxjs";

@Component({
  selector: "osem-campaigns",
  templateUrl: "./campaigns.component.html",
  styleUrls: ["./campaigns.component.scss"],
})
export class CampaignsComponent implements OnInit {
  loggedIn$ = this.sessionQuery.isLoggedIn$;

  currentUser: any;

  searchstring: string;

  // prio: string;

  // timeleft: string;

  filterObject = {
    priority: {
      Urgent: false,
      High: false,
      Medium: false,
      Low: false,
    },
    timeleft: {
      "14": false,
      "30": false,
      "90": false,
      "365": false,
      "1000": false,
    },
    räumliche_Nähe: false,
    phenomena: false,
  };

  slackToken =
    "xoxp-2966864970930-2969169630004-3008901576819-0b8e12f0c75789fc94ae67cba7707c2f";

  whurl =
    "https://discord.com/api/webhooks/932937133918937130/kmiGdfNRbD8MluFz2eLHJwyFmTmtODuPxqImAxC34DyOlJ1Z8OC1vA7rHAypexC-xeTr";

  allCampaigns$ = this.campaignQuery.selectAll();

  searchedCampaigns$ = this.allCampaigns$;

  currentDate = this.datePipe.transform(new Date(), "dd-MM-yy");

  campaignToBeUpdated: any;

  isUpdateActivated = false;

  threadFormActivated = false;

  updateCampaignSub: Subscription;

  deleteCampaignSub: Subscription;

  phenomena;

  //Accordion stuff
  view_ac = "";
  //Function for opening and closing accordion
  changeAccordion(ac) {
    if (this.view_update !== "") this.view_update = "";
    if (ac == this.view_ac) {
      this.view_ac = "";
    } else {
      this.view_ac = ac;
    }
  }

  //Function for opening "update" functionality only for currently selected campaign
  view_update = "";
  changeUpdate(update) {
    if (update == this.view_update) {
      this.view_update = "";
    } else {
      this.view_update = update;
      this.view_ac = update;
    }
  }
  constructor(
    private sessionQuery: SessionQuery,
    private phenomenaService: PhenomenaService,
    private datePipe: DatePipe,
    private campaignQuery: CampaignQuery,
    private campaignservice: CampaignService,
    private threadService: ThreadService,
    private threadStore: ThreadStore,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private uiService: UiService,
    private mapService: MapService
  ) {}

  ngOnInit() {
    this.campaignservice.get().subscribe();
    this.phenomena = this.phenomenaService.getPhenomena();
    //Hide menu on the left side
    this.uiService.setFilterVisible(false);
  }

  //zoom to currently selected campaign
  clickToZoom(coordinates: any) {
    this.mapService.zoomMe(coordinates);
  }

  calcDiffDays(event: Date) {
    var diff = Math.abs(new Date(event).getTime() - new Date().getTime());
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  calculateCampaignTimeLeft(event: Date) {
    var diffDays = this.calcDiffDays(event);
    if (diffDays < 14) {
      return `Noch ${diffDays} Tage übrig`;
    } else if (diffDays > 14 && diffDays < 30) {
      const weeks = Math.round(diffDays / 7);
      return `Noch ${weeks} Wochen übrig`;
    } else if (diffDays > 30 && diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return `Noch mehr als ${months} Monate übrig`;
    } else if (diffDays > 365) {
      return `Noch mehr als 1 Jahr übrig`;
    } else return null;
  }

  formatStartdate(event) {
    this.campaignToBeUpdated.startDate = new Date(event);
  }

  formatEnddate(event) {
    this.campaignToBeUpdated.endDate = new Date(event);
  }

  search(event) {
    this.searchedCampaigns$ = this.allCampaigns$.pipe(
      map((campaigns: Campaign[]) =>
        campaigns
          .map((campaign) => campaign)
          .filter((c) => c.title.includes(event) || c.location.includes(event))
      )
    );
  }

  // logFilterObject() {
  //   this.searchedCampaigns$ = this.filter();
  // }

  filter() {
    const true_priorities = Object.keys(this.filterObject.priority).filter(
      (k) => this.filterObject.priority[k] === true
    );

    const true_timeleft = Object.keys(this.filterObject.timeleft).filter(
      (k) => this.filterObject.timeleft[k] === true
    );

    const true_phenomena = Object.keys(this.filterObject.phenomena).filter(
      (k) => this.filterObject.phenomena[k] === true
    );

    const check_timeleft_filter = (c: Campaign) => {
      const filtered: Campaign[] = [];
      true_timeleft.forEach((t) => {
        const timeleft_val = parseInt(t);
        console.log(timeleft_val);
        if (timeleft_val === 14 && this.calcDiffDays(c.endDate) < 14) {
          filtered.push(c);
        }
        if (
          timeleft_val === 30 &&
          this.calcDiffDays(c.endDate) < 30 &&
          this.calcDiffDays(c.endDate) >= 14
        ) {
          filtered.push(c);
        }
      });
      return null;
    };

    const filtered_campaigns = this.allCampaigns$.pipe(
      map(
        (campaigns: Campaign[]) =>
          campaigns
            .map((campaign) => campaign)
            .filter((c) =>
              true_priorities.length > 0
                ? true_priorities.includes(c.priority)
                : c
            )
        // .filter((c) => {
        //   let diff: string | number = this.calcDiffDays(c.endDate);
        //   if (diff < 14) {
        //     diff = "14";
        //   } else if (diff >= 14 && diff < 30) {
        //     diff = "30";
        //   } else if (diff <= 90 && diff > 30) {
        //     diff = "90";
        //   } else if (diff > 90 && diff <= 365) {
        //     diff = "365";
        //   } else if (diff > 365) {
        //     diff = "1000";
        //   }
        //   true_timeleft.length > 0
        //     ? true_timeleft.some((val) => {
        //         val === diff;
        //       })
        //     : c;
        // })
      )
    );

    let filtered_campaigns_length = 0;

    filtered_campaigns.subscribe(
      (result) => (filtered_campaigns_length = result.length)
    );
    if (filtered_campaigns_length === 0) {
      this.searchedCampaigns$ = this.allCampaigns$;
    } else {
      this.searchedCampaigns$ = filtered_campaigns;
    }
  }

  // createThread(campaign: Campaign) {
  //   this.campaignToBeUpdated = { ...campaign };
  //   console.log(this.campaignToBeUpdated._id);
  //   console.log(this.campaignToBeUpdated.title);
  //   this.threadFormActivated = true;
  //   let date = new Date();
  //   console.log(date);
  //   let title = this.campaignToBeUpdated.title + " thread";
  //   console.log(title);
  //   const msg = { content: title };
  //   var xhr = new XMLHttpRequest();
  //   xhr.open("POST", this.whurl, true);
  //   xhr.setRequestHeader("Content-Type", "application/json");
  //   xhr.send(JSON.stringify(msg));

  // this.threadService.createThread(title, date, this.campaignToBeUpdated._id).subscribe(result => {
  //   this.threadStore.update(state => {
  //     console.log(state);

  //     return {
  //       threads :

  //         result

  //     };
  //   });

  //}
  //)
  // }

  // addParticipant(event) {
  //   this.sessionQuery.user$.subscribe(
  //     (result) => (this.currentUser = result.name)
  //   );
  //   this.campaignToBeUpdated.participants.push(this.currentUser);
  // }

  showUpdateForm(campaign: Campaign) {
    this.campaignToBeUpdated = { ...campaign };
    this.isUpdateActivated = true;
  }

  joinCampaign(campaign: Campaign) {
    this.campaignToBeUpdated = { ...campaign };
    this.sessionQuery.user$.subscribe(
      (result) => (this.currentUser = result.name)
    );

    //alert('Follow this link to join the discussion on Slack: https://join.slack.com/t/opensensemapcampaigns/shared_invite/zt-11uz1lkc3-w98lYPWGllA1iZdMVZFNzQ');

    this.campaignToBeUpdated.participants = this.currentUser;
    this.updateCampaignSub = this.campaignservice
      .updateCampaign(this.campaignToBeUpdated._id, this.campaignToBeUpdated)
      .subscribe((result) => console.log(result));
    //this.campaignToBeUpdated = null;
    window.open(
      "https://join.slack.com/t/opensensemapcampaigns/shared_invite/zt-11uz1lkc3-w98lYPWGllA1iZdMVZFNzQ"
    );
  }

  updateCampaign(updateForm) {
    // let sd= updateForm.value.startDate;
    // sd = this.datePipe.transform(sd, 'yyyy-MM-dd');
    // sd = new Date(sd);
    // console.log(sd);
    //console.log(updateForm);
    this.updateCampaignSub = this.campaignservice
      .updateCampaign(this.campaignToBeUpdated._id, updateForm.value)
      .subscribe(
        (result) => console.log(result)
        //console.log(updateForm.value)
      );
    this.isUpdateActivated = false;
    //reset the "Update" button again to non-updating state
    this.view_update = "";
    //this.campaignToBeUpdated = null;
  }

  deleteCampaign(campaignId: string) {
    
    this.deleteCampaignSub = this.campaignservice
      .deleteCampaign(campaignId)
      .subscribe((result) => {
        console.log(result);
      });
  }
}
