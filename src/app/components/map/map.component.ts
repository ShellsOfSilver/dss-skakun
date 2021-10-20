import { AfterViewInit, Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as L from 'leaflet';
import * as polyline from 'polyline';

import { MapSettingsDialog } from '../../dialogs/map-settings/map-settings.component';
import { DSSData, PAGE_NAME, Path, Point, VIEW_MODE } from '../../models/dss';
import { DSSService } from '../../services/dss.service';

export interface ExtraTextItem {
  text: string;
  color?: string;
};

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
  extraText: Array<ExtraTextItem>;
  colors: Array<string>;
  programLables: Array<string>;
  currentProgram: string;
  showInfo: boolean;

  constructor(
    private dssService: DSSService,
    private dialog: MatDialog,
  ) {
    this.showInfo = false;
    this.markers = [];
    this.pLineGroup = [];
    this.programLables = [];
    this.extraText = [];
    this.colors = ['#000000', '#FF0000', '#800000', '#00FF00', '#008000', '#00FFFF', '#FFFF00', '#808000', '#008080', '#0000FF', '#000080', '#FF00FF', '#800080'];
    this.currentProgram = 'P1';
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

  private createMarker(point: Point, iconUrl: string, xyPoints: Array<Point>) {
    const marker = L.marker(L.latLng(point.x, point.y), { icon: this.getIcon(point, iconUrl), data: point, } as any);

    if (xyPoints.length) {
      const el = xyPoints.find(e => e.key === point.key)!;
      marker.bindTooltip(`№${point.key} [${el?.x}, ${el?.y}]`);
    } else {
      marker.bindTooltip(`№${point.key} [${point.x}, ${point.y}]`);
    }
    marker.addTo(this.map);
    this.markers.push(marker);
  }

  private setViewModeGalmiltonAndIsEuclide(paths: string, color: string) {
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
              color, oldColor: color,
            } as any);
            this.pLineGroup.push(pLine);
          }
        }
      });
    });
  }

  private setViewModeGalmiltonAndIsNotEuclide(dss: DSSData, paths: string, color: string) {
    const PATHSValues = Object.values(dss.PATHS);
    const arr = `${paths}`.split('-');
    arr.forEach((path, inx) => {
      if (inx) {
        const el = PATHSValues.find(e => e.points.includes(+path) && e.points.includes(+arr[inx - 1]))!;
        const pLine = L.polyline(polyline.decode(el.geometry) as any, { points: el.points, distance: el.distance, color, oldColor: color } as any);
        this.pLineGroup.push(pLine);
      }
    });
  }

  private setPolyline() {
    this.pLineGroup.forEach(polyline => {
      const points = (polyline.options as any)?.points as Array<number>;
      const dis = (polyline.options as any)?.distance as number;
      const color = (polyline.options as any)?.oldColor || '#0092d6';

      if (points) {
        polyline.bindPopup(`№${points[0]} - №${points[1]} ${dis ? `(${(dis / 1000).toFixed(3)} km)` : ''}`)
          .on('popupclose', () => {
            polyline.setStyle({ color, weight: 4, });

            this.markers.forEach(marker => {
              const point = (marker.options as any)?.data;
              if (points.includes(point?.key)) {
                marker.setIcon(this.getIcon(point, '', marker.getIcon().options.iconUrl!));
              }
            });
          })
          .on('popupopen', () => {
            polyline.bringToFront();
            polyline.setStyle({ color: 'red', weight: 8, });

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

  private async addMarkers(dss: DSSData) {
    const xyPoints = this.dssService.isEuclide ? this.dssService.pointsToScreenXY([...dss.POINTS, dss.CENTER]) : [];
    dss.POINTS.forEach(point => this.createMarker(point, 'assets/pin.svg', xyPoints));
    this.createMarker(dss.CENTER, 'assets/pin_center.svg', xyPoints);

    const geometries: Array<string> = [];
    let extraTextPaths: Array<ExtraTextItem> = [];
    let extraTextInx = 1;
    let colorInx = 0;

    const getColor = () => {
      let color = this.colors[colorInx++];
      if (!color) {
        color = this.colors[0];
        colorInx = 0;
      }
      return color;
    };

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
          const pLine = L.polyline(polyline.decode(e['geometry']) as any, { points: e.points, distance: e.distance, color: '#0092d6', } as any);
          this.pLineGroup.push(pLine);
        }
      });
    } else if (this.dssService.isEuclide && dss.viewMode === 'saving') {
      const paths = dss.tables.SavingPath.data[0]['Path'];
      this.setViewModeGalmiltonAndIsEuclide(paths, '#0092d6');
    } else if (!this.dssService.isEuclide && dss.viewMode === 'saving') {
      const paths = dss.tables.SavingPath.data[0]['Path'];
      this.setViewModeGalmiltonAndIsNotEuclide(dss, paths, '#0092d6');
    } else if (this.dssService.isEuclide && dss.viewMode === 'sweeping') {
      const paths = dss.tables.SweepingPath.data[0]['Path'];
      this.setViewModeGalmiltonAndIsEuclide(paths, '#0092d6');
    } else if (!this.dssService.isEuclide && dss.viewMode === 'sweeping') {
      const paths = dss.tables.SweepingPath.data[0]['Path'];
      this.setViewModeGalmiltonAndIsNotEuclide(dss, paths, '#0092d6');
    } else if (this.dssService.isEuclide && dss.viewMode === 'saving programs') {
      dss.tables.SavingPrograms.data
        .filter(e => e.key === this.currentProgram && e.Path)
        .forEach(e => {
          const color = getColor();
          extraTextPaths.push({ color, text: `#${extraTextInx++}: ${e.Path}` });
          this.setViewModeGalmiltonAndIsEuclide(e.Path, color);
        });
    } else if (!this.dssService.isEuclide && dss.viewMode === 'saving programs') {
      dss.tables.SavingPrograms.data
        .filter(e => e.key === this.currentProgram && e.Path)
        .forEach(e => {
          const color = getColor();
          extraTextPaths.push({ color, text: `#${extraTextInx++}: ${e.Path}` });
          this.setViewModeGalmiltonAndIsNotEuclide(dss, e.Path, color)
        });
    } else if (this.dssService.isEuclide && dss.viewMode === 'sweeping programs') {
      dss.tables.SweepingPrograms.data
        .filter(e => e.key === this.currentProgram && e.Path)
        .forEach(e => {
          const color = getColor();
          extraTextPaths.push({ color, text: `#${extraTextInx++}: ${e.Path}` });
          this.setViewModeGalmiltonAndIsEuclide(e.Path, color);
        });
    } else if (!this.dssService.isEuclide && dss.viewMode === 'sweeping programs') {
      dss.tables.SweepingPrograms.data
        .filter(e => e.key === this.currentProgram && e.Path)
        .forEach(e => {
          const color = getColor();
          extraTextPaths.push({ color, text: `#${extraTextInx++}: ${e.Path}` });
          this.setViewModeGalmiltonAndIsNotEuclide(dss, e.Path, color)
        });
    }

    if (dss.viewMode === 'saving programs' || dss.viewMode === 'sweeping programs') {
      this.extraText = [
        { text: 'Program: ' + this.currentProgram },
        ...extraTextPaths
      ];
    }

    this.setPolyline();
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
          this.currentProgram = data.currentProgram || 'P1';
          const savingPaths = data.tables.SavingPath.data[0]['Path'];
          const sweepingPaths = data.tables.SweepingPath.data[0]['Path'];
          const tmpPrograms = [];

          if (data.viewMode === 'saving') {
            this.extraText = [{ text: savingPaths }];
          } else if (data.viewMode === 'saving programs' || data.viewMode === 'sweeping programs') {
            for (let i = 0; i < data.N_PROGRAMS; i++) {
              tmpPrograms.push('P' + (i + 1));
            }
          } else if (data.viewMode === 'sweeping') {
            this.extraText = [{ text: sweepingPaths }];
          } else {
            this.extraText = [];
          }

          this.programLables = tmpPrograms;
          this.map.setView(L.latLng(data.CENTER.x, data.CENTER.y), this.map.getZoom());
          this.clearPLineGroup();
          this.clearMarkers();
          this.addMarkers(data);
        }
      })
    ).subscribe();
  }

  openSettings() {
    this.dialog.open(MapSettingsDialog, {
      data: {
        viewMode: ['paths', 'saving', 'saving programs', 'sweeping', 'sweeping programs'] as VIEW_MODE[],
        programLables: this.programLables,
        extraText: this.extraText
      }
    });
  }
}
