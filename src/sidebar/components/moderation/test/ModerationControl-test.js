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

  it('renders nothing when annotation is APPROVED and group is not pre-moderated', () => {
    const wrapper = createComponent({
      annotation: {
        ...defaultAnnotation(),
        moderation_status: 'APPROVED',
      },
      groupIsPreModerated: false,
    });
    assert.isEmpty(wrapper.text());
  });

  it('renders ModerationStatusSelect when annotation can be moderated', () => {
    const wrapper = createComponent({
      annotation: {
        ...defaultAnnotation(),
        actions: ['moderate'],
      },
    });

    assert.isTrue(wrapper.exists('ModerationStatusSelect'));
    assert.isFalse(wrapper.exists('ModerationStatusBadge'));
  });

  it('renders ModerationStatusBadge when annotation cannot be moderated', () => {
    const wrapper = createComponent({
      annotation: defaultAnnotation(),
    });

    assert.isTrue(wrapper.exists('ModerationStatusBadge'));
    assert.isFalse(wrapper.exists('ModerationStatusSelect'));
  });
});
