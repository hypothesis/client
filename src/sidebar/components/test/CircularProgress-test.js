import { mount } from 'enzyme';

import CircularProgress from '../CircularProgress';

describe('CircularProgress', () => {
  function renderProgress(props = {}) {
    return mount(<CircularProgress size={40} value={0} {...props} />);
  }

  it('should display at specified size', () => {
    const wrapper = renderProgress({ size: 40 });
    assert.equal(wrapper.getDOMNode().style.width, '40px');
    assert.equal(wrapper.getDOMNode().style.height, '40px');
  });

  it('should display expected completion', () => {
    const value = 75;
    const wrapper = renderProgress({ size: 40, value });
    const circle = wrapper.find('circle').getDOMNode();

    const dashLength = parseFloat(circle.style.strokeDasharray);
    const dashOffset = parseFloat(circle.style.strokeDashoffset);

    assert.approximately(dashOffset / dashLength, 1 - value / 100, 1e-4);
  });
});
