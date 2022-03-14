import { mount } from 'enzyme';

import ContentPartnerBanner from '../ContentPartnerBanner';

describe('ContentPartnerBanner', () => {
  it('renders JSTOR banner', () => {
    const wrapper = mount(<ContentPartnerBanner provider="jstor" />);
    assert.include(wrapper.text(), 'Document hosted by JSTOR');
  });

  it('closes when "Close" button is clicked', () => {
    const onClose = sinon.stub();
    const wrapper = mount(
      <ContentPartnerBanner provider="jstor" onClose={onClose} />
    );
    const closeButton = wrapper.find(
      'LabeledButton[data-testid="close-button"]'
    );

    closeButton.prop('onClick')();

    assert.calledOnce(onClose);
  });
});
