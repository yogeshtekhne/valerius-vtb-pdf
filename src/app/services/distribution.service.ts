import { Injectable, ComponentFactoryResolver } from '@angular/core';
import { LogService } from './log.service';
import { DistributionHelpersService } from './distribution-helpers.service';
import { connectableObservableDescriptor } from 'rxjs/internal/observable/ConnectableObservable';

/****
 * Chris: I have commented everything that has to do with frozenOffsetTop and subChildTop
 * Seems like this code was doing nothing, keeping it for now to be sure...
 */

@Injectable({
  providedIn: 'root'
})
export class DistributionService {
  status: any = {
    pageWasAdded: false,
    firstPageSet: false,
    latestOutputGenerated: false,
    prevElement: null
  };

  constructor(private _dh: DistributionHelpersService, private _logService: LogService) { }

  fire(mode, isEventDriven) {
    this._logService.log('Fire distribution service');

    // Wait for Google maps...this needs to be rewritten
    const html = (mode === 'template-edit') ? document.getElementById('inputElement').children[0].innerHTML :
     document.getElementById('inputElement').children[1].innerHTML;

    if (!isEventDriven && html.match(/agm-map/)) {
      return;
    }

    this._logService.log('Event driven: ' + isEventDriven);

    // this.recursiveSetOffsetTop(document.getElementById('inputElement'));

    if (mode === 'template-edit') {
      document.getElementById('outputElement').innerHTML = document.getElementById('inputElement').children[0].innerHTML;
    } else {
      document.getElementById('outputElement').innerHTML = document.getElementById('inputElement').children[1].innerHTML;
    }

    this.regeneratePages();
  }

  /*
   * Entry point method to start regenerating the (dynamic) pages
   */
  regeneratePages() {
    this._logService.log('Regenerating pages');
    this._logService.log(JSON.stringify(this.status));

    let pageElements: any;
    this.status.firstPageSet = false;

    /*
     * Loop over all pages, if a page has the class `dynamic-pages` it should be distributed over multiple pages
     */
    for (let i = 0; i < document.getElementById('outputElement').children.length; i++) {
      const child = document.getElementById('outputElement').children[i];
      if (child.className.indexOf('dynamic-pages') > -1) {

        // Create an object containing the different page elements as header, inner & footer
        pageElements = this._dh.generateElementData(child, Array.from(child.children));

        this.addPage((this.status.firstPageSet === false), pageElements);

        for (const pageChild of pageElements.pageInner.children) {
          this.processHTMLchildren(pageChild, pageElements);
        }

        document.getElementById('outputElement').removeChild(child);

        if (this.status.newPage != null && this.status.newPage.children.length > 0 && this.status.pixelsFilled > 0) {
          this.addPage(false, pageElements); // Todo (chris): Not necessary to completely execute the `addPage` method
        }

        i--;
      }
    }

    /*
     * A page is added to the DOM when the script starts to create the next page with the `addPage`-method
     * So it's possible that the last page is filled, but not yet added to the DOM
     */
    // if (this.status.newPage != null && this.status.newPage.children.length > 0 && this.status.pixelsFilled > 0){
    //   this.addPage(false, pageElements); //Todo (chris): Not necessary to completely execute the `addPage` method
    // }

    this.status.latestOutputGenerated = true;
  }

  addPage(firstPage = false, pageElements: any) {
    // If there is a previous page, we need to add it to the DOM now
    if (firstPage === false && this.status.pixelsFilled > 0) {
      if (pageElements.nextSibling) {
        document.getElementById('outputElement').insertBefore(this.status.newPage, pageElements.nextSibling);
      } else {
        document.getElementById('outputElement').appendChild(this.status.newPage);
      }

      this.status.firstPageSet = true;
    }

    // Create a new empty page
    this.status.pageWasAdded = true;
    this.status.newPage = document.createElement('div');
    this.status.newInnerPage = document.createElement('div');

    // Give the inner page the same class
    if (pageElements.pageInner != null) {
      this.status.newInnerPage.className = pageElements.pageInner.className;
    }

    // Clone the header and footer, if they exists, into this new page
    if (pageElements.pageHeader != null) {
      const dupeNode = pageElements.pageHeader.cloneNode(true);
      this.status.newPage.appendChild(dupeNode);
    }
    this.status.newPage.appendChild(this.status.newInnerPage);

    if (pageElements.pageFooter != null) {
      const dupeNode = pageElements.pageFooter.cloneNode(true);
      this.status.newPage.appendChild(dupeNode);
    }

    // Give the page wrapper the same class
    this.status.newPage.className = pageElements.pageClass;

    // It's a new page, so set the filled pixels to 0
    this.status.pixelsFilled = 0;
    if(this.status.keepHeight) {
      this.status.pixelsFilled = this.status.keepHeight;
      this.status.keepHeight = 0;
    }
  }

