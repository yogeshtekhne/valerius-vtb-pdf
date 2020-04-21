import { Injectable, Inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { HttpClient } from '@angular/common/http';
declare const require: any;
const vtbDataTransformer = require('@sitespirit/vtb-transformer');

@Injectable()
export class ItineraryResolver implements Resolve<any> {
  constructor(private http: HttpClient) { }
  resolve(): Promise<any> {
    return this.http.get('../../../assets/json/stub.json').toPromise().then((vtbObj) => {
      return vtbDataTransformer.transform(vtbObj);
    });
  }
}
