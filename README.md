# Campaigning functionality addon

This repository hosts added functionality for creating collaborative measurement campaigns. It is fork from original repository made by OpenSenseMap. Needs to be run together with backend API openSenseMap-X which is available from sensebox as well. Instructions for running repository are below.

## New campaign

New campaign can be created after user logged in. Button is available on the right side menu buttom. This provides user with many different options which all need to be filled up in order for user to be able to create campaign.
![](/readme_images/create_campaign.PNG)

## Ongoing campaigns

Ongoing campaigns can be found in the same right menu, by clicking on "Ongoing campaigns". User can either edit his own campaign or just have and overiview of other campaigns.

## E-mail notification

In the process of creating new campaign, user is prompted to select area of interest by clicking on map. Chosen points will be used to create polygon, and all existing senseBox users who's senseBox is located in this polygon will receive an email notification asking them to join this campaign.

## Slack forum

By clicking to join to this campaign, user is taken to Slack dedicated channel for this specific campaign.

-----------------------------------------
# OpenSenseMapX

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.12.

## Development server

Run `npm install` or `yarn install`
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

You will need an [openSenseMap-api](https://github.com/sensebox/opensensemap-api) running to test this locally (or run it against the testing api: https://api.testing.opensensemap.org)

## Packages used

[Bulma](https://bulma.io/) Is used as the css framework for this application.

[Akita](https://datorama.github.io/akita/) is used as the state management pattern.

[MapboxGLJS](https://www.mapbox.com/mapbox-gljs) is used for all the map functions.

[ngx-translate](http://www.ngx-translate.com/) is used for i18n support.

[ngx-charts](https://github.com/swimlane/ngx-charts) for pretty charts.


## Thanks to

[PrototypeFund](https://prototypefund.de/) for funding the initial development of this platform.

[University Münster](https://www.uni-muenster.de/de/) and the [IFGI](https://www.uni-muenster.de/Geoinformatics/) for continously supporting this project.



## License

[MIT](LICENSE) - Umut Tas 2021 