  processHTMLchildren(parent, pageElements) {
    this._logService.log('processHTMLchildren');

    let localStatus: any = this._dh.createLocalStatus(parent, pageElements);

    // If the element (`parent`) only contains inline-elements, we want to add them together, otherwise we might loose text, for example:
    // <p>This text would be lost <span>this text would be shown</span></p>
    if (!this._dh.hasBlockElementChildren(parent.children)) {
      this._logService.log('Contains only inline-element children');
      localStatus = this.handleBlockWithInlineElements(localStatus, parent);
    } else {
      this._logService.log('Contains block-element children');

      for (const subChild of parent.children) {
        // Set the localStatus for this child
        localStatus.subChild = subChild;
        // localStatus.subChildTop = subChild.dataset.frozenOffsetTop;
        localStatus.subChildHeight = this._dh.getHeight(subChild);
        /*
         * Add the height of the empty container, so the script can take margin/paddings into account of this container element
         */
        if (localStatus.index === 0) {
          localStatus.subChildHeight += this._dh.getHeight(localStatus.dupeParent);
        }
        const pageBreakObj = this._dh.findPageBreak(subChild);
        if(pageBreakObj !== null) {
          localStatus.dupePixelsFilled = 0;
          localStatus.index = 0;
          localStatus.pageBreakDone = false;

          this.applyPageBreak(subChild, localStatus, pageBreakObj);
        } else {
          if(localStatus.pageBreakDone === false) {
            localStatus.pageBreakDone = true;
            this.status.newInnerPage.appendChild(localStatus.dupeParent);
            localStatus.dupeParent = this._dh.newEmptyDupe(parent);
          }

          this._logService.log('Distribute');
          this._logService.log(localStatus);
          let dupParent = this.distributeElements(localStatus);
        }
      }
    }

    if (localStatus.dupeParent.children.length > 0) {
      this.status.newInnerPage.appendChild(localStatus.dupeParent);
    }
  }

  wrapTextNodesWithSpan(parent) {
    let ignoredFirst = false;
    parent.childNodes.forEach(node => {
      if (node.tagName === 'BR') {
        if (!ignoredFirst) {
          node.classList.add('pdf-ignore-height');
          ignoredFirst = true;
        }
      } else if (node.textContent.trim() !== '') {
        ignoredFirst = false;
      }

      if (node.nodeType === 3 && !(parent.tagName === 'LI' || parent.tagName === 'SPAN' || parent.tagName === 'EM' || parent.tagName === 'STRONG')) {
        const replacementNode = document.createElement('span');
        replacementNode.innerHTML = node.textContent;
        if (node.textContent.trim() === '') {
          return;
        }
        node.parentNode.insertBefore(replacementNode, node);
        node.parentNode.removeChild(node);
      }
    });

    return parent;
  }

  handleBlockWithInlineElements(localStatus, parent) {
    localStatus.subChild = parent;
    // localStatus.subChildTop = parent.dataset.frozenOffsetTop;
    localStatus.subChildHeight = this._dh.getHeight(parent);
    if (localStatus.pageBreakDone === false) {
      localStatus.pageBreakDone = true;
      this.status.newInnerPage.appendChild(localStatus.dupeParent);
      localStatus.dupeParent = this._dh.newEmptyDupe(parent);
    }
    this.distributeElements(localStatus);

    return localStatus;
  }

