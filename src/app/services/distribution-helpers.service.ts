import { Injectable } from '@angular/core';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class DistributionHelpersService {
  inlineElements = [
    'br',
    'span',
    'strong',
    'em',
    'i',
    'b',
    'code',
    'sub',
    'sup',
    'hr'
  ];

  constructor(private _logService: LogService) { }

  generateElementData(node, childNodes) {
    const pageElements: any = {};

    if (node.nextSibling) {
      pageElements.nextSibling = node.nextSibling;
    }

    for (const subChild of childNodes) {
      if (subChild.className.indexOf('page-inner') > -1) {
        pageElements.pageInner = subChild;
      }
      if (subChild.className.indexOf('page-header') > -1) {
        pageElements.pageHeader = subChild;
      }
      if (subChild.className.indexOf('page-footer') > -1) {
        pageElements.pageFooter = subChild;
      }
    }

    pageElements.pageClass = node.className.replace('dynamic-pages', 'page');
    return pageElements;
  }

  createLocalStatus(parent, pageElements) {
    const pageInnerPadding: any = this.getStyleHeights(pageElements.pageInner, ['paddingTop', 'paddingBottom']);

    return {
      parentTop: parent.dataset.frozenOffsetTop,
      dupePixelsFilled: 0,
      index: 0,
      pageInnerHeight: pageElements.pageInner.getBoundingClientRect().height - (pageInnerPadding.paddingTop + pageInnerPadding.paddingBottom),
      dupeParent: this.newEmptyDupe(parent),
      parent: parent,
      pageElements: pageElements,
      pageBreakDone: true,
      originalParent: parent
    };
  }

  findPageBreak(node, depth = 0) {
    let found = null;
    if (node.className.indexOf('page-break') > -1) {
      this._logService.log('Found page break');
      this._logService.log('Depth: ' + depth);
      return { node: node, breakParent: true, depth: depth };
    }
    for (const child of node.children) {
      if (child.nodeName === 'HR') {
        found = { node: child, breakParent: false, depth: depth };
      } else if (child.children.length > 0) {
        found = this.findPageBreak(child, depth++);
      }
      if (found !== null) {
        break;
      }
    }
    return found;
  }

  getStyleHeights(node, styles) {
    const subChildStyle = node.currentStyle || window.getComputedStyle(node);
    const obj = {};
    for (const propertyName of styles) {
      obj[propertyName] = this.getPixelHeight(subChildStyle[propertyName]);
    }
    return obj;
  }

  getPixelHeight(val) {
    return Number(val.replace('px', ''));
  }

  newEmptyDupe(node) {
    const dupe = node.cloneNode(true);
    while (dupe.firstChild) {
      dupe.removeChild(dupe.firstChild);
    }
    return dupe;
  }

  getHeight(node) {
    const styleHeights = this.getStyleHeights(node, ['marginBottom', 'marginTop']);
    let plusHeight = 0;

    for (const propertyName in styleHeights) {
      if (styleHeights.hasOwnProperty(propertyName)) {
        plusHeight += styleHeights[propertyName];
      }
    }

    plusHeight += node.getBoundingClientRect().height;
    return plusHeight;
  }

  resetDupe(localStatus, parent) {
    localStatus.dupeParent = this.newEmptyDupe(parent);
    localStatus.dupePixelsFilled = 0;
    localStatus.index = 0;
    return localStatus;
  }

  isInline(node) {
    const cStyle = node.currentStyle || window.getComputedStyle(node, '');
    return (cStyle.display === 'inline');
  }


  setupForHeightCheck(currentPageNode) {
    const page = document.createElement('div');
    page.classList.add('page');

    const pageInner = document.createElement('div');
    pageInner.classList.add('page-inner');
    pageInner.classList.add('page-no-header');
    pageInner.classList.add('page-no-footer');

    pageInner.appendChild(currentPageNode);

    page.appendChild(pageInner);

    return page;
  }

  hasBlockElementChildren(elements) {
    let hasBlocks = false;

    for (const element of elements) {
      const tagName = element.tagName.toLowerCase();
      if (this.inlineElements.indexOf(tagName) === -1) {
        hasBlocks = true;
      }
    }
    return hasBlocks;
  }
}
