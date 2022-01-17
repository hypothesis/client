import BucketBar, { $imports } from '../bucket-bar';

describe('BucketBar', () => {
  let bucketBars;
  let bucketProps;
  let container;
  let fakeBucketUtil;
  let fakeGuest;

  beforeEach(() => {
    bucketBars = [];
    bucketProps = {};
    container = document.createElement('div');

    fakeBucketUtil = {
      anchorBuckets: sinon.stub().returns({}),
    };

    fakeGuest = {
      anchors: [],
      scrollToAnchor: sinon.stub(),
      selectAnnotations: sinon.stub(),
    };

    const FakeBuckets = props => {
      bucketProps = props;
      return <div className="FakeBuckets" />;
    };

    $imports.$mock({
      './components/Buckets': FakeBuckets,
      './util/buckets': fakeBucketUtil,
    });
  });

  afterEach(() => {
    bucketBars.forEach(bucketBar => bucketBar.destroy());
    $imports.$restore();
    container.remove();
  });

  const createBucketBar = () => {
    const bucketBar = new BucketBar(container, fakeGuest);
    bucketBars.push(bucketBar);
    return bucketBar;
  };

  it('should render buckets for existing anchors when constructed', () => {
    const bucketBar = createBucketBar();
    assert.calledWith(fakeBucketUtil.anchorBuckets, fakeGuest.anchors);
    assert.ok(bucketBar._bucketBar.querySelector('.FakeBuckets'));
  });

  it('should select annotations when Buckets component invokes callback', () => {
    createBucketBar();
    const fakeAnnotations = ['hi', 'there'];

    bucketProps.onSelectAnnotations(fakeAnnotations, true);

    assert.calledWith(fakeGuest.selectAnnotations, fakeAnnotations, true);
  });

  it('should scroll to anchor when Buckets component invokes callback', () => {
    createBucketBar();
    const anchor = {};

    bucketProps.scrollToAnchor(anchor);

    assert.calledWith(fakeGuest.scrollToAnchor, anchor);
  });

  describe('#update', () => {
    it('updates the buckets', () => {
      const bucketBar = createBucketBar();
      fakeBucketUtil.anchorBuckets.resetHistory();

      bucketBar.update();

      assert.calledOnce(fakeBucketUtil.anchorBuckets);
      assert.calledWith(fakeBucketUtil.anchorBuckets, fakeGuest.anchors);
    });
  });

  describe('#destroy', () => {
    it('removes the bucket-bar element', () => {
      const bucketBar = createBucketBar();

      bucketBar.destroy();

      assert.isFalse(container.hasChildNodes());
    });
  });
});