  distributeElements(localStatus) {
    this.wrapTextNodesWithSpan(localStatus.subChild);
    
    // If we have room to fill the next element (subChild)
    if ((this.status.pixelsFilled + localStatus.subChildHeight) < localStatus.pageInnerHeight ||
      localStatus.subChild.className.indexOf('pdf-ignore-height') > -1) { // if the content fits in the current page, add it to the page

        if (
        // (localStatus.dupePixelsFilled === localStatus.subChildHeight && (localStatus.subChildTop - localStatus.parentTop) === 0)
        // (localStatus.dupePixelsFilled === localStatus.subChildHeight) || //TODO: Uitgezet, sloopt andere logica...testen met jambo template
        localStatus.subChild.className.indexOf('pdf-ignore-height') > -1
        
      ) { // temporary fix for the problem where horizontal elements are treated like they are vertical
        // console.log('do this', localStatus.subChild.className.indexOf('pdf-ignore-height'), localStatus.dupePixelsFilled === localStatus.subChildHeight);
      } else {
        // console.log('add heigh', localStatus.subChild.className.indexOf('pdf-ignore-height'), localStatus.dupePixelsFilled === localStatus.subChildHeight);
        this.status.pixelsFilled += localStatus.subChildHeight;
        localStatus.dupePixelsFilled += localStatus.subChildHeight;
      }

      const node = document.createElement('div');
      for (let i = 0; i < localStatus.subChild.children.length; i++) {
        node.appendChild(localStatus.subChild.children[i].cloneNode(true));
      }

      if (this._dh.findPageBreak(node)) {
        this.processHTMLchildren(localStatus.subChild, localStatus.pageElements);
      } else {
        if (localStatus.subChild.tagName === 'BR' && !localStatus.dupeParent.children.length) {
          return;
        }

        const dupeNode = localStatus.subChild.cloneNode(true);
        localStatus.dupeParent.appendChild(dupeNode);
        localStatus.index++;
      }
      
      return localStatus.dupeParent;
    } else {
      // We don't have room to fill the complete subChild
      // Can we split the subChild text?
      if ((this._dh.isInline(localStatus.subChild) && localStatus.subChild.children.length === 0)) {
        localStatus = this.fillOnCurrentPage(localStatus);
      } else if(localStatus.subChild.tagName == 'VTB-ELEMENT-FIELD') { //make optional
        localStatus = this.fillElementField(localStatus);
      }

      if (localStatus.dupeParent.children.length > 0) {
        this.status.newInnerPage.appendChild(localStatus.dupeParent);
        localStatus = this._dh.resetDupe(localStatus, localStatus.parent);
      }

      if (
        (localStatus.pageElements.pageInner.className.indexOf('page-splittable') > -1 && this.status.prevElement !== localStatus.subChild) || 
        (localStatus.subChild.className.indexOf('splittable') > -1 && localStatus.subChild.children.length > 0)
      ) {
        // reserved for now
        this.status.prevElement = localStatus.subChild;
      } else if (this.status.newInnerPage.children.length > 0 && this.status.pixelsFilled > 0) {
        // if newPage is filled with elements, add it
        // (note: elements without content also atm, resulting in empty pages, this still needs a fix)
        this.addPage(false, localStatus.pageElements);
      }

      if(localStatus.subChild !== localStatus.parent) {
        this.processHTMLchildren(localStatus.subChild, localStatus.pageElements);
      } else {
        let parent = localStatus.originalParent.parentNode.cloneNode(true);
        parent.innerHTML = '';
        parent.appendChild(localStatus.subChild.cloneNode(true));
        this.processHTMLchildren(parent, localStatus.pageElements);
      }
    }
  }


