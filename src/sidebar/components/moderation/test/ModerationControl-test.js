import { mockImportedComponents, mount } from '@hypothesis/frontend-testing';

import { defaultAnnotation } from '../../../test/annotation-fixtures';
import ModerationControl, { $imports } from '../ModerationControl';

describe('ModerationControl', () => {
  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  function createComponent({ annotation, groupIsPreModerated = true }) {
    return mount(
      <ModerationControl
        annotation={annotation}
        groupIsPreModerated={groupIsPreModerated}
      />,
    );
  }

  context('when annotation cannot be moderated', () => {
    const annotation = {
      ...defaultAnnotation(),
      moderation_status: 'PENDING',
    };

    it('does not render anything if status is APPROVED', () => {
      const wrapper = createComponent({
        annotation: {
          ...annotation,
          moderation_status: 'APPROVED',
        },
      });
      assert.isEmpty(wrapper.text());
    });

    it('renders ModerationStatusBadge if status is not APPROVED', () => {
      const wrapper = createComponent({ annotation });

      assert.isTrue(wrapper.exists('ModerationStatusBadge'));
      assert.isFalse(wrapper.exists('ModerationStatusSelect'));
    });
  });

  context('when annotation can be moderated', () => {
    const annotation = {
      ...defaultAnnotation(),
      moderation_status: 'PENDING',
      actions: ['moderate'],
    };

    it('renders ModerationStatusBadge if group is not pre-moderated', () => {
      const wrapper = createComponent({
        annotation,
        groupIsPreModerated: false,
      });

      assert.isTrue(wrapper.exists('ModerationStatusBadge'));
      assert.isFalse(wrapper.exists('ModerationStatusSelect'));
    });

    it('renders ModerationStatusSelect if group is pre-moderated', () => {
      const wrapper = createComponent({ annotation });

      assert.isTrue(wrapper.exists('ModerationStatusSelect'));
      assert.isFalse(wrapper.exists('ModerationStatusBadge'));
    });
  });
});
