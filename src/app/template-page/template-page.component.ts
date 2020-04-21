import { ViewChild, Component, HostListener, AfterViewInit, ViewContainerRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as CKEDITOR from '@sitespirit/ckeditor5-build-classic-and-inline';
import { HttpClient } from '@angular/common/http';
import { TemplateRenderService } from '../services/template-render.service';
import { LogService } from '../services/log.service';
import { EventService } from '../services/event.service';
declare let window: any;
const editors = [];

@Component({
  selector: 'app-template-page',
  templateUrl: './template-page.component.html',
  styleUrls: ['./template-page.component.css']
})
export class TemplatePageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('inputElement') inputElement: any;
  @ViewChild('outputElement') outputElement: any;
  @ViewChild('vc', { read: ViewContainerRef }) _container: ViewContainerRef;

  title = 'ts-vtb-pdf-viewer';
  mode = 'template-edit';
  nodesWidthEditor: any[] = [];
  output: any;

  @HostListener('click', ['$event.target']) onClick(node) {
    const vtbObjectNode = this.findVtbObjectNode(node);
    if (vtbObjectNode != null && this.nodesWidthEditor.indexOf(vtbObjectNode) === -1) {
      this.nodesWidthEditor.push(vtbObjectNode);
      this.createEditor(vtbObjectNode);
    }
  }

  constructor(
    private _templateRender: TemplateRenderService,
    private http: HttpClient,
    private _activatedRoute: ActivatedRoute,
    private _logService: LogService,
    private _eventService: EventService
  ) {
    if (this._activatedRoute.snapshot.queryParams.key != null) {
      this.mode = 'text-edit';
    }

    if (window != null && window.vtb != null && this.mode === 'text-edit') {
      window.vtb.addEventListener('vtbDataReceived', (data) => {
        this.processNewData(data.detail);
      });
    }

    this._logService.log('TemplatePageComponent | Constructor');
    this._logService.log('Mode: ' + this.mode);
  }

  findVtbObjectByArray(arr, vtbObjectId, propertyName, newValue) {
    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        this.setValueByVtbObjectId(item, vtbObjectId, propertyName, newValue);
      } else if (Array.isArray(item)) {
        this.findVtbObjectByArray(item, vtbObjectId, propertyName, newValue);
      }
    }
  }

  setValueByVtbObjectId(obj, vtbObjectId, propertyName, newValue) {
    if (obj.vtbObjectId != null && obj.vtbObjectId === vtbObjectId) {
      obj[propertyName] = newValue;
    }
    for (const property in obj) {
      if (Array.isArray(obj[property])) {
        this.findVtbObjectByArray(obj[property], vtbObjectId, propertyName, newValue);
      } else if (typeof obj[property] === 'object' && obj[property] !== null) {
        this.setValueByVtbObjectId(obj[property], vtbObjectId, propertyName, newValue);
      }
    }
  }

  processNewData(data) {
    if (data != null && data.message != null) { // && data.message.source === 'vtb'
      if (data.message.fileName != null) {
        this.http.get(`https://vtb-live-mode.s3.eu-west-1.amazonaws.com/${data.message.fileName}`).toPromise().then((x: any) => {
          if (x.data != null && x.css != null && x.html != null) {
            this._templateRender.fire(x.data, x.html, x.css, this._container).then(() => this._templateRender.distribute(this.mode, false));
          } else {
            alert('Data missing, please check your console');
          }
        });
      }
      if (data.message.vtbObjectId != null && this._templateRender.templateComponentRef != null) {
        this.setValueByVtbObjectId(this._templateRender.currentItinerary, data.message.vtbObjectId,
          data.message.propertyName, data.message.newValue);

        this._templateRender.fire(this._templateRender.currentItinerary,
          JSON.parse(JSON.stringify(this._templateRender.currentTemplate)),
          JSON.parse(JSON.stringify(this._templateRender.currentStyle)), this._container)
          .then(() => this._templateRender.distribute(this.mode, false));
      }
    }
  }

  processChange(detail) {
    if (window != null && window.vtb != null) {
      const event = new CustomEvent('vtbTextChanged', {
        detail: detail
      });
      console.log('dispatching vtbTextChanged:', event, detail);
      window.vtb.dispatchEvent(event);
    }
  }

  createEditor(vtbObjectNode) {
    CKEDITOR.InlineEditor.create(vtbObjectNode).then(editor => {
      editors.push(editor);
      editor.ui.focusTracker.on('change:isFocused', (e, name, isFocused) => {
        if (!isFocused) {
          const detail = {
            propertyName: vtbObjectNode.dataset.field,
            newValue: editor.getData(),
            vtbObjectId: vtbObjectNode.dataset.vtbObjectId
          };
          this.processChange(detail);
          editor.destroy();
          this.nodesWidthEditor.splice(this.nodesWidthEditor.indexOf(vtbObjectNode), 1);
          if (this.mode === 'template-edit') {
            this._templateRender.distribute(this.mode, false);
          } else {
            this.processNewData({ message: detail });
          }
        }
      });
    }).catch(e => {
      console.log(e);
    });
  }

  findVtbObjectNode(node) {
    if (node.dataset != null && node.dataset.field != null && node.dataset.field !== '' &&
      node.dataset.vtbObjectId != null && node.dataset.vtbObjectId !== '') {

      return node;
    } else if (node.parentNode != null) {
      return this.findVtbObjectNode(node.parentNode);
    } else {
      return null;
    }
  }

  ngAfterViewInit() {
    const self = this;
    let totalLoaded = 0;
    const images = document.querySelectorAll('img');

    if (!images.length) {
      this._templateRender.afterViewInit(this.mode);
      return;
    }

    const timeout = setTimeout(() => {
      this._templateRender.afterViewInit(this.mode);
    }, 1500); // skip image checking if it takes longer than 1.5s to load them

    images.forEach(image => {
      image.addEventListener('load', (e) => {
        totalLoaded++;
        imageCheck();
      });

      image.addEventListener('error', () => {
        totalLoaded++;
        imageCheck();
      });

      function imageCheck() {
        if (images.length === totalLoaded) {
          clearInterval();
          self._templateRender.afterViewInit(self.mode);
        }
      }
    });
  }

  ngOnDestroy() {
    this._templateRender.destroy();
  }

  /* No idea what to do with this...
  renderLatestAsync(){ // async render method is not working atm, see FIXME
    this.recursiveSetOffsetTop(document.getElementById('inputElement'));
    if(this.mode === 'template-edit'){
      document.getElementById('outputElement').innerHTML = document.getElementById('inputElement').children[0].innerHTML;
    } else {
      document.getElementById('outputElement').innerHTML = document.getElementById('inputElement').children[1].innerHTML;
    }
    //console.log(document.getElementById('inputElement').children[1].innerHTML);
    const images = document.querySelectorAll('#outputElement img');
    let loaded = 0;
    // we wait with regenerating pages until all images are loaded as images have influence on the element heights
    // since we dont use fixed aspect ratio responsive images atm
    images.forEach((image,index) => {
      image.addEventListener('load', () => {
        loaded++;
        if(loaded === images.length){
          this.regeneratePages(); // [FIXME] it seems this is never triggered when using async renderer?
        }
      })
      image.addEventListener('error', () => {
        loaded++;
        if(loaded === images.length){
          this.regeneratePages();
        }
      })
    });
  }
  */
}
