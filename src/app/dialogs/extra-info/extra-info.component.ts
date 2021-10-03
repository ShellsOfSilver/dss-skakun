import { Component, Input } from '@angular/core';

import { ExtraTextItem } from '../../components/map/map.component';

@Component({
  selector: 'app-extra-info',
  templateUrl: './extra-info.component.html',
  styleUrls: ['./extra-info.component.scss']
})
export class ExtraInfoComponent {

  @Input() extraText!: Array<ExtraTextItem>;

  constructor() { }
}
