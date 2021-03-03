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
    return new BucketBar(element, fakeAnnotator, options);
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
      return <div className="FakeBuckets" />;
    };

    $imports.$mock({
      './components/Buckets': FakeBuckets,
      './util/buckets': fakeBucketUtil,
    });

    sandbox.stub(window, 'requestAnimationFrame').yields();
  });

  afterEach(() => {
    bucketBar?.destroy();
    $imports.$restore();
    sandbox.restore();
  });

  it('should render buckets for existing anchors when constructed', () => {
    bucketBar = createBucketBar();
    assert.calledWith(fakeBucketUtil.anchorBuckets, fakeAnnotator.anchors);
    assert.ok(bucketBar.element.querySelector('.FakeBuckets'));
  });

  describe('updating buckets', () => {
    it('should update buckets when the window is resized', () => {
      bucketBar = createBucketBar();
      fakeBucketUtil.anchorBuckets.resetHistory();

      window.dispatchEvent(new Event('resize'));

      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should update buckets when the window is scrolled', () => {
      bucketBar = createBucketBar();
      fakeBucketUtil.anchorBuckets.resetHistory();

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
        fakeBucketUtil.anchorBuckets.resetHistory();
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
