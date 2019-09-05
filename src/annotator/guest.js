'use strict';

const raf = require('raf');
const scrollIntoView = require('scroll-into-view');
const CustomEvent = require('custom-event');
const $ = require('jquery');

const adder = require('./adder');
const Delegator = require('./delegator');
const htmlAnchoring = require('./anchoring/html');
const highlighter = require('./highlighter');
const rangeUtil = require('./range-util');
const selections = require('./selections');
const xpathRange = require('./anchoring/range');
const { normalizeURI } = require('./util/url');

const animationPromise = fn => {
  return new Promise((resolve, reject) => {
    return raf(() => {
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    });
  });
};

class Guest extends Delegator {
  constructor(element, config, anchoring = htmlAnchoring) {
    super(element, config);

    this.adder = $('<hypothesis-adder></hypothesis-adder>')
      .appendTo(this.element)
      .hide();

    this.adderCtrl = new adder.Adder(this.adder[0], {
      onAnnotate: () => {
        this.createAnnotation();
        document.getSelection().removeAllRanges();
      },

      onHighlight: () => {
        this.setVisibleHighlights(true);
        this.createHighlight();
        document.getSelection().removeAllRanges();
      },
    });

    this.selections = selections(document).subscribe({
      next: range => {
        if (range) {
          this._onSelection(range);
        } else {
          this._onClearSelection();
        }
      },
    });
    this.plugins = {};
    this.anchors = [];
    this.visibleHighlights = false;

    // Set the frame identifier if it's available.
    // The "top" guest instance will have this as null since it's in a top frame not a sub frame
    this.frameIdentifier = config.subFrameIdentifier || null;

    this.anchoring = anchoring;

    const cfOptions = {
      config,
      on: (event, handler) => this.subscribe(event, handler),
      emit: (event, ...args) => this.publish(event, args),
    };

    this.addPlugin('CrossFrame', cfOptions);
    this.crossframe = this.plugins.CrossFrame;

    this.crossframe.onConnect(() => this._setupInitialState(config));
    this._connectAnnotationSync();
    this._connectAnnotationUISync(this.crossframe);

    // Load plugins.
    for (let name in this.options) {
      if (!this.options.hasOwnProperty(name)) {
        continue;
      }
      const opts = this.options[name];
      if (!this.plugins[name] && this.options.pluginClasses[name]) {
        this.addPlugin(name, opts);
      }
    }
  }

  addPlugin(name, options) {
    if (this.plugins[name]) {
      console.error('You cannot have more than one instance of any plugin');
    } else {
      const Class = this.options.pluginClasses[name];
      if (typeof Class === 'function') {
        // eslint-disable-next-line new-cap
        this.plugins[name] = new Class(this.element[0], options);
        this.plugins[name].annotator = this;
        if (this.plugins[name].pluginInit) {
          this.plugins[name].pluginInit();
        }
      } else {
        console.error(`Could not load ${name} plugin`);
      }
    }
    return this; // Allow chaining.
  }

  /** Get the document info. */
  getDocumentInfo() {
    let uriPromise;
    let metadataPromise;

    if (this.plugins.PDF) {
      metadataPromise = Promise.resolve(this.plugins.PDF.getMetadata());
      uriPromise = Promise.resolve(this.plugins.PDF.uri());
    } else if (this.plugins.Document) {
      uriPromise = Promise.resolve(this.plugins.Document.uri());
      metadataPromise = Promise.resolve(this.plugins.Document.metadata);
    } else {
      uriPromise = Promise.reject();
      metadataPromise = Promise.reject();
    }

    uriPromise = uriPromise.catch(() =>
      decodeURIComponent(window.location.href)
    );
    metadataPromise = metadataPromise.catch(() => ({
      title: document.title,
      link: [{ href: decodeURIComponent(window.location.href) }],
    }));

    return Promise.all([metadataPromise, uriPromise]).then(
      ([metadata, href]) => ({
        uri: normalizeURI(href),
        metadata,
        frameIdentifier: this.frameIdentifier,
      })
    );
  }

  _setupInitialState(config) {
    this.publish('panelReady');
    this.setVisibleHighlights(config.showHighlights === 'always');
  }

  _connectAnnotationSync() {
    this.subscribe('annotationDeleted', annotation => this.detach(annotation));
    this.subscribe('annotationsLoaded', annotations =>
      annotations.forEach(ann => this.anchor(ann))
    );
  }

