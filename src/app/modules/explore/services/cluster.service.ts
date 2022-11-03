import { Injectable } from "@angular/core";
import * as turf from "@turf/turf";

@Injectable({
  providedIn: "root",
})
export class ClusterService {
  constructor() {}
  createClusterGeoJSON(data) {
    let geojson = data.map((campaign) => {
      let turf_polygon = turf.polygon(JSON.parse(campaign.polygonDraw));
      let center_point = turf.pointOnFeature(turf_polygon);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            center_point.geometry.coordinates[0],
            center_point.geometry.coordinates[1],
          ],
        },
        properties: {
          title: campaign.title,
          polygonDraw: campaign.polygonDraw,
          description: campaign.description,
          priority: campaign.priority,
          location: campaign.location,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          phenomena: campaign.phenomena,
        },
      };
    });
    geojson = {
      type: "FeatureCollection",
      features: geojson,
    };
    return geojson;
  }
}
