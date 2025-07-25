import { mount } from '@hypothesis/frontend-testing';

import ModerationStatusBadge from '../ModerationStatusBadge';

describe('ModerationStatusBadge', () => {
  function createComponent(moderationStatus) {
    return mount(<ModerationStatusBadge status={moderationStatus} />, {
      connected: true,
    });
  }

  [
    { moderationStatus: 'PENDING', shouldHaveContent: true },
    { moderationStatus: 'APPROVED', shouldHaveContent: false },
    { moderationStatus: 'SPAM', shouldHaveContent: false },
    { moderationStatus: 'DENIED', shouldHaveContent: true },
  ].forEach(({ moderationStatus, shouldHaveContent }) => {
    it('renders nothing for APPROVED and SPAM statuses', () => {
      const wrapper = createComponent(moderationStatus);
      assert.equal(
        wrapper.exists('[data-testid="moderation-status-badge"]'),
        shouldHaveContent,
      );
    });
  });

  [
    {
      moderationStatus: 'PENDING',
      expectedTooltip:
        'Not visible to other users yet. Waiting for a moderator to review it.',
    },
    {
      moderationStatus: 'DENIED',
      expectedTooltip:
        'Not visible to other users. Edit this annotation to resubmit it for moderator approval.',
    },
  ].forEach(({ moderationStatus, expectedTooltip }) => {
    it('renders expected popover', () => {
      const wrapper = createComponent(moderationStatus);

      // Open popover
      wrapper.find('button').simulate('click');

      assert.equal(wrapper.find('Popover').text(), expectedTooltip);
    });
  });
});