  _connectAnnotationUISync(crossframe) {
    crossframe.on('focusAnnotations', (tags = []) => {
      for (let anchor of this.anchors) {
        if (!anchor.highlights) {
          continue;
        }
        const toggle = tags.indexOf(anchor.annotation.$tag) !== -1;
        $(anchor.highlights).toggleClass('annotator-hl-focused', toggle);
      }
    });

    crossframe.on('scrollToAnnotation', tag => {
      for (let anchor of this.anchors) {
        if (!anchor.highlights) {
          continue;
        }
        if (anchor.annotation.$tag !== tag) {
          continue;
        }
        const event = new CustomEvent('scrolltorange', {
          bubbles: true,
          cancelable: true,
          detail: anchor.range,
        });
        const defaultNotPrevented = this.element[0].dispatchEvent(event);
        if (defaultNotPrevented) {
          scrollIntoView(anchor.highlights[0]);
        }
      }
    });

    crossframe.on('getDocumentInfo', cb => {
      this.getDocumentInfo()
        .then(info => cb(null, info))
        .catch(err => cb(err));
    });

    crossframe.on('setVisibleHighlights', state =>
      this.setVisibleHighlights(state)
    );
  }

  destroy() {
    $('#annotator-dynamic-style').remove();

    this.selections.unsubscribe();
    this.adder.remove();
    this.element.find('.annotator-hl').each(function() {
      $(this)
        .contents()
        .insertBefore(this);
      $(this).remove();
    });

    this.element.data('annotator', null);

    Object.keys(this.plugins).forEach(name => this.plugins[name].destroy());

    super.destroy();
  }

  anchor(annotation) {
    const root = this.element[0];

    // Anchors for all annotations are in the `anchors` instance property.
    // These are anchors for this annotation only. After all the targets
    // have been processed these will be appended to the list of anchors known
    // to the instance. Anchors hold an annotation, a target of that annotation,
    // a document range for that target and an array of highlights.
    const anchors = [];

    // The targets that are already anchored. This function consults this to
    // determine which targets can be left alone.
    const anchoredTargets = [];

    // These are the highlights for existing anchors of this annotation with
    // targets that have since been removed from the annotation.
    // These will be removed by this function.
    let deadHighlights = [];

    // Initialize the target array;
    if (!annotation.target) {
      annotation.target = [];
    }

    const locate = target => {
      // Check that the anchor has a `TextQuoteSelector`. Without a
      // `TextQuoteSelector` we have no basis on which to verify that we have
      // reanchored correctly and so we shouldn't even try.
      //
      // Returning an anchor without a range will result in this annotation
      // being treated as an orphan (assuming no other targets anchor).
      if (!(target.selector || []).some(s => s.type === 'TextQuoteSelector')) {
        return Promise.resolve({ annotation, target });
      }

      const options = {
        cache: this.anchoringCache,
        ignoreSelector: '[class^="annotator-"]',
      };

      return this.anchoring
        .anchor(root, target.selector, options)
        .then(range => ({ annotation, target, range }))
        .catch(() => ({ annotation, target }));
    };

    const highlight = anchor => {
      // Highlight the range for an anchor.
      if (!anchor.range) {
        return anchor;
      }

      return animationPromise(() => {
        const range = xpathRange.sniff(anchor.range);
        const normedRange = range.normalize(root);
        const highlights = highlighter.highlightRange(normedRange);

        $(highlights).data('annotation', anchor.annotation);
        anchor.highlights = highlights;
        return anchor;
      });
    };

    const sync = anchors => {
      // Store the results of anchoring.
      //
      // An annotation is considered to be an orphan if it has at least one
      // target with selectors, and all targets with selectors failed to anchor
      // (i.e. we didn't find it in the page and thus it has no range).
      let hasAnchorableTargets = false;
      let hasAnchoredTargets = false;

      for (let anchor of anchors) {
        if (anchor.target.selector) {
          hasAnchorableTargets = true;
          if (anchor.range) {
            hasAnchoredTargets = true;
            break;
          }
        }
      }

      annotation.$orphan = hasAnchorableTargets && !hasAnchoredTargets;

      // Add the anchors for this annotation to instance storage.
      this.anchors = this.anchors.concat(anchors);

      // Let plugins know about the new information.
      if (this.plugins.BucketBar) {
        this.plugins.BucketBar.update();
      }
      if (this.plugins.CrossFrame) {
        this.plugins.CrossFrame.sync([annotation]);
      }

      return anchors;
    };

    // Remove all the anchors for this annotation from the instance storage.
    for (let anchor of this.anchors.splice(0, this.anchors.length)) {
      if (anchor.annotation === annotation) {
        // Anchors are valid as long as they still have a range and their target
        // is still in the list of targets for this annotation.
        if (anchor.range && annotation.target.includes(anchor.target)) {
          anchors.push(anchor);
          anchoredTargets.push(anchor.target);
        } else if (anchor.highlights) {
          // These highlights are no longer valid and should be removed.
          deadHighlights = deadHighlights.concat(anchor.highlights);
          delete anchor.highlights;
          delete anchor.range;
        }
      } else {
        // These can be ignored, so push them back onto the new list.
        this.anchors.push(anchor);
      }
    }

    // Remove all the highlights that have no corresponding target any more.
    raf(() => {
      highlighter.removeHighlights(deadHighlights);
    });

    // Anchor any targets of this annotation that are not anchored already.
    for (let target of annotation.target) {
      if (!anchoredTargets.includes(target)) {
        const anchor = locate(target).then(highlight);
        anchors.push(anchor);
      }
    }

    return Promise.all(anchors).then(sync);
  }

