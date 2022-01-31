import { BucketBar, $imports } from '../bucket-bar';

describe('BucketBar', () => {
  let bucketBars;
  let bucketProps;
  let container;
  let fakeComputeBuckets;
  let fakeOnFocusAnnotations;
  let fakeOnScrollToClosestOffScreenAnchor;
  let fakeOnSelectAnnotations;

  beforeEach(() => {
    bucketBars = [];
    bucketProps = {};
    container = document.createElement('div');

    fakeComputeBuckets = sinon.stub().returns({});

    fakeOnFocusAnnotations = sinon.stub();
    fakeOnScrollToClosestOffScreenAnchor = sinon.stub();
    fakeOnSelectAnnotations = sinon.stub();

    const FakeBuckets = props => {
      bucketProps = props;
      return <div className="FakeBuckets" />;
    };

    $imports.$mock({
      './components/Buckets': FakeBuckets,
      './util/buckets': { computeBuckets: fakeComputeBuckets },
    });
  });

  afterEach(() => {
    bucketBars.forEach(bucketBar => bucketBar.destroy());
    $imports.$restore();
    container.remove();
  });

  const createBucketBar = () => {
    const bucketBar = new BucketBar(container, {
      onFocusAnnotations: fakeOnFocusAnnotations,
      onScrollToClosestOffScreenAnchor: fakeOnScrollToClosestOffScreenAnchor,
      onSelectAnnotations: fakeOnSelectAnnotations,
    });
    bucketBars.push(bucketBar);
    return bucketBar;
  };

  it('should render the bucket bar with no buckets when constructed', () => {
    const bucketBar = createBucketBar();
    assert.calledWith(fakeComputeBuckets, []);
    assert.ok(bucketBar._bucketsContainer.querySelector('.FakeBuckets'));
  });

  it('passes "onFocusAnnotations" to the Bucket component', () => {
    createBucketBar();
    const tags = ['t1', 't2'];

    bucketProps.onFocusAnnotations(tags);

    assert.calledWith(fakeOnFocusAnnotations, tags);
  });

  it('passes "onScrollToClosestOffScreenAnchor" to the Bucket component', () => {
    createBucketBar();
    const tags = ['t1', 't2'];
    const direction = 'down';

    bucketProps.onScrollToClosestOffScreenAnchor(tags, direction);

    assert.calledWith(fakeOnScrollToClosestOffScreenAnchor, tags, direction);
  });

  it('passes "onSelectAnnotations" to the Bucket component', () => {
    createBucketBar();
    const tags = ['t1', 't2'];

    bucketProps.onSelectAnnotations(tags, true);

    assert.calledWith(fakeOnSelectAnnotations, tags, true);
  });

  describe('#update', () => {
    it('updates the buckets', () => {
      const bucketBar = createBucketBar();
      fakeComputeBuckets.resetHistory();

      bucketBar.update([1, 2]);

      assert.calledOnce(fakeComputeBuckets);
      assert.calledWith(fakeComputeBuckets, [1, 2]);
    });
  });

  describe('#destroy', () => {
    it('removes the BucketBar container element', () => {
      const bucketBar = createBucketBar();

      bucketBar.destroy();

      assert.isFalse(container.hasChildNodes());
    });
  });
});
