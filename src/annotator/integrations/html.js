import { anchor, describe } from '../anchoring/html';

import { HTMLMetadata } from './html-metadata';
import {
  guessMainContentArea,
  preserveScrollPosition,
} from './html-side-by-side';
import { scrollElementIntoView } from '../util/scroll';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').FeatureFlags} FeatureFlags
 * @typedef {import('../../types/annotator').Integration} Integration
 * @typedef {import('../../types/annotator').SidebarLayout} SidebarLayout
 */

// When activating side-by-side mode, make sure there is at least this amount
// of space (in pixels) left for the document's content. Any narrower and the
// content line lengths and scale are too short to be readable.
const MIN_HTML_WIDTH = 480;

/**
 * Document type integration for ordinary web pages.
 *
 * This integration is used for web pages and applications that are not handled
 * by a more specific integration (eg. for PDFs).
 *
 * @implements {Integration}
 */
export class HTMLIntegration {
  /**
   * @param {object} options
   *   @param {FeatureFlags} options.features
   *   @param {HTMLElement} [options.container]
   */
  constructor({ features, container = document.body }) {
    this.features = features;
    this.container = container;
    this.anchor = anchor;
    this.describe = describe;

    this._htmlMeta = new HTMLMetadata();

    /** Whether to attempt to resize the document to fit alongside sidebar. */
    this._sideBySideEnabled = this.features.flagEnabled('html_side_by_side');

    /**
     * Whether the document is currently being resized to fit alongside an
     * open sidebar.
     */
    this._sideBySideActive = false;

    /** @type {SidebarLayout|null} */
    this._lastLayout = null;

    this._flagsChanged = () => {
      const sideBySide = features.flagEnabled('html_side_by_side');
      if (sideBySide !== this._sideBySideEnabled) {
        this._sideBySideEnabled = sideBySide;

        // `fitSideBySide` is normally called by Guest when the sidebar layout
        // changes. When the feature flag changes, we need to re-run the method.
        if (this._lastLayout) {
          this.fitSideBySide(this._lastLayout);
        }
      }
    };
    this.features.on('flagsChanged', this._flagsChanged);
  }

  canAnnotate() {
    return true;
  }

  destroy() {
    this.features.off('flagsChanged', this._flagsChanged);
  }

  contentContainer() {
    return this.container;
  }

  /**
   * @param {SidebarLayout} layout
   */
  fitSideBySide(layout) {
    this._lastLayout = layout;

    const maximumWidthToFit = window.innerWidth - layout.width;
    const active =
      this._sideBySideEnabled &&
      layout.expanded &&
      maximumWidthToFit >= MIN_HTML_WIDTH;

    if (active) {
      // nb. We call `_activateSideBySide` regardless of whether side-by-side
      // is already active because the sidebar width might be different.
      this._activateSideBySide(layout.width);
    } else if (this._sideBySideActive) {
      this._deactivateSideBySide();
    }
    this._sideBySideActive = active;
    return active;
  }

  /**
   * Resize the document content after side-by-side mode is activated.
   *
   * @param {number} sidebarWidth
   */
  _activateSideBySide(sidebarWidth) {
    // When side-by-side mode is activated, what we want to achieve is that the
    // main content of the page is fully visible alongside the sidebar, with
    // as much space given to the main content as possible. A challenge is that
    // we don't know how the page will respond to reducing the width of the body.
    //
    // - The content might have margins which automatically get reduced as the
    //   available width is reduced. For example a blog post with a fixed-width
    //   article in the middle and `margin: auto` for both margins.
    //
    //   In this scenario we'd want to reduce the document width by the full
    //   width of the sidebar.
    //
    // - There might be sidebars to the left and/or right of the main content
    //   which cause the main content to be squashed when the width is reduced.
    //   For example a news website with a column of ads on the right.
    //
    //   In this scenario we'd want to not reduce the document width or reduce
    //   it by a smaller amount and let the Hypothesis sidebar cover up the
    //   document's sidebar, leaving as much space as possible to the content.
    //
    // Therefore what we do is to initially reduce the width of the document by
    // the full width of the sidebar, then we use heuristics to analyze the
    // resulting page layout and determine whether there is significant "free space"
    // (ie. anything that is not the main content of the document, such as ads or
    // links to related stories) to the right of the main content. If there is,
    // we make the document wider again to allow more space for the main content.
    //
    // These heuristics assume a typical "article" page with one central block
    // of content. If we can't find the "main content" then we just assume that
    // everything on the page is potentially content that the user might want
    // to annotate and so try to keep it all visible.

    // nb. 12px padding is a multiple of the 4px grid unit in our design system.
    const padding = 12;
    const rightMargin = sidebarWidth + padding;

    /** @param {HTMLElement} element */
    const computeLeftMargin = element =>
      parseInt(window.getComputedStyle(element).marginLeft, 10);

    preserveScrollPosition(() => {
      // nb. Adjusting the body size this way relies on the page not setting a
      // width on the body. For sites that do this won't work.

      // Remove any margins we've previously set
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';

      // Keep track of what left margin would be naturally without right margin set
      const beforeBodyLeft = computeLeftMargin(document.body);

      document.body.style.marginRight = `${rightMargin}px`;

      const contentArea = guessMainContentArea(document.body);
      if (contentArea) {
        // Check if we can give the main content more space by letting the
        // sidebar overlap stuff in the document to the right of the main content.
        const freeSpace = Math.max(
          0,
          window.innerWidth - rightMargin - contentArea.right
        );
        if (freeSpace > 0) {
          const adjustedMargin = Math.max(0, rightMargin - freeSpace);
          document.body.style.marginRight = `${adjustedMargin}px`;
        }

        // Changes to right margin can affect left margin in cases where body
        // has `margin:auto`. It's OK to move the body to the left to make
        // space, but avoid moving it to the right.
        // See https://github.com/hypothesis/client/issues/4280
        const afterBodyLeft = computeLeftMargin(document.body);
        if (afterBodyLeft > beforeBodyLeft) {
          document.body.style.marginLeft = `${beforeBodyLeft}px`;
        }

        // If the main content appears to be right up against the edge of the
        // window, add padding for readability.
        if (contentArea.left < padding) {
          document.body.style.marginLeft = `${padding}px`;
        }
      } else {
        document.body.style.marginLeft = '';
        document.body.style.marginRight = '';
      }
    });
  }

  /**
   * Undo the effects of `activateSideBySide`.
   */
  _deactivateSideBySide() {
    preserveScrollPosition(() => {
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });
  }

  async getMetadata() {
    return this._htmlMeta.getDocumentMetadata();
  }

  async uri() {
    return this._htmlMeta.uri();
  }

  /**
   * @param {Anchor} anchor
   */
  async scrollToAnchor(anchor) {
    const highlight = anchor.highlights?.[0];
    if (!highlight) {
      return;
    }
    await scrollElementIntoView(highlight);
  }
}
