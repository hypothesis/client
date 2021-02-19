import BucketBar from '../bucket-bar';
import { $imports } from '../bucket-bar';

describe('BucketBar', () => {
  const sandbox = sinon.createSandbox();
  let fakeAnnotator;
  let fakeBucketUtil;
  let bucketBars;
  let bucketProps;

  const createBucketBar = function (options) {
    const element = document.createElement('div');
    const bucketBar = new BucketBar(element, options || {}, fakeAnnotator);
    bucketBars.push(bucketBar);
    return bucketBar;
  };

  beforeEach(() => {
    bucketBars = [];
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
      '../components/Buckets': FakeBuckets,
      '../util/buckets': fakeBucketUtil,
    });

    sandbox.stub(window, 'requestAnimationFrame').yields();
  });

  afterEach(() => {
    bucketBars.forEach(bucketBar => bucketBar.destroy());
    $imports.$restore();
    sandbox.restore();
  });

  describe('register/unregister events', () => {
    it('triggers registered event listener', () => {
      const bucketBar = createBucketBar();
      const listener = sinon.stub();
      bucketBar._registerEvent(window, 'resize', listener);

      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(listener);
    });

    it('unregisters event listeners', () => {
      const bucketBar = createBucketBar();
      const listener = sinon.stub();
      bucketBar._registerEvent(window, 'resize', listener);
      bucketBar.destroy();

      window.dispatchEvent(new Event('resize'));
      assert.notCalled(listener);
    });
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
      createBucketBar({ container: '.bucket-bar-container' });
      assert.exists(containerEl.querySelector('.annotator-bucket-bar'));
    });

    it('will append itself to the element passed to constructor if `options.container` non-existent', () => {
      createBucketBar({ container: '.bucket-bar-nope' });
      assert.notExists(containerEl.querySelector('.annotator-bucket-bar'));
      assert.calledOnce(console.warn);
    });
  });

  describe('updating buckets', () => {
    it('should update buckets when the window is resized', () => {
      createBucketBar();
      assert.notCalled(fakeBucketUtil.anchorBuckets);
      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should update buckets when the window is scrolled', () => {
      createBucketBar();
      assert.notCalled(fakeBucketUtil.anchorBuckets);
      window.dispatchEvent(new Event('scroll'));
      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should select annotations when Buckets component invokes callback', () => {
      const bucketBar = createBucketBar();
      bucketBar._update();

      const fakeAnnotations = ['hi', 'there'];
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

      it('should update buckets when any scrollable scrolls', () => {
        const bucketBar = createBucketBar({
          scrollables: ['.scrollable-1', '.scrollable-2', '.non-existent'],
        });
        assert.equal(
          bucketBar.registeredListeners.length,
          4,
          'it should be 4 (2 for the window events and 2 for the scrollable elements)'
        );
        assert.notCalled(fakeBucketUtil.anchorBuckets);
        scrollableEls[0].dispatchEvent(new Event('scroll'));
        assert.calledOnce(fakeBucketUtil.anchorBuckets);
        scrollableEls[1].dispatchEvent(new Event('scroll'));
        assert.calledTwice(fakeBucketUtil.anchorBuckets);
      });
    });

    it('should not update if another update is pending', () => {
      const bucketBar = createBucketBar();
      bucketBar._updatePending = true;
      bucketBar.update();
      assert.notCalled(window.requestAnimationFrame);
    });
  });
});
