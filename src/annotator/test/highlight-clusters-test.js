import { waitFor } from '../../test-util/wait';

import { HighlightClusterController, $imports } from '../highlight-clusters';

import { FeatureFlags } from '../features';

describe('HighlightClusterController', () => {
  let fakeFeatures;
  let fakeSetProperty;
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
    container = document.createElement('div');
    toolbarProps = {};

    const FakeToolbar = props => {
      toolbarProps = props;
      return <div style={{ width: '150px' }} />;
    };

    $imports.$mock({
      './components/ClusterToolbar': FakeToolbar,
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
    // Each cluster has two properties (variables) to be set
    const expectedCount = Object.keys(toolbar.appliedStyles).length * 2;

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

    assert.equal(fakeSetProperty.callCount, 2);
  });
});
