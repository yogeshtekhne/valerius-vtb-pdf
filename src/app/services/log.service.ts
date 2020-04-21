import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  debug = false;

  constructor() { }

  log(msg) {
    if (this.debug) {
      console.log(msg);
    }
  }

  important(msg) {
    console.log(`%c ${msg}`, 'color:red; font-weight:bold;');
  }
}
