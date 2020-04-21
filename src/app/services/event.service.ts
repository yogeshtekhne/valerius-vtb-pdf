import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private isMapsReadySource = new BehaviorSubject<boolean>(false);
  isMapsReady = this.isMapsReadySource.asObservable();

  setMapsReady() {
    this.isMapsReadySource.next(true);
  }
}
