 import { Injectable, EventEmitter, ChangeDetectorRef } from '@angular/core';
 import { ID } from '@datorama/akita';
 import { NotificationsStore } from './notifications.store';
 import { NotificationsQuery } from './notifications.query';
 import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
 import { environment } from '../../../environments/environment';
 import { Router } from '@angular/router';
 import { Observable } from 'rxjs/internal/Observable';
 import { catchError } from 'rxjs/operators';

 @Injectable({ providedIn: 'root' })
 export class NotificationsService {

   AUTH_API_URL = environment.api_url;

   public postError: EventEmitter<HttpErrorResponse> = new EventEmitter<HttpErrorResponse>();
   public messageToUser: string;
  
   websocket;

   constructor(
     private notificationsStore: NotificationsStore,
     private notificationsQuery: NotificationsQuery,
     private router: Router,
     private http: HttpClient
   ) { }


   async createCampaignNotification() {
    let newNotification = {
      type: "campaign",
      content: "content"
    };

    this.notificationsStore.update(state => ({
      ...state,
      notifications: (typeof state.notifications != "undefined") ? [newNotification].concat(state.notifications) : [newNotification]
    }));
    
  }
  unreadFalse() {
    this.notificationsStore.update(state => ({
      ...state,
      unread: false
    }));
  }

}

