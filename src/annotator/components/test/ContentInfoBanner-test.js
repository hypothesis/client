import { mount } from 'enzyme';

import ContentInfoBanner from '../ContentInfoBanner';

let contentInfo;

const createComponent = props =>
  mount(<ContentInfoBanner info={contentInfo} {...props} />);

describe('ContentInfoBanner', () => {
  beforeEach(() => {
    contentInfo = {
      logo: {
        link: 'https://www.jstor.org',
        logo: 'https://www.jstor.org/logo.svg',
        title: 'JSTOR homepage',
      },

      item: {
        title: 'Chapter 2',
        subtitle: 'Some book chapter',
      },

      container: {
        title: 'Expansive Book',
        subtitle: 'The revenge',
      },

      links: {
        previousItem: 'https://www.jstor.org/stable/book.123.1',
        nextItem: 'https://www.jstor.org/stable/book.123.3',
      },
    };
  });

  it('shows linked partner logo', () => {
    const wrapper = createComponent();

    const logoLink = wrapper.find('Link[data-testid="logo-link"]');
    const logoImg = wrapper.find('img[data-testid="logo-image"]');

    assert.equal(logoLink.prop('href'), contentInfo.logo.link);
    assert.equal(logoImg.prop('src'), 'https://www.jstor.org/logo.svg');
  });

  it('shows item title', () => {
    const wrapper = createComponent();

    const link = wrapper.find('Link[data-testid="content-item-link"]');
    assert.equal(link.text(), 'Chapter 2: Some book chapter');
    assert.equal(link.prop('target'), '_blank');
  });

  it('handles missing subtitle', () => {
    delete contentInfo.item.subtitle;

    const wrapper = createComponent();

    const link = wrapper.find('Link[data-testid="content-item-link"]');
    assert.equal(link.text(), 'Chapter 2');
  });

  it('provides disclosure of long titles through title attributes', () => {
    const wrapper = createComponent();

    // Element text could be partially obscured (CSS truncation), so these
    // title attributes provide access to the full titles
    assert.equal(
      wrapper.find('div[data-testid="content-container-info"]').prop('title'),
      'Expansive Book',
    );
    assert.equal(
      wrapper.find('Link[data-testid="content-item-link"]').prop('title'),
      'Chapter 2: Some book chapter',
    );
  });

  describe('next and previous links', () => {
    it('displays next and previous links when available', () => {
      const wrapper = createComponent();

      const prevLink = wrapper.find(
        'Link[data-testid="content-previous-link"]',
      );
      const nextLink = wrapper.find('Link[data-testid="content-next-link"]');

      assert.equal(
        prevLink.prop('href'),
        'https://www.jstor.org/stable/book.123.1',
      );
      assert.equal(prevLink.prop('target'), '_blank');
      assert.equal(
        nextLink.prop('href'),
        'https://www.jstor.org/stable/book.123.3',
      );
      assert.equal(nextLink.prop('target'), '_blank');
    });

    it('does not display previous link if unavailable', () => {
      const noLinks = { ...contentInfo };
      delete noLinks.links.previousItem;

      const wrapper = createComponent({ contentInfo: noLinks });

      const prevLink = wrapper.find(
        'Link[data-testid="content-previous-link"]',
      );
      const nextLink = wrapper.find('Link[data-testid="content-next-link"]');

      assert.isFalse(prevLink.exists());
      assert.isTrue(nextLink.exists());
    });

    it('does not display next link if unavailable', () => {
      const noLinks = { ...contentInfo };
      delete noLinks.links.nextItem;

      const wrapper = createComponent({ contentInfo: noLinks });

      const prevLink = wrapper.find(
        'Link[data-testid="content-previous-link"]',
      );
      const nextLink = wrapper.find('Link[data-testid="content-next-link"]');

      assert.isTrue(prevLink.exists());
      assert.isFalse(nextLink.exists());
    });
  });
});
