import { mount } from 'enzyme';

import {
  highlightStyles,
  defaultClusterStyles,
} from '../../highlight-clusters';
import ClusterToolbar from '../ClusterToolbar';

const noop = () => {};

describe('ClusterToolbar', () => {
  const createComponent = props =>
    mount(
      <ClusterToolbar
        active={true}
        availableStyles={highlightStyles}
        currentStyles={defaultClusterStyles}
        onStyleChange={noop}
        {...props}
      />,
    );

  const toggleOpen = wrapper => {
    wrapper
      .find('button[data-testid="control-toggle-button"]')
      .simulate('click');
  };

  it('renders nothing if the cluster feature is not active', () => {
    const wrapper = createComponent({ active: false });

    assert.isEmpty(wrapper.html());
  });

  it('renders collapsed until expanded', () => {
    const wrapper = createComponent();

    assert.equal(
      wrapper.find('div[data-testid="cluster-style-controls"]').length,
      0,
    );

    toggleOpen(wrapper);

    assert.equal(
      wrapper.find('div[data-testid="cluster-style-controls"]').length,
      1,
    );
  });

  it('renders a control for each highlight cluster', () => {
    const wrapper = createComponent();
    toggleOpen(wrapper);

    assert.equal(
      wrapper.find('ClusterStyleControl').length,
      Object.keys(defaultClusterStyles).length,
    );
  });

  it('calls style-change callback when user clicks on a style option', () => {
    const onStyleChange = sinon.stub();
    const wrapper = createComponent({ onStyleChange });
    toggleOpen(wrapper);

    wrapper
      .find('#hypothesis-user-annotations-green')
      .getDOMNode()
      .dispatchEvent(new Event('change'));

    assert.calledOnce(onStyleChange);
    assert.calledWith(onStyleChange, 'user-annotations', 'green');
  });
});
