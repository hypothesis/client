import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import AnnotationShareInfo, { $imports } from '../AnnotationShareInfo';

describe('AnnotationShareInfo', () => {
  let fakeGroup;

  const createAnnotationShareInfo = props => {
    return mount(<AnnotationShareInfo group={fakeGroup} {...props} />);
  };

  beforeEach(() => {
    fakeGroup = {
      name: 'My Group',
      links: {
        html: 'https://www.example.com',
      },
      type: 'private',
    };

    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('group link', () => {
    it('should show a link to the group for extant, first-party groups', () => {
      const wrapper = createAnnotationShareInfo();

      const groupLink = wrapper.find('a');

      assert.equal(groupLink.prop('href'), fakeGroup.links.html);
      assert.include(groupLink.text(), fakeGroup.name);
    });

    it('should display a group icon for private and restricted groups', () => {
      const wrapper = createAnnotationShareInfo();

      assert.isTrue(wrapper.find('GroupsIcon').exists());
    });

    it('should display a public/world icon for open groups', () => {
      fakeGroup.type = 'open';
      const wrapper = createAnnotationShareInfo();

      assert.isTrue(wrapper.find('GlobeIcon').exists());
    });

    it('should not show a link to third-party groups', () => {
      // Third-party groups have no `html` link
      const wrapper = createAnnotationShareInfo({
        group: { name: 'A Group', links: {} },
      });
      const groupLink = wrapper.find('.AnnotationShareInfo__group');

      assert.notOk(groupLink.exists());
    });
  });

  describe('"only you" information', () => {
    it('should not show privacy information if annotation is not private', () => {
      const wrapper = createAnnotationShareInfo();

      const privacy = wrapper.find('.AnnotationShareInfo__private');

      assert.notOk(privacy.exists());
    });

    context('private annotation', () => {
      it('should show "only me" text for annotation in third-party group', () => {
        const wrapper = createAnnotationShareInfo({
          group: { name: 'Some Name', links: {} },
          isPrivate: true,
        });

        const privacyText = wrapper.find('[data-testid="private-info"]');

        assert.isOk(privacyText.exists());
        assert.equal(privacyText.text(), 'Only me');
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createAnnotationShareInfo(),
    }),
  );
});
