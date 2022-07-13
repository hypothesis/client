import { mount } from 'enzyme';

import ContentInfoBanner from '../ContentInfoBanner';

const contentInfo = {
  logo: {
    link: 'https://www.jstor.org',
    logo: 'https://www.jstorg.org/logo.svg',
    title: 'JSTOR homepage',
  },

  item: {
    title: 'Chapter 2: Some book chapter',
  },

  links: {
    previousItem: 'https://www.jstor.org/stable/book.123.1',
    nextItem: 'https://www.jstor.org/stable/book.123.3',
  },
};

describe('ContentInfoBanner', () => {
  it('renders banner', () => {
    const wrapper = mount(<ContentInfoBanner info={contentInfo} />);
    assert.include(wrapper.text(), contentInfo.item.title);

    const logo = wrapper.find('Link[data-testid="logo-link"]');
    assert.equal(logo.prop('href'), contentInfo.logo.link);
  });

  it('closes when "Close" button is clicked', () => {
    const onClose = sinon.stub();
    const wrapper = mount(
      <ContentInfoBanner info={contentInfo} onClose={onClose} />
    );
    const closeButton = wrapper.find(
      'LabeledButton[data-testid="close-button"]'
    );

    closeButton.prop('onClick')();

    assert.calledOnce(onClose);
  });
});
