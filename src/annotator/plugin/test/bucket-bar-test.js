import BucketBar from '../bucket-bar';
import { $imports } from '../bucket-bar';

describe('BucketBar', () => {
  const sandbox = sinon.createSandbox();
  let fakeAnnotator;
  let fakeBucketUtil;
  let bucketBar;
  let bucketProps;

  const createBucketBar = function (options) {
    const element = document.createElement('div');
    return new BucketBar(element, options || {}, fakeAnnotator);
  };

  beforeEach(() => {
    bucketProps = {};
    fakeAnnotator = {
      anchors: [],
      selectAnnotations: sinon.stub(),
    };

    fakeBucketUtil = {
      anchorBuckets: sinon.stub().returns({}),
    };

    const FakeBuckets = props => {
      bucketProps = props;
      return null;
    };

    $imports.$mock({
      '../components/buckets': FakeBuckets,
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
      assert.notCalled(fakeBucketUtil.anchorBuckets);
      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should update buckets when the window is scrolled', () => {
      bucketBar = createBucketBar();
      assert.notCalled(fakeBucketUtil.anchorBuckets);
      window.dispatchEvent(new Event('scroll'));
      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should select annotations when Buckets component invokes callback', () => {
      const fakeAnnotations = ['hi', 'there'];
      bucketBar = createBucketBar();
      bucketBar._update();

      bucketProps.onSelectAnnotations(fakeAnnotations, true);
      assert.calledWith(fakeAnnotator.selectAnnotations, fakeAnnotations, true);
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
        assert.notCalled(fakeBucketUtil.anchorBuckets);
        scrollableEls[0].dispatchEvent(new Event('scroll'));
        assert.calledOnce(fakeBucketUtil.anchorBuckets);
        scrollableEls[1].dispatchEvent(new Event('scroll'));
        assert.calledTwice(fakeBucketUtil.anchorBuckets);
      });
    });

    it('should not update if another update is pending', () => {
      bucketBar._updatePending = true;
      bucketBar.update();
      assert.notCalled(window.requestAnimationFrame);
    });
  });
});
