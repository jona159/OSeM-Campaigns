import { Injectable } from "@angular/core";

import { Map, NavigationControl } from "mapbox-gl";
import * as mapboxgl from "mapbox-gl";
import * as MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as turf from "@turf/turf";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { environment } from "../../../../environments/environment";
import { UiService } from "src/app/models/ui/state/ui.service";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { UiQuery } from "src/app/models/ui/state/ui.query";

import {
  arrayRemove,
  extractDateSteps,
  positionPopup,
  roundCoordinates,
} from "../box/osem-line-chart/helper/helpers";
import { BoxService } from "src/app/models/box/state/box.service";
import { Router, ActivatedRoute } from "@angular/router";
import { BoxQuery } from "src/app/models/box/state/box.query";
import { map, withLatestFrom } from "rxjs/operators";
import { combineLatest } from "rxjs/internal/observable/combineLatest";
import { FeatureCollection } from "geojson";
import { getAllJSDocTags } from "typescript";

import worldLocalJSONFile from "/src/assets/data/world.json";
import { MapboxDrawStyles } from "./MapboxDrawStyle"; //adding drawing styles
import { CampaignService } from "src/app/models/campaign/campaign.service";
import { CampaignQuery } from "src/app/models/campaign/campaign.query";
import { ClusterService } from "./cluster.service";

@Injectable({
  providedIn: "root",
})
export class MapService {
  map; // the map element (gets initilisaed on page load)
  geocoder;
  draw;
  UserLocation;
  DrawnPolygon;
  DrawnPoint;
  DrawnCentroid;
  Drawnpolygons_null;
  Drawnpoints_null;
  worldLocalJSONData: any = worldLocalJSONFile;
  CampaignPol;
  bbox_campaign;
  Campaign_coord;

  worldData: BehaviorSubject<any>; // all the live Data as geojson, gets pulled on page load
  selectedPheno$ = this.uiQuery.selectSelectedPheno$;

  baseLayer$ = this.uiQuery.select((ent) => ent.baseLayer);
  baseLayerBehaviour$ = new BehaviorSubject<any>(null);
  clusterLayers$ = this.uiQuery.select((ent) => ent.clusterLayers);
  numbers$ = this.uiQuery.selectNumbers$;

  activeBox$ = this.boxQuery.selectActiveId();
  theme$ = this.uiQuery.selectTheme$;
  compareTo$ = this.boxQuery.selectCompareTo$;

  clustering$ = this.uiQuery.selectClustering$;
  selectedDate$ = this.uiQuery.selectSelectedDate$;

  compareModus$ = this.boxQuery.selectCompareModus$;
  compareModus: Boolean = false;

  filters$ = this.uiQuery.selectFilters$;
  allCampaigns$ = this.campaignQuery.selectAll();

  dateRangeData$ = this.boxQuery.selectDateRangeData$;

  dataSub;
  baseLayerSub;
  clusterLayerSub;
  activeBoxSub;
  compareToSub;
  clusteringSub;
  compareModusSub;
  numbersSub;

  clusterMouseleaveFunctionSave;

  mouseLeaveFunction;
  activatePopupTimer;
  deactivatePopupTimer;

  constructor(
    private uiService: UiService,
    private http: HttpClient,
    private uiQuery: UiQuery,
    private boxService: BoxService,
    private boxQuery: BoxQuery,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private campaignService: CampaignService,
    private campaignQuery: CampaignQuery,
    private clusterService: ClusterService
  ) {
    this.worldData = new BehaviorSubject(false);
  }

