import { AfterViewInit, Component } from '@angular/core';

import { MatButtonToggleChange } from '@angular/material/button-toggle';

import { Observable } from 'rxjs';

import * as L from 'leaflet';
import * as polyline from 'polyline';

import { DSSData, DSSService, VIEW_MODE } from '../../services/dss.service';
import { PATHS } from '../../data';

interface Coord {
  key: number;
  x: number;
  y: number;
}

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
    let maxX: number = Number.MIN_SAFE_INTEGER;
    let minX: number = Number.MAX_SAFE_INTEGER;
    let maxY: number = Number.MIN_SAFE_INTEGER;
    let minY: number = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < dss.POINTS.length; i++) {
      const item = dss.POINTS[i];

      if (!maxX || maxX < item.x) {
        maxX = item.x;
      }

      if (!maxY || maxY < item.y) {
        maxY = item.y;
      }

      if (!minX || minX > item.x) {
        minX = item.x;
      }

      if (!minY || minY > item.y) {
        minY = item.y;
      }
    }

    dss.POINTS.forEach(point => {
      const lat = 46.948025 + ((point.x - minX) * 0.00045);
      const lng = 31.961801 + ((point.y - minY) * 0.00075);

      this.markers.push(L.marker(
        L.latLng(lat, lng),
        {
          icon: L.icon({
            iconUrl: 'assets/pin.svg',

            iconSize: [50, 50],
            iconAnchor: [25, 25],
          })
        }
      ));

      this.markers[this.markers.length - 1].bindPopup(`№${point.key} [${point.x}, ${point.y}]`).openPopup();
    });

    this.markers.push(L.marker(
      L.latLng(
        46.948025 + ((dss.CENTER.x - minX) * 0.00045),
        31.961801 + ((dss.CENTER.y - minY) * 0.00075)
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
      for (const mark1 of this.markers) {
        const key1 = mark.getLatLng().lat + '_' + mark.getLatLng().lng + '*' + mark1.getLatLng().lat + '_' + mark1.getLatLng().lng;
        if (!(PATHS as any)[key1]) {
          return alert('Not all paths found, please update PATHS in data.ts');
        }

        if (this.dssService.isEuclide && dss.viewMode === 'paths') {
          const path = [[mark.getLatLng().lat, mark.getLatLng().lng], [mark1.getLatLng().lat, mark1.getLatLng().lng]];
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
      Object.values(PATHS).forEach((e: any) => {
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
      const PATHSValues = Object.values(PATHS);

      `${paths}`.split('-').forEach(path => {
        const el = PATHSValues.find(e => e.point.startsWith(`№${path}`))!;
        const pLine = L.polyline(polyline.decode(el['geometry']) as any, {
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

    this.dssService.getDssData$()
      .subscribe((data) => {
        if (data?.init) {
          this.clearPLineGroup();
          this.clearMarkers();
          this.addMarkers(data);
        }
      });
  }

  change(event: MatButtonToggleChange) {
    this.dssService.setMapView(event.value);
  }
}
