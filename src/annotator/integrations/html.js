import { anchor, describe } from '../anchoring/html';

import { HTMLMetadata } from './html-metadata';

export class HTMLIntegration {
  constructor(container = document.body) {
    this.container = container;
    this.anchor = anchor;
    this.describe = describe;

    this._htmlMeta = new HTMLMetadata();
  }

  destroy() {
    // There is nothing to do here yet.
  }

  contentContainer() {
    return this.container;
  }

  fitSideBySide() {
    // Not yet implemented.
    return false;
  }

  async getMetadata() {
    return this._htmlMeta.getDocumentMetadata();
  }

  async uri() {
    return this._htmlMeta.uri();
  }
}