  applyPageBreak(parent, localStatus, pageBreakObj) {
    this._logService.important('Apply pagebreak');

    // If the pageBreakObj has a depth of 0 we can apply the pageBreak immediately
    if (pageBreakObj.breakParent === true && pageBreakObj.depth === 0) {
      this._logService.important('This is the page break element');

      this.applyNoDepthPageBreak(parent, localStatus, pageBreakObj);
    } else {

      if(parent.children.length == 1 && parent.tagName == 'VTB-SEGMENT' && parent.children[0].className.indexOf('segment-elements') > -1) {
        parent = parent.children[0];
      }

      // If the pageBreak has depth, we need to loop over all children nodes recursively until we find the pageBreaks
      for (const child of parent.children) {
        const childPageBreakObj = this._dh.findPageBreak(child);

        // If a node has a pageBreak, then process this, else just process the nodes like normal
        if (childPageBreakObj != null) {
          // Process node containing a pageBreak
          if (childPageBreakObj.node.children.length > 0) {
            if (localStatus.dupeParent.children.length > 0) {
              this.status.newInnerPage.appendChild(localStatus.dupeParent);
              localStatus.parent = parent;
            }
            this.applyPageBreak(child, localStatus, childPageBreakObj);
          } else {
            if (childPageBreakObj.node.parentNode.className.indexOf('vtb-text-content') > -1) { // BETA: splitting HR inline content..
              localStatus = this.applyInlinePageBreak(parent, childPageBreakObj, localStatus);
            } else {
              if (!this._dh.hasBlockElementChildren(childPageBreakObj.node.parentNode.children)) {
                this.applyInlinePageBreak(parent, childPageBreakObj, localStatus);
              } else {
                this.wrapTextNodesWithSpan(childPageBreakObj.node.parentNode);
                for (const node of childPageBreakObj.node.parentNode.children) {
                  if (node === childPageBreakObj.node) {

                    this.status.newInnerPage.appendChild(localStatus.dupeParent);
                    this.addPage(false, localStatus.pageElements);
                    localStatus = this._dh.resetDupe(localStatus, parent);
                  } else {
                    localStatus.subChild = node;
                    localStatus.subChildHeight = this._dh.getHeight(node);
  
                    this.distributeElements(localStatus);
                  }
                }
              }
            }
          }
        } else {
          // Process node without pageBreak
          localStatus = this.applyNodeWithoutPageBreak(parent, localStatus, child);
        }
      }

      if (localStatus.dupeParent.children.length > 0) {
        this.status.newInnerPage.appendChild(localStatus.dupeParent);
      }
    }

    this._logService.important('Finished pagebreak loop');
  }

  applyNoDepthPageBreak(parent, localStatus, pageBreakObj) {
    // If the current localStatus has children, we need to add them to the current page and then create a new page
    if (localStatus.dupeParent.children.length) {
      this.status.newInnerPage.appendChild(localStatus.dupeParent);
      // this.status.newInnerPage.appendChild(parent);
      this.addPage(false, localStatus.pageElements);
      localStatus = this._dh.resetDupe(localStatus, localStatus.subChild.parentNode);
    } else {
      this.addPage(false, localStatus.pageElements);
    }

    localStatus.subChild = pageBreakObj.node;
    // localStatus.subChildTop = pageBreakObj.node.dataset.frozenOffsetTop;
    localStatus.subChildHeight = this._dh.getHeight(pageBreakObj.node);

    this.distributeElements(localStatus);

    return localStatus;
  }

  applyNodeWithoutPageBreak(parent, localStatus, child) {
    if (localStatus.parent !== child.parentNode) {
      if (localStatus.dupeParent.children.length > 0) {
        this.status.newInnerPage.appendChild(localStatus.dupeParent);
      }

      localStatus = this._dh.resetDupe(localStatus, child.parentNode);
      localStatus.parent = parent;
    }

    localStatus.subChild = child;
    // localStatus.subChildTop = child.dataset.frozenOffsetTop;
    localStatus.subChildHeight = this._dh.getHeight(child);

    this.distributeElements(localStatus);

    return localStatus;
  }

  applyInlinePageBreak(parent, childPageBreakObj, localStatus) {
    // Get the HTML of inline element
    this.wrapTextNodesWithSpan(childPageBreakObj.node.parentNode);

    const html = childPageBreakObj.node.parentNode.innerHTML;
    const re = /<hr.*?>/g;
    // Split the HTML on <hr>
    const frags = html.split(re);
    const parentNode = childPageBreakObj.node.parentNode.parentNode;

    // Check if the localStatus parent isn't the same as the parent of the current node
    if (localStatus.parent !== parentNode) {
      // If the dupeParent already has nodes, we need to add these to the curent page
      if (localStatus.dupeParent.children.length > 0) {
        this.status.newInnerPage.appendChild(localStatus.dupeParent);
      }

      // Then we need to set the `dupeParent` and `parent` properties to the parent of the current node
      localStatus = this._dh.resetDupe(localStatus, parentNode);
      localStatus.parent = parentNode;
    }

    frags.forEach((frag, index) => {
      if (index > 0) {
        this.status.newInnerPage.appendChild(localStatus.dupeParent);

        // Add the current page to the screen and create a new page
        this.addPage(false, localStatus.pageElements);
        localStatus = this._dh.resetDupe(localStatus, parent);
      }

      // Create a node for the content that needs to be added to the current page
      const currentPageNode = childPageBreakObj.node.parentNode.cloneNode(true);
      currentPageNode.innerHTML = frag;

      // when an element isn't on the screen we can't get the height
      // so we will put it on the screen just to check the height
      const page = this._dh.setupForHeightCheck(currentPageNode);

      document.getElementById('outputElement').appendChild(page); // add temp for height check
      localStatus.subChild = currentPageNode;
      localStatus.subChildHeight = this._dh.getHeight(currentPageNode) || currentPageNode.getBoundingClientRect().height;
      this.distributeElements(localStatus);
      document.getElementById('outputElement').removeChild(page); // remove after we got the height
    });

    return localStatus;
  }