  detach(annotation) {
    const anchors = [];
    const unhighlight = [];

    for (let anchor of this.anchors) {
      if (anchor.annotation === annotation) {
        const highlights = anchor.highlights || [];
        unhighlight.push(...highlights);
      } else {
        anchors.push(anchor);
      }
    }

    this.anchors = anchors;

    raf(() => {
      highlighter.removeHighlights(unhighlight);
      if (this.plugins.BucketBar) {
        this.plugins.BucketBar.update();
      }
    });
  }

  createAnnotation(annotation = {}) {
    const root = this.element[0];
    const ranges = this.selectedRanges || [];
    this.selectedRanges = null;

    const getSelectors = range => {
      const options = {
        cache: this.anchoringCache,
        ignoreSelector: '[class^="annotator-"]',
      };
      // Returns an array of selectors for the passed range.
      return this.anchoring.describe(root, range, options);
    };

    const setDocumentInfo = info => {
      annotation.document = info.metadata;
      annotation.uri = info.uri;
    };

    const setTargets = ([info, selectors]) => {
      // `selectors` is an array of arrays. Each item is an array of selectors
      // identifying a distinct target.
      const source = info.uri;
      annotation.target = selectors.map(selector => ({ source, selector }));
    };

    const info = this.getDocumentInfo();
    const selectors = Promise.all(ranges.map(getSelectors));

    info.then(setDocumentInfo);

    const targets = Promise.all([info, selectors]).then(setTargets);
    targets.then(() => this.publish('beforeAnnotationCreated', [annotation]));
    targets.then(() => this.anchor(annotation));

    if (this.crossframe && !annotation.$highlight) {
      this.crossframe.call('showSidebar');
    }

    return annotation;
  }

  createHighlight() {
    return this.createAnnotation({ $highlight: true });
  }

  /** Create a blank comment (AKA "page note") */
  createComment() {
    const annotation = {};
    const prepare = info => {
      annotation.document = info.metadata;
      annotation.uri = info.uri;
      annotation.target = [{ source: info.uri }];
    };

    this.getDocumentInfo()
      .then(prepare)
      .then(() => this.publish('beforeAnnotationCreated', [annotation]));

    return annotation;
  }

  /**
   * Deletes the annotation by removing highlights from the DOM.
   *
   * Publishes the "annotationDeleted" event on completion.
   */
  deleteAnnotation(annotation) {
    if (annotation.highlights) {
      annotation.highlights
        .filter(h => h.parentNode)
        .forEach(h => $(h).replaceWith(h.childNodes));
    }
    this.publish('annotationDeleted', [annotation]);
  }

  showAnnotations(annotations) {
    const tags = annotations.map(ann => ann.$tag);
    if (this.crossframe) {
      this.crossframe.call('showAnnotations', tags);
      this.crossframe.call('showSidebar');
    }
  }

  toggleAnnotationSelection(annotations) {
    const tags = annotations.map(ann => ann.$tag);
    if (this.crossframe) {
      this.crossframe.call('toggleAnnotationSelection', tags);
    }
  }

