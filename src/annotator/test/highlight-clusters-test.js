import { waitFor } from '../../test-util/wait';
import { FeatureFlags } from '../features';
import { HighlightClusterController, $imports } from '../highlight-clusters';

describe('HighlightClusterController', () => {
  let fakeFeatures;
  let fakeSetProperty;
  let fakeUpdateClusters;

  let toolbarProps;
  let container;
  let controllers;

  const createToolbar = options => {
    const controller = new HighlightClusterController(container, {
      features: fakeFeatures,
      ...options,
    });
    controllers.push(controller);
    return controller;
  };

  beforeEach(() => {
    controllers = [];

    fakeFeatures = new FeatureFlags();
    fakeSetProperty = sinon.stub(document.documentElement.style, 'setProperty');
    fakeUpdateClusters = sinon.stub();

    container = document.createElement('div');
    toolbarProps = {};

    const FakeToolbar = props => {
      toolbarProps = props;
      return <div style={{ width: '150px' }} />;
    };

    $imports.$mock({
      './components/ClusterToolbar': FakeToolbar,
      './highlighter': {
        updateClusters: fakeUpdateClusters,
      },
    });
  });

  afterEach(() => {
    fakeSetProperty.restore();
    $imports.$restore();
    container.remove();
    controllers.forEach(controller => controller.destroy());
  });

  it('adds an element to the container to hold the toolbar component', () => {
    createToolbar();
    assert.equal(
      container.getElementsByTagName('hypothesis-highlight-cluster-toolbar')
        .length,
      1
    );
    assert.isFalse(toolbarProps.active);
  });

  it('initializes root CSS variables for highlight clusters', () => {
    const toolbar = createToolbar();

    // Properties should be set for each cluster (keys of `toolbar.appliedStyles`)
    // Each cluster has three colors
    const expectedCount = Object.keys(toolbar.appliedStyles).length * 3;

    assert.equal(fakeSetProperty.callCount, expectedCount);
  });

  it('does not activate the feature if feature flag is not set', () => {
    createToolbar();
    assert.isFalse(
      container.classList.contains('hypothesis-highlights-clustered')
    );
  });

  it('activates the feature when the feature flag is set', async () => {
    createToolbar();
    fakeFeatures.update({ styled_highlight_clusters: true });

    await waitFor(() => {
      return (
        container.classList.contains('hypothesis-highlights-clustered') &&
        toolbarProps.active === true
      );
    });
  });

  it('deactivates the feature when the feature flag is unset', async () => {
    fakeFeatures.update({ styled_highlight_clusters: true });
    createToolbar();

    assert.isTrue(
      container.classList.contains('hypothesis-highlights-clustered')
    );

    fakeFeatures.update({ styled_highlight_clusters: false });

    await waitFor(() => {
      return (
        !container.classList.contains('hypothesis-highlights-clustered') &&
        toolbarProps.active === false
      );
    });
  });

  it('responds to toolbar callback to update styles for a highlight cluster', () => {
    fakeFeatures.update({ styled_highlight_clusters: true });
    createToolbar();

    fakeSetProperty.resetHistory();
    toolbarProps.onStyleChange('user-highlights', 'green');

    assert.equal(fakeSetProperty.callCount, 3);
  });

  describe('updating highlight element data and ordering', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      fakeFeatures.update({ styled_highlight_clusters: true });
    });

    afterEach(() => {
      clock.restore();
    });

    it('schedules a debounced task to update highlights', () => {
      const controller = createToolbar();
      controller.scheduleClusterUpdates();

      assert.notCalled(fakeUpdateClusters);

      clock.tick(1);

      assert.notCalled(fakeUpdateClusters);

      controller.scheduleClusterUpdates();
      controller.scheduleClusterUpdates();

      clock.tick(150);

      assert.calledOnce(fakeUpdateClusters);
    });
  });
});