  // function for zooming into specific campaign
  zoomMe(coordinates: any) {
    this.Campaign_coord = coordinates;
    this.CampaignPol = turf.polygon(JSON.parse(coordinates));
    this.bbox_campaign = turf.bbox(this.CampaignPol);
    this.map.fitBounds([
      [this.bbox_campaign[0], this.bbox_campaign[1]],
      [this.bbox_campaign[2], this.bbox_campaign[3]],
    ]);
    this.map.addSource("selectedCampaignPolygon", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: JSON.parse(coordinates),
        },
      },
    });
    this.map.addLayer({
      id: "selectedPoly",
      type: "fill",
      source: "selectedCampaignPolygon",
      layout: {},
      paint: {
        "fill-color": "#0080ff", // blue color fill
        "fill-opacity": 0.5,
      },
    });
  }

  createCampaignClusters() {
    let clusterData;
    this.allCampaigns$.subscribe((result) => (clusterData = result));
    console.log(clusterData);
    const cluster = this.clusterService.createClusterGeoJSON(clusterData);
    return cluster;
  }

  // initialize the map, TODO: Dynamic start point
  generateMap(elementName) {
    let that = this;

    (mapboxgl as typeof mapboxgl).accessToken = environment.mapbox_token;
    this.map = new Map({
      container: elementName,
      style: "mapbox://styles/mapbox/light-v9",
      center: [13.5, 52.4],
      zoom: 8,
      pitch: 21,
    });

    //GPS LOCATION
    this.UserLocation = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      // When active the map will receive updates to the device's location as it changes.
      trackUserLocation: true,
    });
    // Add geolocate control to the map.
    this.map.addControl(this.UserLocation, "top-left");

    // Add Navigation controls to the map
    this.map.addControl(
      new NavigationControl({
        showCompass: false,
      }),
      "top-left"
    );

    // disable map rotation using right click + drag
    this.map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    this.map.touchZoomRotate.disableRotation();

    //once the map is laoded fetch the data (maybe move this elsewhere for faster load time), TODO: fetch from API not static file
    this.map.once("load", function () {
      that.fetchData("/assets/data/world.json");
    });

    //MOUSE COORDINATES
    this.map.on("mousemove", (e) => {
      document.getElementById("infoCoord").innerHTML = JSON.stringify(
        e.lngLat.wrap(),
        function (key, val) {
          return val.toFixed ? Number(val.toFixed(3)) : val;
        }
      );
    });

    // this.map.on("load", () => {

    // });

    if (this.Campaign_coord) {
      //PLOTTING polygons
      this.map.on("load", () => {
        // Add a data source containing GeoJSON data.
        this.map.addSource("CampPoly", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              // These coordinates outline CampPoly.
              coordinates: this.Campaign_coord,
            },
          },
        });

        // Add a new layer to visualize the polygon.
        this.map.addLayer({
          id: "CampPoly",
          type: "fill",
          source: "CampPoly", // reference the data source
          layout: {},
          paint: {
            "fill-color": "#0080ff", // blue color fill
            "fill-opacity": 0.5,
          },
        });
        // Add a black outline around the polygon.
        this.map.addLayer({
          id: "outline",
          type: "line",
          source: "CampPoly",
          layout: {},
          paint: {
            "line-color": "#000",
            "line-width": 3,
          },
        });
      });
    }
  }

  removeCampaignClusters() {
    this.map.removeLayer("campaignclusters");
    this.map.removeLayer("cluster-count");
    this.map.removeLayer("unclustered-point");
    this.map.removeSource("CampaignClusters"); // remove Source has to be called after removeLayer
  }

  addCampaignClusters() {
    let clusters = this.createCampaignClusters();
    this.map.addSource("CampaignClusters", {
      type: "geojson",
      data: clusters,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    this.map.addLayer({
      id: "campaignclusters",
      type: "circle",
      source: "CampaignClusters",
      filter: ["has", "point_count"],
      paint: {
        // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
        // with three steps to implement three types of circles:
        //   * Blue, 20px circles when point count is less than 100
        //   * Yellow, 30px circles when point count is between 100 and 750
        //   * Pink, 40px circles when point count is greater than or equal to 750
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6",
          100,
          "#f1f075",
          750,
          "#f28cb1",
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
      },
    });
    this.map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "CampaignClusters",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
    });
    this.map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "CampaignClusters",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#11b4da",
        "circle-radius": 4,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    });
    // this.map.addLayer("campaignclusters");
  }

  DrawControlMap() {
    //DRAWING POLYGONS WITH MAPBOX GL DRAW
    this.draw = new MapboxDraw({
      // Instead of showing all the draw tools, show only the line string and delete tools.
      displayControlsDefault: false,
      userProperties: true,
      controls: {
        combine_features: false,
        uncombine_features: false,
        point: true,
        line_string: false,
        polygon: true,
        trash: true,
      },
      //Styles for polygon and points drawn

      styles: MapboxDrawStyles,
    });

    //(12.14.21) GETTING THE DATA FROM LOCAL JSON FILE (See file json-typings.d.ts in app folder and worldLocalJSONData and import worldLocalJSONFile)

    //Creating points from local boxes database
    var pointworldgeoJSON = turf.points(turf.coordAll(this.worldLocalJSONData));

    //POLYGON AREA CALCULATION

    this.map.on("draw.create", updateArea);
    this.map.on("draw.delete", updateArea);
    this.map.on("draw.update", updateArea);

    let that = this;
    function updateArea(e) {
      const data: any = that.draw.getAll();

      const answer = document.getElementById("calculated-area");
      if (data.features.length > 0) {
        const area = turf.area(data);
        // Restrict the area (km2) to 2 decimal points.
        const rounded_area = Math.round(area / 10000) / 100;

        this.Drawnpolygons = data.features.filter(
          (features) => features.geometry.type.toLowerCase() === "polygon"
        );

        this.Drawnpoints = data.features.filter(
          (features) => features.geometry.type.toLowerCase() === "point"
        );
        if (this.Drawnpoints.length == 0) {
          this.Drawnpoints = [];
        }

        this.DrawnCentroid = turf.bbox(data); //turf.bbox(data)

        that.uiService.setSelectedPolygon(
          `${JSON.stringify(this.Drawnpolygons[0].geometry.coordinates)}`
        );
        that.uiService.setSelectedPoint(this.DrawnCentroid);

        //Calculating points within the polygons
        var ptsWithin = turf.pointsWithinPolygon(
          pointworldgeoJSON,
          turf.multiPolygon([[turf.coordAll(data)]])
        );

        //Providing a message for the box
        answer.innerHTML = `<p>
                  <strong>#Points: </strong> ${JSON.stringify(
                    this.Drawnpoints.length
                  )}
                  <strong>#Polygons: </strong> ${JSON.stringify(
                    this.Drawnpolygons.length
                  )}
                  <strong><br>Total area: </strong> ${rounded_area} (km2)
                  <strong><br>#Boxes within the polygon: </strong>
                  ${JSON.stringify(
                    ptsWithin.features.length
                  )} of ${JSON.stringify(
          pointworldgeoJSON.features.length
        )}</p>`;
      } else {
        answer.innerHTML = `'Use the drawing tool to draw on the map'`;

        this.Drawnpolygons_null = "";
        that.uiService.setSelectedPolygon(this.Drawnpolygons_null);

        this.Drawnpoints_null = "";
        that.uiService.setSelectedPoint(this.Drawnpoints_null);
      }
    }

    // add popup to drawn polygon
    this.map.on("click", "this.draw", function (e) {
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML("<b>Hi popup!</b>")
        .addTo(this.map);
    });
  }

  enableFunction() {
    this.map.addControl(this.draw, "top-left");
  }

  disableFunction() {
    if (this.draw) {
      this.map.removeControl(this.draw);
    }
  }

  //#ORIGINAL

  // fetch the data and add the sources when its done
  fetchData(url) {
    this.http.get(url).subscribe((res) => {
      this.worldData.next(res);
      this.addMapSources();
    });
  }

  //adds the map sources for cluster and no cluster layers
  addMapSources() {
    let that = this;

    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }

    // subscribes to the Pheno, Filter and Date selection to update the sources accordingly, subscribes to Layers once sources are done
    this.dataSub = combineLatest(
      this.selectedPheno$,
      this.filters$,
      this.dateRangeData$
    ).subscribe((res) => {
      // console.log("DATASUB", res)
      if (res[0]) {
        let filteredData;
        if (res[0].title === "ALL") {
          filteredData = this.filterData(
            this.worldData.getValue(),
            false,
            res[1]
          );
        } else {
          filteredData = this.filterData(
            this.worldData.getValue(),
            res[0].title,
            res[1]
          );
        }
        if (this.map.getLayer("boxes-cluster")) {
          this.map.removeLayer("boxes-no-cluster");
          this.map.removeLayer("boxes-cluster");
          this.map.removeLayer("cluster-number-layer");
          this.map.removeLayer("no-cluster-number");
        }
        if (this.map.getSource("cluster-boxes")) {
          this.map.removeSource("cluster-boxes");
        }
        if (!this.map.getSource("boxes")) {
          this.map.addSource("boxes", {
            type: "geojson",
            data: filteredData,
          });
          // console.log("addsource")
        } else {
          // console.log("changeSource")
          if (res[2]) {
            // console.log("RES2", res[2])
            this.map.getSource("boxes").setData(res[2]);
          } else {
            // console.log("filteredData", filteredData)
            this.map.getSource("boxes").setData(filteredData);
          }
        }
        this.map.addSource("cluster-boxes", {
          type: "geojson",
          data: filteredData,
          cluster: true,
          clusterRadius: 65,
          clusterProperties: {
            [res[0].title]: [
              "+",
              [
                "case",
                [
                  "!=",
                  null,
                  [
                    "get",
                    res[0].title,
                    ["object", ["get", "live", ["object", ["get", "sensors"]]]],
                  ],
                ],
                [
                  "get",
                  res[0].title,
                  ["object", ["get", "live", ["object", ["get", "sensors"]]]],
                ],
                null,
              ],
            ],
          },
        });
      }
      // when the sources are added subscribe to the selected Pheno for the displaying of the right layers
      this.map.once("sourcedata", function () {
        that.subscribeToLayers();
      });
    });
  }

  //subscribes to the layers in the ui-service.
  subscribeToLayers() {
    if (this.baseLayerSub) {
      this.baseLayerSub.unsubscribe();
      this.clusterLayerSub.unsubscribe();
      this.activeBoxSub.unsubscribe();
      this.compareToSub.unsubscribe();
      this.clusteringSub.unsubscribe();
      this.compareModusSub.unsubscribe();
      this.numbersSub.unsubscribe();
    }

    let that = this;
    // console.log("SUBSCRIBE HERE")
    this.baseLayerSub = this.baseLayer$.subscribe((res) => {
      // console.log("LAYER TO DRAW:",res)
      this.baseLayerBehaviour$.next(res);
      that.drawBaseLayer(res);
    });

    this.clusterLayerSub = this.clusterLayers$.subscribe((res) => {
      that.drawClusterLayers(res);
    });

    this.activeBoxSub = this.activeBox$
      .pipe(withLatestFrom(this.theme$))
      .subscribe((res) => {
        if (res) this.updateActiveLayer(res[0], res[1]);
      });

    this.compareToSub = this.compareTo$
      .pipe(withLatestFrom(this.theme$))
      .subscribe((res) => {
        if (res.length > 0) this.updateActiveLayerCompare(res[0], res[1]);
      });
    this.clusteringSub = this.clustering$
      .pipe(withLatestFrom(this.selectedDate$))
      .subscribe((res) => {
        this.setClustering(res[0], res[1]);
      });

    this.compareModusSub = this.compareModus$
      .pipe(withLatestFrom(this.compareTo$))
      .subscribe((res) => {
        this.compareModus = res[0];
        if (this.map && this.map.getLayer("base-layer")) {
          if (res[0]) {
            this.map.off(
              "mouseenter",
              "base-layer",
              this.baseMouseenterFunction
            );
            this.map.off("click", "base-layer", this.baseClickFunction);
            this.map.on(
              "mouseenter",
              "base-layer",
              this.compareMouseenterFunction
            );
            this.map.on("click", "base-layer", this.compareClickFunction);

            this.map.off(
              "mouseenter",
              "boxes-no-cluster",
              this.baseMouseenterFunction
            );
            this.map.off("click", "boxes-no-cluster", this.baseClickFunction);
            this.map.on(
              "mouseenter",
              "boxes-no-cluster",
              this.compareMouseenterFunction
            );
            this.map.on("click", "boxes-no-cluster", this.compareClickFunction);
          } else {
            this.map.off("click", "base-layer", this.compareClickFunction);
            this.map.off(
              "mouseenter",
              "base-layer",
              this.compareMouseenterFunction
            );
            this.map.on(
              "mouseenter",
              "base-layer",
              this.baseMouseenterFunction
            );
            this.map.on("click", "base-layer", this.baseClickFunction);

            this.map.off(
              "click",
              "boxes-no-cluster",
              this.compareClickFunction
            );
            this.map.off(
              "mouseenter",
              "boxes-no-cluster",
              this.compareMouseenterFunction
            );
            this.map.on(
              "mouseenter",
              "boxes-no-cluster",
              this.baseMouseenterFunction
            );
            this.map.on("click", "boxes-no-cluster", this.baseClickFunction);
          }

          if (res[1].length > 0) {
            this.map.setFilter("active-layer", [
              "match",
              ["get", "_id"],
              res[1],
              true,
              false,
            ]);
          }
        }
      });

    this.numbersSub = this.numbers$.subscribe((res) => {
      if (this.map && this.map.getLayer("number-layer")) {
        this.map.setLayoutProperty(
          "number-layer",
          "visibility",
          res ? "visible" : "none"
        );
      }
    });

    // this.dateRangeData$.subscribe(res => {
    //   if(res){
    //     // if(!this.map.getSource('date-range-boxes')){
    //     //   this.map.addSource('date-range-boxes', {
    //     //     'type': 'geojson',
    //     //     'data': res,
    //     //   });
    //     //   let layer = this.map.getLayer('base-layer');
    //     //   this.map.removeLayer('base-layer');
    //     //   layer.source = 'date-range-boxes';
    //     //   layer.id = "date-range"
    //     //   delete layer.minzoom;
    //     //   delete layer.maxzoom;
    //     //   this.map.addLayer(layer);
    //     // } else {
    //     // }
    //     // console.log("setting data")
    //     // console.log(res);
    //     this.map.getSource('boxes').setData(res);
    //     // this.map.setLayerSource('base-layer', 'dataRangeBoxes')
    //   } else {
    //     // this.map.getSource('boxes').setData();

    //   }
    // })
  }

  initLayersWithoutSub() {
    this.drawBaseLayer(this.baseLayerBehaviour$.getValue());
  }

  drawBaseLayer(layer) {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer);

      if (this.map.getLayer("active-layer-text"))
        this.map.moveLayer(layer.id, "active-layer-text");
    } else {
      this.map.setPaintProperty(
        layer.id,
        "circle-color",
        layer.paint["circle-color"]
      );

      if (layer.filter) {
        this.map.setFilter(layer.id, layer.filter);
      } else {
        this.map.setFilter(layer.id);
      }
    }
    if (!this.map.getLayer("number-layer")) {
      this.addNumberLayer();
      this.addPopup("base-layer");
    }
    if (layer.paint["circle-color"]) {
      this.map.setPaintProperty(
        "number-layer",
        "text-color",
        layer.paint["circle-color"]
      );
      this.map.setLayoutProperty(
        "number-layer",
        "text-field",
        layer.paint["circle-color"][2]
      );
    }
  }

  drawClusterLayers(layers) {
    if (this.map.getSource("cluster-boxes")) {
      layers.forEach((layer) => {
        if (!this.map.getLayer(layer.id)) {
          if (this.map.getLayer("active-layer-text")) {
            this.map.addLayer(layer, "active-layer-text");
          } else {
            this.map.addLayer(layer);
          }
        } else {
          this.map.setPaintProperty(
            layer.id,
            "circle-color",
            layer.paint["circle-color"]
          );

          if (layer.filter) {
            this.map.setFilter(layer.id, layer.filter);
          } else {
            this.map.setFilter(layer.id);
          }
          if (layer.layout && layer.layout.visibility) {
            this.map.setLayoutProperty(
              layer.id,
              "visibility",
              layer.layout.visibility
            );
          }
        }
      });

      if (!this.map.getLayer("cluster-number-layer")) {
        this.addClusterNumberLayers(layers);
        this.addHoverCluster(
          "boxes-cluster",
          layers[1]["paint"]["circle-color"]
        );
        this.addPopup("boxes-no-cluster");
        this.addClusterClickFunction(layers[0].id);
      }

      let textField = [
        "concat",
        [
          "/",
          [
            "round",
            [
              "*",
              [
                "/",
                ["get", layers[0].paint["circle-color"][2][1][1]],
                ["get", "point_count"],
              ],
              100,
            ],
          ],
          100,
        ],
        "",
      ];
      this.map.setPaintProperty(
        "no-cluster-number",
        "text-color",
        layers[0].paint["circle-color"]
      );
      this.map.setLayoutProperty(
        "cluster-number-layer",
        "text-field",
        textField
      );
      this.map.setLayoutProperty(
        "no-cluster-number",
        "text-field",
        layers[1].paint["circle-color"][2]
      );
    }
  }

  //ACTIVE LAYERS
  updateActiveLayer(id, theme) {
    if (id !== undefined) {
      let paint;
      if (theme === "dark") {
        paint = {
          "text-color": "#f6f6f6",
          "text-halo-blur": 4,
          "text-halo-color": "#383838",
          "text-halo-width": 1,
        };
      } else {
        paint = {
          "text-color": "#383838",
          "text-halo-blur": 4,
          "text-halo-color": "#f6f6f4",
          "text-halo-width": 1,
        };
      }
      if (!this.map.getLayer("active-layer")) {
        this.map.addLayer({
          id: "active-layer-text",
          type: "symbol",
          source: "boxes",
          filter: ["==", id, ["get", "_id"]],
          paint: paint,
          layout: {
            "text-field": ["format", ["get", "name"], { "font-scale": 1.2 }],
            "text-variable-anchor": ["top"],
            "text-offset": {
              stops: [
                [1, [0, 0.3]],
                [8, [0, 0.8]],
                [16, [0, 1.8]],
                [22, [0, 10]],
                [25, [0, 40]],
              ],
            },
            // "text-font": [
            //   "DIN Offc Pro Medium",
            //   "Arial Unicode MS Bold"
            // ],
            "text-size": 18,
          },
        });
        this.map.addLayer(
          {
            id: "active-layer",
            type: "circle",
            source: "boxes",
            filter: ["==", id, ["get", "_id"]],
            paint: {
              "circle-radius": {
                base: 1.75,
                stops: [
                  [1, 10],
                  [22, 580],
                ],
              },
              "circle-blur": 0.6,
              // 'circle-stroke-width': 1,
              "circle-opacity": 0.6,
              "circle-color": theme === "dark" ? "#ffffff" : "#383838",
            },
          },
          "base-layer"
        );
      } else {
        this.map.setFilter("active-layer", ["==", id, ["get", "_id"]]);
        this.map.setFilter("active-layer-text", ["==", id, ["get", "_id"]]);
      }
    }
  }

  updateActiveLayerCompare(data, theme) {
    if (data.length > 0) {
      let paint;
      if (theme === "dark") {
        paint = {
          "text-color": "#f6f6f6",
          "text-halo-blur": 4,
          "text-halo-color": "#383838",
          "text-halo-width": 1,
        };
      } else {
        paint = {
          "text-color": "#383838",
          "text-halo-blur": 4,
          "text-halo-color": "#f6f6f4",
          "text-halo-width": 1,
        };
      }
      if (!this.map.getLayer("active-layer")) {
        this.map.addLayer({
          id: "active-layer-text",
          type: "symbol",
          source: "boxes",
          filter: ["match", ["get", "_id"], data, true, false],
          paint: paint,
          layout: {
            "text-field": ["format", ["get", "name"], { "font-scale": 1.2 }],
            "text-variable-anchor": ["top"],
            "text-offset": {
              stops: [
                [1, [0, 0.3]],
                [8, [0, 0.8]],
                [16, [0, 1.8]],
                [22, [0, 10]],
                [25, [0, 40]],
              ],
            },
            // "text-font": [
            //   "DIN Offc Pro Medium",
            //   "Arial Unicode MS Bold"
            // ],
            "text-size": 18,
          },
        });
        this.map.addLayer(
          {
            id: "active-layer",
            type: "circle",
            source: "boxes",
            filter: ["match", ["get", "_id"], data, true, false],
            paint: {
              "circle-radius": {
                base: 1.75,
                stops: [
                  [1, 10],
                  [22, 580],
                ],
              },
              "circle-blur": 0.6,
              // 'circle-stroke-width': 1,
              "circle-opacity": 0.6,
              "circle-color": theme === "dark" ? "#ffffff" : "#383838",
            },
          },
          "base-layer"
        );
      } else {
        this.map.setFilter("active-layer-text", [
          "match",
          ["get", "_id"],
          data,
          true,
          false,
        ]);
        this.map.setFilter("active-layer", [
          "match",
          ["get", "_id"],
          data,
          true,
          false,
        ]);
      }
    }
  }

  // NUMBER LAYERS
  addNumberLayer() {
    this.map.addLayer(
      {
        id: "number-layer",
        type: "symbol",
        source: "boxes",
        paint: {
          "text-color": [
            "interpolate",
            ["linear"],
            [
              "get",
              "Temperatur",
              ["object", ["get", "live", ["object", ["get", "sensors"]]]],
            ],
            -5,
            "#9900cc",
            0,
            "#0000ff",
            10,
            "#0099ff",
            20,
            "#ffff00",
            30,
            "#ff0000",
          ],
        },
        layout: {
          visibility: "visible",
          "text-field": "",
          "text-variable-anchor": ["bottom"],
          "text-offset": {
            stops: [
              [1, [0, 0.3]],
              [8, [0, 0.8]],
              [16, [0, 1.8]],
              [22, [0, 10]],
              [25, [0, 40]],
            ],
          },
          "text-size": 15,
        },
      },
      "base-layer"
    );
  }

  addClusterNumberLayers(layers) {
    var insertBeforeActiveLLayer = false;
    if (this.map.getLayer("active-layer-text")) {
      insertBeforeActiveLLayer = true;
    }
    this.map.addLayer(
      {
        id: "cluster-number-layer",
        type: "symbol",
        source: "cluster-boxes",
        filter: ["has", "point_count"],
        //     'all',
        //     // ["get", "Temperatur", ["object", ["get", "live"]]],
        //     // ['==', ['get', 'cluster'], true]
        //     ['has', 'point_count']
        //   ],
        paint: {
          "text-color": "white",
        },
        layout: {
          visibility:
            layers[0].layout && layers[0].layout.visibility
              ? layers[0].layout.visibility
              : "visible",
          "text-field": [
            "concat",
            [
              "/",
              [
                "round",
                [
                  "*",
                  ["/", ["get", "Temperatur"], ["get", "point_count"]],
                  100,
                ],
              ],
              100,
            ],
            "",
          ],
          "text-size": 15,
          "text-font": ["Montserrat Bold", "Arial Unicode MS Bold"],
        },
      },
      insertBeforeActiveLLayer ? "active-layer-text" : null
    );

    this.map.addLayer({
      id: "no-cluster-number",
      type: "symbol",
      source: "cluster-boxes",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "text-color": [
          "interpolate",
          ["linear"],
          [
            "get",
            "Temperatur",
            ["object", ["get", "live", ["object", ["get", "sensors"]]]],
          ],
          -5,
          "#9900cc",
          0,
          "#0000ff",
          10,
          "#0099ff",
          20,
          "#ffff00",
          30,
          "#ff0000",
        ],
      },
      layout: {
        visibility:
          layers[0].layout && layers[0].layout.visibility
            ? layers[0].layout.visibility
            : "visible",
        "text-field": [
          "get",
          "Temperatur",
          ["object", ["get", "live", ["object", ["get", "sensors"]]]],
        ],
        "text-variable-anchor": ["bottom"],
        "text-offset": {
          stops: [
            [1, [0, 0.3]],
            [8, [0, 0.8]],
            [16, [0, 1.8]],
            [22, [0, 10]],
            [25, [0, 40]],
          ],
        },
        "text-size": 15,
      },
    });
  }

  //CLUSTERING
  setClustering(clustering, date) {
    if (this.map.getLayer("base-layer")) {
      this.map.setLayoutProperty(
        "base-layer",
        "visibility",
        clustering ? "none" : "visible"
      );
      this.map.setLayoutProperty(
        "number-layer",
        "visibility",
        clustering ? "none" : "visible"
      );
    }
    if (this.map.getLayer("boxes-cluster")) {
      if (date) {
        //   this.map.setLayoutProperty('boxes-no-cluster'+date.toISOString(), 'visibility', clustering ? 'visible' : 'none' );
        //   this.map.setLayoutProperty('cluster'+date.toISOString(), 'visibility', clustering ? 'visible' : 'none' );
        //   this.map.setLayoutProperty('cluster-number-layer'+date.toISOString(), 'visibility', clustering ? 'visible' : 'none' );
        //   this.map.setLayoutProperty('no-cluster-number'+date.toISOString(), 'visibility', clustering ? 'visible' : 'none' );
      } else {
        this.map.setLayoutProperty(
          "boxes-no-cluster",
          "visibility",
          clustering ? "visible" : "none"
        );
        this.map.setLayoutProperty(
          "boxes-cluster",
          "visibility",
          clustering ? "visible" : "none"
        );
        this.map.setLayoutProperty(
          "cluster-number-layer",
          "visibility",
          clustering ? "visible" : "none"
        );
        this.map.setLayoutProperty(
          "no-cluster-number",
          "visibility",
          clustering ? "visible" : "none"
        );
      }
    }
  }

  //MOUSE FUNCTIONS
  clusterMouseoverFunction = (e) => {
    if (e.features.length > 0) {
      this.map.getCanvas().style.cursor = "pointer";

      let layer = e.features[0].layer.id;
      let that = this;
      let features = this.map.queryRenderedFeatures(e.point, {
        layers: [layer],
      });
      let clusterId = features[0].properties.cluster_id,
        point_count = features[0].properties.point_count,
        clusterSource = this.map.getSource(this.map.getLayer(layer).source);

      // Get all points under a cluster
      clusterSource.getClusterLeaves(
        clusterId,
        point_count,
        0,
        function (err, aFeatures) {
          //MAKE LAYER+SOURCE AND ADD TO MAP
          that.map.getSource("cluster-hover").setData({
            type: "FeatureCollection",
            features: aFeatures,
          });
        }
      );
    }
  };

  clusterMouseleaveFunction = (e) => {
    this.map.getCanvas().style.cursor = "";
    this.map.getSource("cluster-hover").setData({
      type: "FeatureCollection",
      features: [],
    });
  };

  baseMouseenterFunction = (e) => {
    clearTimeout(this.deactivatePopupTimer);
    this.map.getCanvas().style.cursor = "pointer";
    // let box = e.features[0].properties;

    this.uiService.setCluster(null);
    // var coordinates = e.features[0].geometry.coordinates.slice();
    // let pixelPosition = this.map.project(coordinates);

    // this.boxService.setPopupBox({ ...box, sensors: JSON.parse(e.features[0].properties.sensors) });

    // positionPopup(pixelPosition);
  };

  addHoverCluster(layer, circleColor) {
    if (!this.map.getSource("cluster-hover")) {
      this.map.addSource("cluster-hover", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      this.map.addLayer(
        {
          id: "cluster-hover-layer",
          type: "circle",
          source: "cluster-hover",
          paint: {
            "circle-radius": {
              base: 1.75,
              stops: [
                [1, 6],
                [22, 580],
              ],
            },
            "circle-opacity": 0.4,
            "circle-color": "black",
          },
        },
        "boxes-cluster"
      );
    }
    if (circleColor)
      this.map.setPaintProperty(
        "cluster-hover-layer",
        "circle-color",
        circleColor
      );

    this.clusterMouseleaveFunctionSave =
      this.clusterMouseleaveFunction.bind(this);
    this.map.on("mouseenter", layer, this.clusterMouseoverFunction);
    this.map.on("mouseleave", layer, this.clusterMouseleaveFunctionSave);
  }

  mouseLeave() {
    this.map.getCanvas().style.cursor = "";
    this.boxService.setPopupBox(null);
  }

  //function to keep popup activated of users hovers the popup
  mouseEnterPopup(box) {
    this.boxService.setPopupBox(box);
  }

  //function called when the mouse leaves the popup
  mouseLeavePopup() {
    this.boxService.setPopupBox(null);
  }

  addClickFuntion(layer) {
    this.map.on("click", layer, this.baseClickFunction);
  }
  addClusterClickFunction(layer) {
    this.map.on("click", layer, this.clusterClickFunction);
  }

  baseClickFunction = (e) => {
    // if (e.features.length > 0) {
    //   this.router.navigate(['/explore/' + e.features[0].properties._id], {
    //     relativeTo: this.activatedRoute,
    //     queryParamsHandling: 'merge'
    //   });
    // }
    clearTimeout(this.deactivatePopupTimer);
    this.map.getCanvas().style.cursor = "pointer";
    var coordinates = e.features[0].geometry.coordinates.slice();
    let pixelPosition = this.map.project(coordinates);
    let box = e.features[0].properties;
    // this.uiService.setCluster(null);
    this.boxService.setPopupBox({
      ...box,
      sensors: e.features[0].properties.sensors
        ? JSON.parse(e.features[0].properties.sensors)
        : null,
    });

    positionPopup(pixelPosition);
  };
  clusterClickFunction = (e) => {
    this.map.getCanvas().style.cursor = "pointer";

    let that = this;
    let layer = e.features[0].layer.id;
    let coordinates = e.features[0].geometry.coordinates.slice();
    let pixelPosition = this.map.project(coordinates);
    let clusterSource = this.map.getSource(this.map.getLayer(layer).source);
    let clusterId = e.features[0].properties.cluster_id,
      point_count = e.features[0].properties.point_count;

    // Get all points under a cluster
    clusterSource.getClusterLeaves(
      clusterId,
      point_count,
      0,
      function (err, aFeatures) {
        that.uiService.setCluster(aFeatures);
      }
    );

    positionPopup(pixelPosition);
  };

  compareClickFunction = (e) => {
    if (e.features.length > 0) {
      var coordinates = e.features[0].geometry.coordinates.slice();

      let box = e.features[0].properties;
      if (e.features[0].properties.sensors) {
        this.boxService.setPopupBox({
          ...box,
          sensors: JSON.parse(e.features[0].properties.sensors),
        });
      } else {
        this.boxService.setPopupBox({ ...box, sensors: [] });
      }
      let pixelPosition = this.map.project(coordinates);

      positionPopup(pixelPosition);

      //CODE TO ADD BOX TO COMPARE DIRECTLY ON MARKER CLICK (using popup atm, so not needed)
      // let newIds = [];
      // if (this.activatedRoute.snapshot.queryParams.id) {
      //   if (Array.isArray(this.activatedRoute.snapshot.queryParams.id)) {
      //     if (this.activatedRoute.snapshot.queryParams.id.indexOf(e.features[0].properties._id) != -1) {
      //       newIds = arrayRemove(this.activatedRoute.snapshot.queryParams.id, e.features[0].properties._id)
      //     } else {
      //       newIds = [...this.activatedRoute.snapshot.queryParams.id, e.features[0].properties._id]
      //     }
      //   } else {
      //     if (this.activatedRoute.snapshot.queryParams.id === e.features[0].properties._id) {
      //       newIds = []
      //     } else {
      //       newIds = [this.activatedRoute.snapshot.queryParams.id, e.features[0].properties._id]
      //     }
      //   }
      // }
      // this.router.navigate(
      //   [],
      //   {
      //     relativeTo: this.activatedRoute,
      //     queryParams: { id: newIds },
      //     queryParamsHandling: 'merge'
      //   }
      // );
    }
  };

  compareMouseenterFunction = (e) => {
    this.map.getCanvas().style.cursor = "pointer";
    // var coordinates = e.features[0].geometry.coordinates.slice();

    // let box = e.features[0].properties;
    // this.boxService.setPopupBox({ ...box, sensors: JSON.parse(e.features[0].properties.sensors) });
    // let pixelPosition = this.map.project(coordinates);

    // positionPopup(pixelPosition);
  };

  // Popups

  addPopup(layer) {
    let that = this;
    this.map.on("mouseenter", layer, function (e) {
      that.activatePopupTimer = setTimeout(function () {
        that.baseMouseenterFunction(e);
      }, 100);
    });

    //this needs to be done like this so the reference to mouseLeaveFunction stays the same across the app
    if (!this.mouseLeaveFunction)
      this.mouseLeaveFunction = this.mouseLeave.bind(this);
    this.map.on("mouseleave", layer, this.mouseLeaveFunction);
  }

  filterByProperty(data, property) {
    let filteredData = data["features"].filter((res) => {
      if (
        res["properties"]["sensors"]["live"] &&
        res["properties"]["sensors"]["live"][property]
      ) {
        return res;
      }
    });
    return { type: "FeatureCollection", features: filteredData };
  }

  filterData(data, property, filter) {
    let filteredData = data["features"].filter((res) => {
      if (filter.ids) {
        if (filter.ids.indexOf(res["properties"]["_id"]) === -1) {
          return false;
        }
      }
      if (filter.model.length > 0) {
        if (filter.model.indexOf(res["properties"]["model"]) === -1) {
          return false;
        }
      }
      if (
        (filter.exposure === "all" ||
          filter.exposure === res["properties"]["exposure"]) &&
        // (filter.model.length === 0 || filter.model.indexOf(res['properties']['model'] != -1)) &&
        (filter.group === null || filter.group === res.group)
      ) {
      } else {
        return;
      }
      if (property) {
        if (
          res["properties"]["sensors"]["live"] &&
          res["properties"]["sensors"]["live"][property]
        ) {
          return res;
        }
      } else {
        return res;
      }
    });
    return { type: "FeatureCollection", features: filteredData };
  }

  // THEMING
  setThemeDark(dateRange) {
    if (this.baseLayerSub) {
      this.baseLayerSub.unsubscribe();
      this.clusterLayerSub.unsubscribe();
      this.activeBoxSub.unsubscribe();
      this.compareToSub.unsubscribe();
      this.clusteringSub.unsubscribe();
      this.compareModusSub.unsubscribe();
      this.numbersSub.unsubscribe();
    }

    let that = this;
    if (dateRange) {
      let steps = extractDateSteps(dateRange);
      steps.forEach((step) => {
        this.map.off(
          "mouseleave",
          "boxes-no-cluster" + step.toISOString(),
          this.mouseLeaveFunction
        );
      });
    }
    this.map.off("mouseleave", "base-layer", this.mouseLeaveFunction);
    this.map.off("mouseleave", "boxes-no-cluster", this.mouseLeaveFunction);
    // this.boxService.setMapInit(false);
    // this.boxService.setDataInit(false);
    this.uiService.updateBaseLayer({
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [1, 5],
            [22, 200],
          ],
        },
        "circle-stroke-width": 0,
        "circle-blur": 0.8,
      },
    });
    this.map.setPaintProperty("active-layer-text", "text-color", "white");
    this.map.setPaintProperty(
      "active-layer-text",
      "text-halo-color",
      "#383838"
    );
    this.map.setPaintProperty("active-layer", "circle-color", "#ffffff");
    this.map.setStyle("mapbox://styles/mapbox/dark-v9");

    this.map.once("styledata", function () {
      setTimeout(() => {
        that.addMapSources();
        // that.initLayersWithoutSub();
      }, 1000);
      // that.subscribeToLayers();
      // that.addMapSources();
      // that.map.once('sourcedata', function(){
      //   that.subscribeToLayers();
      // });
    });
  }

  setThemeLight(dateRange) {
    if (this.baseLayerSub) {
      this.baseLayerSub.unsubscribe();
      this.clusterLayerSub.unsubscribe();
      this.activeBoxSub.unsubscribe();
      this.compareToSub.unsubscribe();
      this.clusteringSub.unsubscribe();
      this.compareModusSub.unsubscribe();
      this.numbersSub.unsubscribe();
    }

    let that = this;
    if (dateRange) {
      let steps = extractDateSteps(dateRange);
      steps.forEach((step) => {
        this.map.off(
          "mouseleave",
          "boxes-no-cluster" + step.toISOString(),
          this.mouseLeaveFunction
        );
      });
    }
    this.map.off("mouseleave", "base-layer", this.mouseLeaveFunction);
    this.map.off("mouseleave", "boxes-no-cluster", this.mouseLeaveFunction);
    // this.boxService.setMapInit(false);
    // this.boxService.setDataInit(false);
    this.uiService.updateBaseLayer({
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [1, 5],
            [22, 200],
          ],
        },
        "circle-stroke-width": 1,
        "circle-blur": 0,
      },
    });
    this.map.setPaintProperty("active-layer-text", "text-color", "#383838");
    this.map.setPaintProperty(
      "active-layer-text",
      "text-halo-color",
      "#f6f6f6"
    );
    this.map.setPaintProperty("active-layer", "circle-color", "#383838");
    this.map.setStyle("mapbox://styles/mapbox/light-v9");

    this.map.once("styledata", function () {
      setTimeout(() => {
        that.addMapSources();
        // that.initLayersWithoutSub();
      }, 1000);

      // that.addMapSources();
      // that.map.once('sourcedata', function(){
      //   that.subscribeToLayers();
      // });
    });
  }

  getBounds() {
    return this.map.getBounds().toArray();
  }
  fitBounds(bbox) {
    this.map.fitBounds(bbox);
  }

  hideAllBaseLayers() {
    if (this.map.getLayer("base-layer")) {
      this.map.setLayoutProperty("base-layer", "visibility", "none");
      this.map.setLayoutProperty("number-layer", "visibility", "none");
      this.map.setLayoutProperty("boxes-no-cluster", "visibility", "none");
      this.map.setLayoutProperty("boxes-cluster", "visibility", "none");
      this.map.setLayoutProperty("cluster-number-layer", "visibility", "none");
      this.map.setLayoutProperty("no-cluster-number", "visibility", "none");
    }
  }

  flyTo(coordinates) {
    this.map.flyTo({ center: coordinates, zoom: 13 });
  }

  // reactivateBaseLayer(){
  //   this.drawClusterLayers(this.clusterLayers, this.map, null);
  //   this.setClustering(clustering, null);
  // }

  // countFeaturesInBbox(){
  //   console.log(this.getBounds().toArray());
  //   // const features = this.map.queryRenderedFeatures(this.getBounds().toArray(), { layers: ['boxes-cluster', 'base-layer'] })
  //   const features = this.map.queryRenderedFeatures([[0,0],[180,180]], { layers: ['boxes-cluster', 'base-layer'] })
  //   console.log(features)
  // }
}
function worldLocalJSONData(worldLocalJSONData: any) {
  throw new Error("Function not implemented.");
}

function control(control: any) {
  throw new Error("Function not implemented.");
}
function JSONObject(coordinates: any): turf.helpers.Position[][] {
  throw new Error("Function not implemented.");
}