  updateAnnotations(annotations) {
    const tags = annotations.map(ann => ann.$tag);
    if (this.crossframe) {
      this.crossframe.call('updateAnnotations', tags);
    }
  }

  focusAnnotations(annotations) {
    const tags = annotations.map(ann => ann.$tag);
    if (this.crossframe) {
      this.crossframe.call('focusAnnotations', tags);
    }
  }

  _onSelection(range) {
    const selection = document.getSelection();
    const isBackwards = rangeUtil.isSelectionBackwards(selection);
    const focusRect = rangeUtil.selectionFocusRect(selection);

    if (!focusRect) {
      // The selected range does not contain any text.
      this._onClearSelection();
      return;
    }

    this.selectedRanges = [range];

    $('.annotator-toolbar .h-icon-note')
      .attr('title', 'New Annotation')
      .removeClass('h-icon-note')
      .addClass('h-icon-annotate');

    const { left, top, arrowDirection } = this.adderCtrl.target(
      focusRect,
      isBackwards
    );
    this.adderCtrl.showAt(left, top, arrowDirection);
  }

  _onClearSelection() {
    this.adderCtrl.hide();
    this.selectedRanges = [];

    $('.annotator-toolbar .h-icon-annotate')
      .attr('title', 'New Page Note')
      .removeClass('h-icon-annotate')
      .addClass('h-icon-note');
  }

  selectAnnotations(annotations, toggle) {
    if (toggle) {
      this.toggleAnnotationSelection(annotations);
    } else {
      this.showAnnotations(annotations);
    }
  }

  onElementClick() {
    if (!this.selectedTargets || !this.selectedTargets.length) {
      if (this.crossframe) {
        this.crossframe.call('hideSidebar');
      }
    }
  }

  onElementTouchStart() {
    // Mobile browsers do not register click events on elements without
    // `cursor: pointer`. So instead of adding that to every element, we can add
    // the initial `touchstart` event which is always registered to make up for
    // the lack of click support for all elements.
    if (!this.selectedTargets || !this.selectedTargets.length) {
      if (this.crossframe) {
        this.crossframe.call('hideSidebar');
      }
    }
  }

  onHighlightMouseover(event) {
    if (!this.visibleHighlights) {
      return;
    }

    if (!event.annotations) {
      event.annotations = [];
    }
    const annotation = $(event.currentTarget).data('annotation');
    event.annotations.push(annotation);

    // The innermost highlight will execute this.
    // The timeout gives time for the event to bubble, letting any overlapping
    // highlights have time to add their annotations to the list stored on
    // the event object.
    if (event.target === event.currentTarget) {
      setTimeout(() => this.focusAnnotations(event.annotations));
    }
  }

  onHighlightMouseout() {
    if (!this.visibleHighlights) {
      return;
    }
    this.focusAnnotations([]);
  }

  onHighlightClick(event) {
    if (!this.visibleHighlights) {
      return;
    }

    const annotation = $(event.currentTarget).data('annotation');
    if (!event.annotations) {
      event.annotations = [];
    }
    event.annotations.push(annotation);

    // See comments in `onHighlightMouseover`.
    if (event.target === event.currentTarget) {
      const xor = event.metaKey || event.ctrlKey;
      setTimeout(() => this.selectAnnotations(event.annotations, xor));
    }
  }

  /**
   * Pass `true` to show the highlights in the frame or `false` to disable.
   */
  setVisibleHighlights(shouldShowHighlights) {
    this.toggleHighlightClass(shouldShowHighlights);
  }

  toggleHighlightClass(shouldShowHighlights) {
    const showClass = 'annotator-highlights-always-on';
    if (shouldShowHighlights) {
      this.element.addClass(showClass);
    } else {
      this.element.removeClass(showClass);
    }
    this.visibleHighlights = shouldShowHighlights;
  }
}

// Events bound by `Delegator` constructor.
// nb. This field must be on the prototype because the `Delegator` constructor uses it.
Guest.prototype.events = {
  '.annotator-hl click': 'onHighlightClick',
  '.annotator-hl mouseover': 'onHighlightMouseover',
  '.annotator-hl mouseout': 'onHighlightMouseout',

  click: 'onElementClick',
  touchstart: 'onElementTouchStart',
};

// nb. This field must be on the prototype because the `Delegator` constructor uses it.
Guest.prototype.options = {
  Document: {},
  TextSelection: {},
};

module.exports = Guest;
