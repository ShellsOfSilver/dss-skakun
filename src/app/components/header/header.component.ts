import { Component } from '@angular/core';

import { MatSlideToggleChange } from '@angular/material/slide-toggle';

import { DSSService } from '../../services/dss.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    private dssService: DSSService,
  ) { }

  change(event: MatSlideToggleChange) {
    this.dssService.setEuclide(event.checked);
  }
}
