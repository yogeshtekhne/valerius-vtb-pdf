import { Injectable, Component, ChangeDetectorRef, ApplicationRef, NgModule, Compiler, Injector, NgModuleRef } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { VtbComponentsModule } from '@sitespirit/vtb-component-library';
import { environment } from '../../environments/environment';
import { AgmCoreModule } from '@agm/core';
import { InViewportModule } from '@thisissoon/angular-inviewport';
import { ActivatedRoute } from '@angular/router';
import { DistributionService } from './distribution.service';
import { EventService } from './event.service';
declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class TemplateRenderService {

  currentItinerary: any;
  currentTemplate: any;
  currentStyle: any;
  templateComponentRef: any;

  constructor(
    private _injector: Injector,
    private _ngModuleRef: NgModuleRef<any>,
    private _activatedRoute: ActivatedRoute,
    private _compiler: Compiler,
    private _distribution: DistributionService,
    private _eventService: EventService
  ) {
  }

  fire(data: object, html: string, css: string, container: any) {
    this.currentStyle = css;
    this.resetStyles(this.currentStyle);
    const currentTemplate = html;
    const currentItinerary = data;

    @Component({
      template: currentTemplate,
      selector: 'app-template',
    })
    class DynamicComponent {
      private _eventService;
      itinerary: any = currentItinerary;
      constructor(private cdr: ChangeDetectorRef, private applicationRef: ApplicationRef) { }
      setItinerary(itinerary) {
        this.itinerary = JSON.parse(JSON.stringify(itinerary));
        this.cdr.detectChanges();
        this.applicationRef.tick();
      }

      setEventService(_eventService) {
        this._eventService = _eventService;
      }

      googleMapsReady($event) {
        // Quickfix, needs to be rewritten...
        if (typeof google !== undefined && this._eventService) {
          google.maps.event.addListenerOnce($event, 'tilesloaded', () => {
            this._eventService.setMapsReady();
          });
        }
      }
    }

    @NgModule({
      imports: [
        BrowserModule,
        VtbComponentsModule.forRoot(environment),
        AgmCoreModule.forRoot({
          apiKey: 'AIzaSyDa6wr3FY1sGlEpAzL2riOeMVGxdUGmCjI'
        }),
        InViewportModule
      ],
      declarations: [DynamicComponent],
    }) class TmpModule { }
    return this._compiler.compileModuleAndAllComponentsAsync(TmpModule).then((factories) => {
      const templateComponentFactory = factories.componentFactories.find(x => x.selector === 'app-template');
      this.templateComponentRef = templateComponentFactory.create(this._injector, [], null, this._ngModuleRef);
      // assign the message itinerary to the model
      this.templateComponentRef.instance.setItinerary(currentItinerary);
      this.templateComponentRef.instance.setEventService(this._eventService);
      // redraw
      container.clear();
      container.insert(this.templateComponentRef.hostView);
      return;
    });
  }

  resetStyles(css) {
    const elements = document.querySelectorAll('style[type="text/css"]');
    for (let i = 0; i < elements.length; i++) {
      elements[i].parentNode.removeChild(elements[i]);
    }
    const head = document.head || document.getElementsByTagName('head')[0];
    const style: any = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
      // This is required for IE8 and below.
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
  }

  distribute(mode, eventDriven) {
    this._distribution.fire(mode, eventDriven);
  }

  afterViewInit(mode) {
    if (mode === 'template-edit') {
      this.distribute(mode, false);
    }

    if (mode === 'template-edit') {
      this.currentItinerary = this._activatedRoute.snapshot.data.itinerary;
    }

    this._eventService.isMapsReady.subscribe(value => {
      if (value === true) {
         this._distribution.fire(mode, true);
      }
    });
  }

  destroy() {
    if (this.templateComponentRef) {
      this.templateComponentRef.destroy();
    }
  }
}