  // Fit the text that still fits on the current page, keep the rest of the text for the next page.
  fillOnCurrentPage(localStatus) {
    const toFill = localStatus.pageInnerHeight - this.status.pixelsFilled;

    if (toFill < 20) { // Not enough free space to fill out text
      return localStatus;
    }

    const element = document.createElement(localStatus.subChild.tagName);
    const page = this._dh.setupForHeightCheck(element);
    document.getElementById('outputElement').appendChild(page);
    const frags = localStatus.subChild.textContent.split(/ /g);
    let endHeight = 0;

    // Add all the words one by one to the container, after every word check the current height of the wrapper
    // When the container gets largers than the toFill space we stop te loop
    // Inefficient? Yes, but it works...
    for (let i = 0; i < frags.length; i++) {
      const keep = element.innerHTML;
      element.innerHTML = (element.innerHTML === '') ? frags[i] : element.innerHTML + ' ' + frags[i];
      if (element.getBoundingClientRect().height >= toFill) {
        element.innerHTML = keep;
        endHeight = element.getBoundingClientRect().height;
        break;
      }
    }
    document.getElementById('outputElement').removeChild(page);

    localStatus.dupeParent.appendChild(element);
    localStatus.subChild.innerHTML = localStatus.subChild.innerHTML.replace(element.innerHTML, '');
    localStatus.subChildHeight = localStatus.subChildHeight - endHeight;

    this.status.pixelsFilled = localStatus.pageInnerHeight; // set the pixels filled to the total height, the page is completely filled now
    return localStatus;
  }

  fillElementField(localStatus) {
    const toFill = localStatus.pageInnerHeight - this.status.pixelsFilled;

    if (toFill < 20 || !localStatus.subChild.querySelector('.vtb-text-content')) { // Not enough free space to fill out text
      return localStatus;
    }

    let html  = localStatus.subChild.querySelector('.vtb-text-content').innerHTML.replace(/<\/?(?!br)(.*?)>/gi, '');
    let frags = html.split(/<\/?br>/i);

    const element = document.createElement('p');
    const page = this._dh.setupForHeightCheck(element);
    document.getElementById('outputElement').appendChild(page);
    let endHeight = 0;


    let lastI;
    for (let i = 0; i < frags.length; i++) {
      const keep = element.innerHTML;
      if(frags[i] == "") {
        element.innerHTML += '<br>';
      } else {
        element.innerHTML = (element.innerHTML === '') ? frags[i] : element.innerHTML + '<br>' + frags[i];
      }
      
      if (element.getBoundingClientRect().height >= toFill) {
        element.innerHTML = keep;
        endHeight = element.getBoundingClientRect().height;
        lastI = i;
        break;
      }
    }

    document.getElementById('outputElement').removeChild(page);

    if(lastI) {
      const returnElement = document.createElement('p');
      let returnHTML = '';

      for (let i = lastI; i < frags.length; i++) {
        if(frags[i] == '' && returnHTML !== '') {
          returnHTML += '<br>';
        } else {
          if(returnHTML !== '') {
            returnHTML += '<br>';
          }
          returnHTML += frags[i];
        }
      }

      localStatus.dupeParent.appendChild(element);
      returnElement.innerHTML = returnHTML;
      localStatus.subChild = returnElement;
      this.status.keepHeight = localStatus.subChildHeight - endHeight;
    }

    return localStatus;
  }
}