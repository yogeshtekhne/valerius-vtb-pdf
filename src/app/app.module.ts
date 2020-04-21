import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { VtbComponentsModule } from '@sitespirit/vtb-component-library';

import { AppComponent } from './app.component';
import { TemplateContainerComponent } from './template-container/template-container.component';
import { environment } from '../environments/environment';
import { ItineraryResolver } from './resolvers/itinerary.resolver';
import { TemplatePageComponent } from './template-page/template-page.component';
import { AgmCoreModule } from '@agm/core';


@NgModule({
  declarations: [
    AppComponent,
    TemplateContainerComponent,
    TemplatePageComponent
  ],
  imports: [
    BrowserModule,
    VtbComponentsModule.forRoot(environment),
    HttpClientModule,
    RouterModule.forRoot([{
      path: '',
      component: TemplatePageComponent,
      pathMatch: 'full',
      resolve: {
        itinerary: ItineraryResolver
      }
    }]),
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyDbQRG8PPZbPN0EUsOEm-Lbj0sYN4Ho_VI'
    })
  ],
  providers: [ItineraryResolver],
  bootstrap: [AppComponent]
})
export class AppModule { }
