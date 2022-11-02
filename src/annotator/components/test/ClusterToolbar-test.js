import { mount } from 'enzyme';

import { highlightStyles, defaultStyles } from '../../highlight-clusters';
import ClusterToolbar from '../ClusterToolbar';

const noop = () => {};

describe('ClusterToolbar', () => {
  const createComponent = props =>
    mount(
      <ClusterToolbar
        active={true}
        availableStyles={highlightStyles}
        currentStyles={defaultStyles}
        onStyleChange={noop}
        {...props}
      />
    );

  it('renders nothing if the cluster feature is not active', () => {
    const wrapper = createComponent({ active: false });

    assert.isEmpty(wrapper.html());
  });

  it('renders a control for each highlight cluster', () => {
    const wrapper = createComponent();

    assert.equal(
      wrapper.find('ClusterStyleControl').length,
      Object.keys(defaultStyles).length
    );
  });

  it('calls style-change callback when user clicks on a style option', () => {
    const onStyleChange = sinon.stub();
    const wrapper = createComponent({ onStyleChange });

    wrapper
      .find('#hypothesis-user-annotations-green')
      .getDOMNode()
      .dispatchEvent(new Event('change'));

    assert.calledOnce(onStyleChange);
    assert.calledWith(onStyleChange, 'user-annotations', 'green');
  });
});
