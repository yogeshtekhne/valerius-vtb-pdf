declare const require: any;
declare const google: any;
const vtbDataTransformer = require('@sitespirit/vtb-transformer');
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../services/event.service';

@Component({
  selector: 'app-template-container',
  templateUrl: './template-container.component.html',
  styleUrls: ['./template-container.component.css']
})
export class TemplateContainerComponent {
  itinerary: any;

  constructor(private _activatedRoute: ActivatedRoute, private _eventService: EventService) {
    const data = this._activatedRoute.snapshot.data;
    this.itinerary = data.itinerary;
  }

  googleMapsReady($event) {
    // Quickfix, needs to be rewritten...
    if (typeof google !== undefined) {
      google.maps.event.addListenerOnce($event, 'tilesloaded', () => {
        this._eventService.setMapsReady();
      });
    }
  }

}
