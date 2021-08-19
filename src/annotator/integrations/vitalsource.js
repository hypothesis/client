import { ListenerCollection } from '../../shared/listener-collection';
import warnOnce from '../../shared/warn-once';
import { HTMLIntegration } from './html';

import { parseJsonConfig } from '../../boot/parse-json-config';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Integration} Integration
 * @typedef {import('../../types/annotator').Selector} Selector
 */

/**
 * Identify which frame this is in the VitalSource Bookshelf reader.
 *
 * Returns `null` if this is not Bookshelf, `container-frame` if this is frame
 * where the sidebar should be loaded or `content-frame` if this is the frame
 * containing the chapter content.
 *
 * @return {'container-frame'|'content-frame'|null}
 */
export function vitalSourceFrameRole() {
  if (!window.origin.endsWith('.vitalsource.com')) {
    return null;
  }
  if (document.querySelector('mosaic-book')) {
    return 'container-frame';
  } else {
    return 'content-frame';
  }
}

/**
 * @param {HTMLIFrameElement} frame
 */
async function waitForIFrameToLoad(frame) {
  if (!frame.contentDocument) {
    throw new Error('Frame is not accessible');
  }

  if (frame.contentDocument.location.href === 'about:blank') {
    await new Promise(resolve => {
      frame.addEventListener('load', resolve);
    });
  } else {
    return;
  }
}

/**
 * Load the Hypothesis client into the VitalSource Bookshelf's content frame.
 *
 * The Bookshelf app contains multiple frames. This function should be run
 * in the "container" frame in order to configure and load the client into
 * the "content" frames where the chapter content is displayed.
 * See {@link vitalSourceFrameRole}.
 *
 * @param {string} bootScript - URL to the client's boot script
 */
export function loadClientInVitalSourceContentFrame(bootScript) {
  const bookElement = document.querySelector('mosaic-book');
  if (!bookElement || !bookElement.shadowRoot) {
    throw new Error(
      'Failed to set up Hypothesis integration with Bookshelf. Content frame not found.'
    );
  }

  /** @param {HTMLIFrameElement} contentFrame */
  const injectClient = async contentFrame => {
    await waitForIFrameToLoad(contentFrame);

    if (
      !contentFrame ||
      !contentFrame.contentDocument ||
      !contentFrame.contentWindow
    ) {
      warnOnce('VitalSource content frame not found or not accessible.');
      return;
    }

    const contentDocument = contentFrame.contentDocument;

    // When the client is injected by our browser extension, forward the
    // `assetRoot` and `*AppUrl` configuration provided by the extension.
    //
    // TODO - Re-use or share the logic for handling this with `FrameObserver`
    // so we don't have to duplicate it.
    const { assetRoot, sidebarAppUrl, notebookAppUrl } =
      parseJsonConfig(document);

    if (assetRoot) {
      const configScript = contentDocument.createElement('script');
      configScript.type = 'application/json';
      configScript.className = 'js-hypothesis-config';
      configScript.textContent = JSON.stringify({
        assetRoot,
        sidebarAppUrl,
        notebookAppUrl,
      });
      contentDocument.head.append(configScript);
    }

    // @ts-ignore
    contentFrame.contentWindow.hypothesisConfig = () => ({
      subFrameIdentifier: 'vitalsource-content',

      // TODO - Set configuration for LMS context if appropriate.
    });

    const script = contentDocument.createElement('script');
    script.src = bootScript;
    contentDocument.body.appendChild(script);
  };

  // Perform the initial injection into the currently loaded chapter.
  const shadowRoot = bookElement.shadowRoot;
  let contentFrame = shadowRoot.querySelector('iframe');
  if (!contentFrame) {
    return;
  }
  injectClient(contentFrame);

  // Re-inject client when the current chapter changes.
  const mo = new MutationObserver(() => {
    const newContentFrame = shadowRoot.querySelector('iframe');
    if (newContentFrame === contentFrame || !newContentFrame) {
      return;
    }
    contentFrame = newContentFrame;
    injectClient(contentFrame);
  });
  mo.observe(shadowRoot, { childList: true, subtree: true });
}

/**
 * Integration for VitalSource's Bookshelf ebook reader.
 *
 * The Bookshelf reader consists of several frames. This integration is for the
 * frame that contains the content of the current chapter. See {@link vitalSourceFrameRole}
 *
 * The VitalSource integration delegates to the standard HTML integration for
 * most functionality, but it adds logic to:
 *
 *  - Customize the document URI and metadata that is associated with annotations
 *  - Prevent VitalSource's built-in selection menu from getting in the way
 *    of the adder
 *  - (add other things here)
 *
 * @implements {Integration}
 */
export class VitalSourceIntegration {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this._htmlIntegration = new HTMLIntegration(container);

    this._listeners = new ListenerCollection();

    // Prevent mouse events from reaching the window. This prevents VitalSource
    // from showing its native selection menu, which obscures the client's
    // annotation toolbar.
    //
    // VitalSource only checks the selection on the `mouseup` and `mouseout` events,
    // but we also need to stop `mousedown` to prevent the client's `SelectionObserver`
    // from thinking that the mouse is held down when a selection change occurs.
    // This has the unwanted side effect of allowing the adder to appear while
    // dragging the mouse.
    //
    // This is a potentially brittle interaction between SelectionObserver and
    // VitalSourceIntegration. It would be better to find a more resilient
    // approach - perhaps enable integrations to customize selection interaction?
    //
    // Another option would be to pass in the Guest's root element to
    // `SelectionObserver` and prevent it from adding any event handlers to
    // elements outside of that.
    const stopEvents = ['mousedown', 'mouseup', 'mouseout'];
    for (let event of stopEvents) {
      this._listeners.add(document.documentElement, event, e => {
        e.stopPropagation();
      });
    }
  }

  destroy() {
    this._listeners.removeAll();
    this._htmlIntegration.destroy();
  }

  /**
   * @param {HTMLElement} root
   * @param {Selector[]} selectors
   */
  anchor(root, selectors) {
    return this._htmlIntegration.anchor(root, selectors);
  }

  /**
   * @param {HTMLElement} root
   * @param {Range} range
   */
  describe(root, range) {
    return this._htmlIntegration.describe(root, range);
  }

  contentContainer() {
    return this._htmlIntegration.contentContainer();
  }

  fitSideBySide() {
    // Not yet implemented
    return false;
  }

  async getMetadata() {
    // Return minimal metadata which includes only the information we really
    // want to include.
    return {
      title: document.title,
      link: [],
    };
  }

  async uri() {
    // An example of a typical URL for the chapter content in the Bookshelf reader is:
    //
    // https://jigsaw.vitalsource.com/books/9781848317703/epub/OPS/xhtml/chapter_001.html#cfi=/6/10%5B;vnd.vst.idref=chap001%5D!/4
    //
    // Where "9781848317703" is the VitalSource book ID ("vbid"), "chapter_001.html"
    // is the location of the HTML page for the current chapter within the book
    // and the `#cfi` fragment identifies the scroll location.
    //
    // Note that this URL is typically different than what is displayed in the
    // iframe's `src` attribute.

    // Strip off search parameters and fragments.
    const uri = new URL(document.location.href);
    uri.search = '';
    return uri.toString();
  }

  /**
   * @param {Anchor} anchor
   */
  async scrollToAnchor(anchor) {
    return this._htmlIntegration.scrollToAnchor(anchor);
  }
}
