import BucketBar from '../bucket-bar';
import { $imports } from '../bucket-bar';

describe('BucketBar', () => {
  const sandbox = sinon.createSandbox();
  let fakeAnnotator;
  let fakeBucketUtil;
  let bucketBars;
  let bucketProps;
  let container;

  const createBucketBar = function (options) {
    const bucketBar = new BucketBar(container, fakeAnnotator, options);
    bucketBars.push(bucketBar);
    return bucketBar;
  };

  beforeEach(() => {
    container = document.createElement('div');
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
      return <div className="FakeBuckets" />;
    };

    $imports.$mock({
      './components/Buckets': FakeBuckets,
      './util/buckets': fakeBucketUtil,
    });

    sandbox.stub(window, 'requestAnimationFrame').yields();
  });

  afterEach(() => {
    bucketBars.forEach(bucketBar => bucketBar.destroy());
    $imports.$restore();
    sandbox.restore();
    container.remove();
  });

  it('should render buckets for existing anchors when constructed', () => {
    const bucketBar = createBucketBar();
    assert.calledWith(fakeBucketUtil.anchorBuckets, fakeAnnotator.anchors);
    assert.ok(bucketBar.element.querySelector('.FakeBuckets'));
  });

  describe('updating buckets', () => {
    it('should update buckets when the window is resized', () => {
      createBucketBar();
      fakeBucketUtil.anchorBuckets.resetHistory();

      window.dispatchEvent(new Event('resize'));

      assert.calledOnce(fakeBucketUtil.anchorBuckets);
    });

    it('should update buckets when the window is scrolled', () => {
      createBucketBar();
      fakeBucketUtil.anchorBuckets.resetHistory();

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

    context('when `contentContainer` is specified', () => {
      let contentContainer;

      beforeEach(() => {
        contentContainer = document.createElement('div');
        document.body.appendChild(contentContainer);
      });

      afterEach(() => {
        contentContainer.remove();
      });

      it('should update buckets when any scrollable scrolls', () => {
        createBucketBar({ contentContainer });
        fakeBucketUtil.anchorBuckets.resetHistory();

        contentContainer.dispatchEvent(new Event('scroll'));

        assert.calledOnce(fakeBucketUtil.anchorBuckets);
      });
    });

    context('when no `contentContainer` is specified', () => {
      it('should update buckets when body is scrolled', () => {
        createBucketBar({ contentContainer: undefined });
        fakeBucketUtil.anchorBuckets.resetHistory();

        document.body.dispatchEvent(new Event('scroll'));

        assert.calledOnce(fakeBucketUtil.anchorBuckets);
      });
    });

    it('should not update if another update is pending', () => {
      const bucketBar = createBucketBar();
      bucketBar._updatePending = true;
      bucketBar.update();
      assert.notCalled(window.requestAnimationFrame);
    });

    it('deletes the bucketbar element after destroy method is called', () => {
      const bucketBar = createBucketBar();
      bucketBar.destroy();
      assert.isFalse(container.hasChildNodes());
    });
  });

  it('should stop listening for scroll events when destroyed', () => {
    const container = document.createElement('div');
    const bucketBar = createBucketBar({ contentContainer: container });
    fakeBucketUtil.anchorBuckets.resetHistory();

    bucketBar.destroy();

    container.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    assert.notCalled(fakeBucketUtil.anchorBuckets);
  });
});
