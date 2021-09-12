import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import * as L from 'leaflet';
import * as polyline from 'polyline';

import { DSSData, DSSService } from '../../services/dss.service';
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
export class MapComponent implements OnInit {

  map!: L.Map;
  dssData!: Observable<DSSData>;
  markers: Array<L.Marker>;

  constructor(
    private dssService: DSSService,
  ) {
    this.markers = [];
  }

  private clearMarkers() {
    if (this.markers.length) {
      this.markers.forEach(marker => {
        marker.remove();
      });

      this.markers = [];
    }
  }

  private async addMarkers(points: Array<Coord>, center: Coord) {
    let maxX: number = Number.MIN_SAFE_INTEGER;
    let minX: number = Number.MAX_SAFE_INTEGER;
    let maxY: number = Number.MIN_SAFE_INTEGER;
    let minY: number = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < points.length; i++) {
      const item = points[i];

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

    points.forEach(point => {
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
        46.948025 + ((center.x - minX) * 0.00045),
        31.961801 + ((center.y - minY) * 0.00075)
      ),
      {
        icon: L.icon({
          iconUrl: 'assets/pin_center.svg',

          iconSize: [50, 50],
          iconAnchor: [25, 50],
        })
      }
    ));

    this.markers[this.markers.length - 1].bindPopup(`№${center.key} [${center.x}, ${center.y}]`).openPopup();

    this.markers.forEach(marker => {
      marker.addTo(this.map);
    });

    for (const mark of this.markers) {
      for (const mark1 of this.markers) {
        const key1 = mark.getLatLng().lat + '_' + mark.getLatLng().lng + '*' + mark1.getLatLng().lat + '_' + mark1.getLatLng().lng;
        if (!(PATHS as any)[key1]) {
          alert('Not all paths found, please update PATHS in data.ts');

          /*
            try {
            let i = 0;
            for (const mark of this.markers) {
              for (const mark1 of this.markers) {
                const key1 = mark.getLatLng().lat + '_' + mark.getLatLng().lng + '*' + mark1.getLatLng().lat + '_' + mark1.getLatLng().lng;
                const key2 = mark1.getLatLng().lat + '_' + mark1.getLatLng().lng + '*' + mark.getLatLng().lat + '_' + mark.getLatLng().lng

                if (!paths[key1]) {
                  const res = await this.dssService.getPath(mark.getLatLng(), mark1.getLatLng()).toPromise() as any;

                  paths[key1] = {
                    geometry: res.routes[0].geometry,
                    distance: res.routes[0].distance,
                  };
                  paths[key2] = {
                    geometry: res.routes[0].geometry,
                    distance: res.routes[0].distance,
                  };
                  i++;
                  if (i % 100 === 0) {
                    console.log('----', paths)
                  }
                }
              }
            }
            console.log('done', paths)
          } catch(err) {
            console.log(err)
            console.log(paths)
          }
          */
        }
      }
    }


    Object.values(PATHS).forEach((e: any) => {
      L.polyline(polyline.decode(e['geometry']) as any).addTo(this.map);
    });
  }

  ngOnInit(): void {
    this.map = L.map('map').setView([46.962875, 31.984301], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.dssService.getDssData$()
      .subscribe((data) => {
        if (data?.init) {
          this.clearMarkers();
          this.addMarkers(data.POINTS, data.CENTER);
        }
      });
  }
}
