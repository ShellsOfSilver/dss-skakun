import { AfterViewInit, Component } from '@angular/core';

import { MatButtonToggleChange } from '@angular/material/button-toggle';

import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as L from 'leaflet';
import * as polyline from 'polyline';

import { DSSData, PAGE_NAME, Path, Point } from '../../models/dss';
import { DSSService } from '../../services/dss.service';

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
  extraText: string;

  constructor(
    private dssService: DSSService,
  ) {
    this.markers = [];
    this.pLineGroup = [];
    this.extraText = '';
  }

  private clearPLineGroup() {
    if (this.pLineGroup.length) {
      this.pLineGroup.forEach(marker => {
        marker.off();
        marker.remove();
      });

      this.pLineGroup = [];
    }
  }

  private clearMarkers() {
    if (this.markers.length) {
      this.markers.forEach(marker => {
        marker.off();
        marker.remove();
      });

      this.markers = [];
    }
  }

  private getIcon(point: Point, iconUrl: string, oldIcon?: string) {
    return L.divIcon({
      iconUrl: oldIcon || iconUrl,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      html: ` <img src="${iconUrl || oldIcon}">  <div class="lable">${point.key}</div> `,
      className: 'text-below-marker',
    });
  }

  private createMarker(point: Point, iconUrl: string) {
    const marker = L.marker(L.latLng(point.x, point.y), { icon: this.getIcon(point, iconUrl), data: point, } as any);

    marker.bindTooltip(`№${point.key} [${point.x}, ${point.y}]`);
    marker.addTo(this.map);

    this.markers.push(marker);
  }

  private async addMarkers(dss: DSSData) {
    dss.POINTS.forEach(point => this.createMarker(point, 'assets/pin.svg'));
    this.createMarker(dss.CENTER, 'assets/pin_center.svg');

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
            const pLine = L.polyline(path as any, {
              points: [(mark.options as any)?.data?.key, (otherMarker.options as any)?.data?.key],
              color: '#0092d6',
            } as any);
            this.pLineGroup.push(pLine);
          }
        }
      }
    }

    if (!this.dssService.isEuclide && dss.viewMode === 'paths') {
      Object.values(dss.PATHS).forEach((e: Path) => {
        if (!geometries.includes(e['geometry'])) {
          geometries.push(e['geometry']);
          const pLine = L.polyline(polyline.decode(e['geometry']) as any, { points: e.points, color: '#0092d6', } as any);
          this.pLineGroup.push(pLine);
        }
      });
    } else if (this.dssService.isEuclide && dss.viewMode === 'saving') {
      const pLines: Array<any> = [];
      const points: Array<number> = [];

      `${paths}`.split('-').forEach(path => {
        this.markers.forEach(marker => {
          const key = (marker.options as any).data.key;
          if (+key === +path) {
            const latLng = marker.getLatLng();

            pLines.push([latLng.lat, latLng.lng]);
            points.push((marker.options as any)?.data?.key);

            if (pLines.length > 1) {
              const pLine = L.polyline([pLines[pLines.length - 2], pLines[pLines.length - 1]] as any, {
                points: [points[points.length - 2], points[points.length - 1]],
                color: '#0092d6',
              } as any);
              this.pLineGroup.push(pLine);
            }
          }
        });
      });
    } else if (!this.dssService.isEuclide && dss.viewMode === 'saving') {
      const PATHSValues = Object.values(dss.PATHS);
      const arr = `${paths}`.split('-');
      arr.forEach((path, inx) => {
        if (inx) {
          const el = PATHSValues.find(e => e.points.includes(+path) && e.points.includes(+arr[inx - 1]))!;
          const pLine = L.polyline(polyline.decode(el.geometry) as any, { points: el.points, color: '#0092d6' } as any);
          this.pLineGroup.push(pLine);
        }
      });
    }

    this.pLineGroup.forEach(polyline => {
      const points = (polyline.options as any)?.points as Array<number>;
      if (points) {
        polyline.bindPopup(`№${points[0]} - №${points[1]}`)
          .on('popupclose', () => {
            polyline.setStyle({
              color: '#0092d6',
              weight: 4,
            });

            this.markers.forEach(marker => {
              const point = (marker.options as any)?.data;
              if (points.includes(point?.key)) {
                marker.setIcon(this.getIcon(point, '', marker.getIcon().options.iconUrl!));
              }
            });
          })
          .on('popupopen', () => {
            polyline.bringToFront();
            polyline.setStyle({
              color: 'red',
              weight: 6,
            });

            this.markers.forEach(marker => {
              const point = (marker.options as any)?.data;
              if (points.includes(point?.key)) {
                marker.setIcon(this.getIcon(point, 'assets/pin_green.svg', marker.getIcon().options.iconUrl!));
              }
            });
          })
      }

      polyline.addTo(this.map);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map('map').setView([49.348153, 32.592833], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(this.map);

    combineLatest([
      this.dssService.getDssData$(),
      this.dssService.getCurrentPage$()
    ]).pipe(
      map(([data, page]) => {
        if (page === PAGE_NAME.Map && data.init) {
          const paths = data.tables.SavingPath.data[0]['Path'];
          if (data.viewMode === 'saving') {
            this.extraText = paths;
          } else {
            this.extraText = '';
          }

          this.map.setView(L.latLng(data.CENTER.x, data.CENTER.y), this.map.getZoom());
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
