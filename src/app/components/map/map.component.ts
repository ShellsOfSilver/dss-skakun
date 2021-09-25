import { AfterViewInit, Component } from '@angular/core';

import { MatButtonToggleChange } from '@angular/material/button-toggle';

import { combineLatest, Observable } from 'rxjs';

import * as L from 'leaflet';
import * as polyline from 'polyline';

import { DSSService } from '../../services/dss.service';
import { DSSData, PAGE_NAME } from '../../models/dss';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {

  map!: L.Map;
  dssData!: Observable<DSSData>;
  markers: Array<L.Marker>;
  pLineGroup: Array<L.Polyline>;

  constructor(
    private dssService: DSSService,
  ) {
    this.markers = [];
    this.pLineGroup = [];
  }

  private clearPLineGroup() {
    if (this.pLineGroup.length) {
      this.pLineGroup.forEach(marker => {
        marker.remove();
      });

      this.pLineGroup = [];
    }
  }

  private clearMarkers() {
    if (this.markers.length) {
      this.markers.forEach(marker => {
        marker.remove();
      });

      this.markers = [];
    }
  }

  private async addMarkers(dss: DSSData) {
    dss.POINTS.forEach(point => {
      this.markers.push(L.marker(
        L.latLng(point.x, point.y),
        {
          icon: L.icon({
            iconUrl: 'assets/pin.svg',

            iconSize: [50, 50],
            iconAnchor: [25, 50],
          })
        }
      ));

      this.markers[this.markers.length - 1].bindPopup(`№${point.key} [${point.x}, ${point.y}]`).openPopup();
    });

    this.markers.push(L.marker(
      L.latLng(
        dss.CENTER.x,
        dss.CENTER.y
      ),
      {
        icon: L.icon({
          iconUrl: 'assets/pin_center.svg',

          iconSize: [50, 50],
          iconAnchor: [25, 50],
        })
      }
    ));

    this.markers[this.markers.length - 1].bindPopup(`№${dss.CENTER.key} [${dss.CENTER.x}, ${dss.CENTER.y}]`).openPopup();

    this.markers.forEach(marker => {
      marker.addTo(this.map);
    });

    const geometries: Array<string> = [];
    const paths = dss.tables.SavingPath.data[0]['Path'];

    for (const mark of this.markers) {
      for (const otherMarker of this.markers) {
        const key1 = mark.getLatLng().lat + '_' + mark.getLatLng().lng + '*' + otherMarker.getLatLng().lat + '_' + otherMarker.getLatLng().lng;
        if (!dss.PATHS.find(e => e.ID === key1)) {
          return alert('Not all paths found, please update PATHS in edit mode');
        }

        if (this.dssService.isEuclide && dss.viewMode === 'paths') {
          const path = [[mark.getLatLng().lat, mark.getLatLng().lng], [otherMarker.getLatLng().lat, otherMarker.getLatLng().lng]];
          if (!geometries.includes(JSON.stringify(path))) {
            geometries.push(JSON.stringify(path));
            const pLine = L.polyline(path as any);
            this.pLineGroup.push(pLine);
            pLine.addTo(this.map);
          }
        }
      }
    }

    if (!this.dssService.isEuclide && dss.viewMode === 'paths') {
      Object.values(dss.PATHS).forEach((e: any) => {
        if (!geometries.includes(e['geometry'])) {
          geometries.push(e['geometry']);

          const pLine = L.polyline(polyline.decode(e['geometry']) as any);
          this.pLineGroup.push(pLine);
          pLine.addTo(this.map);
        }
      });
    } else if (this.dssService.isEuclide && dss.viewMode === 'saving') {
      const pLines: Array<any> = [];

      `${paths}`.split('-').forEach(path => {
        this.markers.forEach(marker => {
          const text = marker.getPopup()?.getContent();

          if (`${text}`.startsWith(`№${path}`)) {
            const latLng = marker.getLatLng();
            pLines.push([latLng.lat, latLng.lng]);
          }
        });
      });

      const pLine = L.polyline(pLines as any, {
        color: 'red'
      });
      this.pLineGroup.push(pLine);
      pLine.addTo(this.map);
    } else if (!this.dssService.isEuclide && dss.viewMode === 'saving') {
      const PATHSValues = Object.values(dss.PATHS);

      `${paths}`.split('-').forEach(path => {
        const el = PATHSValues.find(e => e.points[0] === +path)!;
        const pLine = L.polyline(polyline.decode(el.geometry) as any, {
          color: 'red'
        });
        this.pLineGroup.push(pLine);
        pLine.addTo(this.map);
      });
    }
  }

  ngAfterViewInit(): void {
    this.map = L.map('map').setView([46.962875, 31.984301], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    combineLatest([
      this.dssService.getDssData$(),
      this.dssService.getCurrentPage$()
    ]).pipe(
      map(([data, page]) => {
        if (page === PAGE_NAME.Map && data.init) {
          this.clearPLineGroup();
          this.clearMarkers();
          this.addMarkers(data);
        }
      })
    ).subscribe();
  }

  change(event: MatButtonToggleChange) {
    this.dssService.setMapView(event.value);
  }
}
