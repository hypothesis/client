import BucketBar from '../bucket-bar';
import { $imports } from '../bucket-bar';

// Return DOM elements for non-empty bucket indicators in a `BucketBar`
// (i.e. bucket tab elements containing 1 or more anchors)
const nonEmptyBuckets = function (bucketBar) {
  const buckets = bucketBar.element.querySelectorAll(
    '.annotator-bucket-indicator'
  );
  return Array.from(buckets).filter(bucket => {
    const label = bucket.querySelector('.label');
    return !!label;
  });
};

const createMouseEvent = function (type, { ctrlKey, metaKey } = {}) {
  return new MouseEvent(type, { ctrlKey, metaKey });
};

// Create a fake anchor, which is a combination of annotation object and
// associated highlight elements.
const createAnchor = () => {
  return {
    annotation: { $tag: 'ann1' },
    highlights: [document.createElement('span')],
  };
};

describe('BucketBar', () => {
  const sandbox = sinon.createSandbox();
  let fakeAnnotator;
  let fakeBucketUtil;
  let fakeHighlighter;
  let fakeScrollIntoView;
  let bucketBar;

  const createBucketBar = function (options) {
    const element = document.createElement('div');
    return new BucketBar(element, options || {}, fakeAnnotator);
  };

  beforeEach(() => {
    fakeAnnotator = {
      anchors: [],
      selectAnnotations: sinon.stub(),
    };

    fakeBucketUtil = {
      findClosestOffscreenAnchor: sinon.stub(),
      constructPositionPoints: sinon
        .stub()
        .returns({ above: [], below: [], points: [] }),
      buildBuckets: sinon.stub().returns([]),
    };

    fakeHighlighter = {
      setHighlightsFocused: sinon.stub(),
    };

    fakeScrollIntoView = sinon.stub();

    $imports.$mock({
      'scroll-into-view': fakeScrollIntoView,
      '../highlighter': fakeHighlighter,
      '../util/buckets': fakeBucketUtil,
    });

    sandbox.stub(window, 'requestAnimationFrame').yields();
  });

  afterEach(() => {
    bucketBar?.destroy();
    $imports.$restore();
    sandbox.restore();
  });

  describe('initializing and attaching to the DOM', () => {
    let containerEl;

    beforeEach(() => {
      // Any element referenced by `options.container` selector needs to be
      // present on the `document` before initialization
      containerEl = document.createElement('div');
      containerEl.className = 'bucket-bar-container';
      document.body.appendChild(containerEl);
      sandbox.stub(console, 'warn'); // Restored in test-global `afterEach`
    });

    afterEach(() => {
      containerEl.remove();
    });

    it('will append its element to any supplied `options.container` selector', () => {
      bucketBar = createBucketBar({ container: '.bucket-bar-container' });
      assert.exists(containerEl.querySelector('.annotator-bucket-bar'));
    });

    it('will append itself to the element passed to constructor if `options.container` non-existent', () => {
      bucketBar = createBucketBar({ container: '.bucket-bar-nope' });
      assert.notExists(containerEl.querySelector('.annotator-bucket-bar'));
      assert.calledOnce(console.warn);
    });
  });

  describe('updating buckets', () => {
    it('should update buckets when the window is resized', () => {
      bucketBar = createBucketBar();
      assert.notCalled(fakeBucketUtil.buildBuckets);
      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(fakeBucketUtil.buildBuckets);
    });

    it('should update buckets when the window is scrolled', () => {
      bucketBar = createBucketBar();
      assert.notCalled(fakeBucketUtil.buildBuckets);
      window.dispatchEvent(new Event('scroll'));
      assert.calledOnce(fakeBucketUtil.buildBuckets);
    });

    context('when scrollables provided', () => {
      let scrollableEls = [];

      beforeEach(() => {
        const scrollableEls1 = document.createElement('div');
        scrollableEls1.className = 'scrollable-1';
        const scrollableEls2 = document.createElement('div');
        scrollableEls2.className = 'scrollable-2';
        scrollableEls.push(scrollableEls1, scrollableEls2);
        document.body.appendChild(scrollableEls1);
        document.body.appendChild(scrollableEls2);
      });

      afterEach(() => {
        // Explicitly call `destroy` before removing scrollable elements
        // from document to test the scrollable-remove-events path of
        // the `destroy` method. Otherwise, this afterEach will execute
        // before the test-global one that calls `destroy`, and there will
        // be no scrollable elements left in the document.
        bucketBar.destroy();
        scrollableEls.forEach(el => el.remove());
      });

      it('should update buckets when any scrollable scrolls', () => {
        bucketBar = createBucketBar({
          scrollables: ['.scrollable-1', '.scrollable-2'],
        });
        assert.notCalled(fakeBucketUtil.buildBuckets);
        scrollableEls[0].dispatchEvent(new Event('scroll'));
        assert.calledOnce(fakeBucketUtil.buildBuckets);
        scrollableEls[1].dispatchEvent(new Event('scroll'));
        assert.calledTwice(fakeBucketUtil.buildBuckets);
      });
    });

    it('should not update if another update is pending', () => {
      bucketBar._updatePending = true;
      bucketBar.update();
      assert.notCalled(window.requestAnimationFrame);
    });
  });

  describe('user interactions with buckets', () => {
    beforeEach(() => {
      bucketBar = createBucketBar();
      // Create fake anchors and render buckets.
      const anchors = [createAnchor()];

      fakeBucketUtil.buildBuckets.returns([
        { anchors: [anchors[0]], position: 250 },
      ]);

      bucketBar.annotator.anchors = anchors;
      bucketBar.update();
    });

    it('highlights the bucket anchors when pointer device moved into bucket', () => {
      const bucketEls = nonEmptyBuckets(bucketBar);
      bucketEls[0].dispatchEvent(createMouseEvent('mousemove'));
      assert.calledOnce(fakeHighlighter.setHighlightsFocused);
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        bucketBar.annotator.anchors[0].highlights,
        true
      );
    });

    it('un-highlights the bucket anchors when pointer device moved out of bucket', () => {
      const bucketEls = nonEmptyBuckets(bucketBar);
      bucketEls[0].dispatchEvent(createMouseEvent('mousemove'));
      bucketEls[0].dispatchEvent(createMouseEvent('mouseout'));
      assert.calledTwice(fakeHighlighter.setHighlightsFocused);
      const secondCall = fakeHighlighter.setHighlightsFocused.getCall(1);
      assert.equal(
        secondCall.args[0],
        bucketBar.annotator.anchors[0].highlights
      );
      assert.equal(secondCall.args[1], false);
    });

    it('selects the annotations corresponding to the anchors in a bucket when bucket is clicked', () => {
      const bucketEls = nonEmptyBuckets(bucketBar);
      assert.equal(bucketEls.length, 1);
      bucketEls[0].dispatchEvent(createMouseEvent('click'));

      const anns = bucketBar.annotator.anchors.map(anchor => anchor.annotation);
      assert.calledWith(bucketBar.annotator.selectAnnotations, anns, false);
    });

    it('handles missing buckets gracefully on click', () => {
      // FIXME - refactor and remove necessity for this test
      // There is a coupling between `BucketBar.prototype.tabs` and
      // `BucketBar.prototype.buckets` — they're "expected" to be the same
      // length and correspond to each other. This very much should be the case,
      // but, just in case...
      const bucketEls = nonEmptyBuckets(bucketBar);
      assert.equal(bucketEls.length, 1);
      bucketBar.tabs = [];
      bucketEls[0].dispatchEvent(createMouseEvent('click'));
      assert.notCalled(bucketBar.annotator.selectAnnotations);
    });

    [
      { ctrlKey: true, metaKey: false },
      { ctrlKey: false, metaKey: true },
    ].forEach(({ ctrlKey, metaKey }) =>
      it('toggles selection of the annotations if Ctrl or Alt is pressed', () => {
        const bucketEls = nonEmptyBuckets(bucketBar);
        assert.equal(bucketEls.length, 1);
        bucketEls[0].dispatchEvent(
          createMouseEvent('click', { ctrlKey, metaKey })
        );

        const anns = bucketBar.annotator.anchors.map(
          anchor => anchor.annotation
        );
        assert.calledWith(bucketBar.annotator.selectAnnotations, anns, true);
      })
    );
  });

  describe('rendered bucket "tabs"', () => {
    let fakeAnchors;
    let fakeAbove;
    let fakeBelow;
    let fakeBuckets;

    beforeEach(() => {
      bucketBar = createBucketBar();
      fakeAnchors = [
        createAnchor(),
        createAnchor(),
        createAnchor(),
        createAnchor(),
        createAnchor(),
        createAnchor(),
      ];
      // These two anchors are considered to be offscreen upwards
      fakeAbove = [fakeAnchors[0], fakeAnchors[1]];
      // These buckets are on-screen
      fakeBuckets = [
        { anchors: [fakeAnchors[2], fakeAnchors[3]], position: 350 },
        { anchors: [], position: 450 }, // This is an empty bucket
        { anchors: [fakeAnchors[4]], position: 550 },
      ];
      // This anchor is offscreen below
      fakeBelow = [fakeAnchors[5]];

      fakeBucketUtil.constructPositionPoints.returns({
        above: fakeAbove,
        below: fakeBelow,
        points: [],
      });
      fakeBucketUtil.buildBuckets.returns(fakeBuckets.slice());
    });

    describe('navigation bucket tabs', () => {
      it('adds navigation tabs to scroll up and down to nearest anchors offscreen', () => {
        bucketBar.update();
        const validBuckets = nonEmptyBuckets(bucketBar);
        assert.equal(
          validBuckets[0].getAttribute('title'),
          'Show 2 annotations'
        );
        assert.equal(
          validBuckets[validBuckets.length - 1].getAttribute('title'),
          'Show one annotation'
        );

        assert.isTrue(validBuckets[0].classList.contains('upper'));
        assert.isTrue(
          validBuckets[validBuckets.length - 1].classList.contains('lower')
        );
      });

      it('removes unneeded tab elements from the document', () => {
        bucketBar.update();
        const extraEl = document.createElement('div');
        extraEl.className = 'extraTab';
        bucketBar.element.append(extraEl);
        bucketBar.tabs.push(extraEl);
        assert.equal(bucketBar.tabs.length, bucketBar.buckets.length + 1);

        // Resetting this return is necessary to return a fresh array reference
        // on next update
        fakeBucketUtil.buildBuckets.returns(fakeBuckets.slice());
        bucketBar.update();
        assert.equal(bucketBar.tabs.length, bucketBar.buckets.length);
        assert.notExists(bucketBar.element.querySelector('.extraTab'));
      });

      it('scrolls up to nearest anchor above when upper navigation tab clicked', () => {
        fakeBucketUtil.findClosestOffscreenAnchor.returns(fakeAnchors[1]);
        bucketBar.update();
        const visibleBuckets = nonEmptyBuckets(bucketBar);
        visibleBuckets[0].dispatchEvent(createMouseEvent('click'));
        assert.calledOnce(fakeBucketUtil.findClosestOffscreenAnchor);
        assert.calledWith(
          fakeBucketUtil.findClosestOffscreenAnchor,
          sinon.match([fakeAnchors[0], fakeAnchors[1]]),
          'up'
        );
        assert.calledOnce(fakeScrollIntoView);
        assert.calledWith(fakeScrollIntoView, fakeAnchors[1].highlights[0]);
      });

      it('scrolls down to nearest anchor below when lower navigation tab clicked', () => {
        fakeBucketUtil.findClosestOffscreenAnchor.returns(fakeAnchors[5]);
        bucketBar.update();
        const visibleBuckets = nonEmptyBuckets(bucketBar);
        visibleBuckets[visibleBuckets.length - 1].dispatchEvent(
          createMouseEvent('click')
        );
        assert.calledOnce(fakeBucketUtil.findClosestOffscreenAnchor);
        assert.calledWith(
          fakeBucketUtil.findClosestOffscreenAnchor,
          sinon.match([fakeAnchors[5]]),
          'down'
        );
        assert.calledOnce(fakeScrollIntoView);
        assert.calledWith(fakeScrollIntoView, fakeAnchors[5].highlights[0]);
      });
    });

    it('displays bucket tabs that have at least one anchor', () => {
      bucketBar.update();
      const visibleBuckets = nonEmptyBuckets(bucketBar);
      // Visible buckets include: upper navigation tab, two on-screen buckets,
      // lower navigation tab = 4
      assert.equal(visibleBuckets.length, 4);
      visibleBuckets.forEach(visibleEl => {
        assert.equal(visibleEl.style.display, '');
      });
    });

    it('sets bucket-tab label text and title based on number of anchors', () => {
      bucketBar.update();
      const visibleBuckets = nonEmptyBuckets(bucketBar);
      // Upper navigation bucket tab
      assert.equal(visibleBuckets[0].title, 'Show 2 annotations');
      assert.equal(visibleBuckets[0].querySelector('.label').innerHTML, '2');
      // First on-screen visible bucket
      assert.equal(visibleBuckets[1].title, 'Show 2 annotations');
      assert.equal(visibleBuckets[1].querySelector('.label').innerHTML, '2');
      // Second on-screen visible bucket
      assert.equal(visibleBuckets[2].title, 'Show one annotation');
      assert.equal(visibleBuckets[2].querySelector('.label').innerHTML, '1');
      // Lower navigation bucket tab
      assert.equal(visibleBuckets[3].title, 'Show one annotation');
      assert.equal(visibleBuckets[3].querySelector('.label').innerHTML, '1');
    });

    it('does not display empty bucket tabs', () => {
      fakeBucketUtil.buildBuckets.returns([]);
      fakeBucketUtil.constructPositionPoints.returns({
        above: [],
        below: [],
        points: [],
      });
      bucketBar.update();

      const allBuckets = bucketBar.element.querySelectorAll(
        '.annotator-bucket-indicator'
      );

      // All of the buckets are empty...
      allBuckets.forEach(bucketEl => {
        assert.equal(bucketEl.style.display, 'none');
      });
    });
  });
});
