import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import { events } from '../../services/analytics';
import GroupListItem from '../group-list-item';
import { $imports } from '../group-list-item';

describe('GroupListItem', () => {
  let fakeAnalytics;
  let fakeCopyText;
  let fakeToastMessenger;
  let fakeGroupsService;
  let fakeStore;
  let fakeGroupListItemCommon;
  let fakeGroup;

  beforeEach(() => {
    fakeGroup = {
      id: 'groupid',
      name: 'Test',
      links: {
        html: 'https://annotate.com/groups/groupid',
      },
      scopes: {
        enforced: false,
      },
      type: 'private',
    };

    fakeStore = {
      focusedGroupId: sinon.stub().returns('groupid'),
      clearDirectLinkedIds: sinon.stub(),
      clearDirectLinkedGroupFetchFailed: sinon.stub(),
    };

    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };

    fakeToastMessenger = {
      success: sinon.stub(),
      error: sinon.stub(),
    };

    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
    };

    fakeGroupsService = {
      focus: sinon.stub(),
      leave: sinon.stub(),
    };

    fakeCopyText = sinon.stub();

    function FakeMenuItem() {
      return null;
    }
    FakeMenuItem.displayName = 'MenuItem';

    function FakeSlider({ children, visible }) {
      return visible ? children : null;
    }
    FakeSlider.displayName = 'Slider';

    $imports.$mock({
      './menu-item': FakeMenuItem,
      '../util/copy-to-clipboard': {
        copyText: fakeCopyText,
      },
      '../util/group-list-item-common': fakeGroupListItemCommon,
      '../store/use-store': callback => callback(fakeStore),
    });

    sinon.stub(window, 'confirm').returns(false);
  });

  afterEach(() => {
    $imports.$restore();
    window.confirm.restore();
  });

  const createGroupListItem = (fakeGroup, props = {}) => {
    return mount(
      <GroupListItem
        toastMessenger={fakeToastMessenger}
        group={fakeGroup}
        groups={fakeGroupsService}
        analytics={fakeAnalytics}
        {...props}
      />
    );
  };

  function clickMenuItem(wrapper, label) {
    act(() => {
      wrapper
        .find(`MenuItem[label="${label}"]`)
        .props()
        .onClick();
    });
    wrapper.update();
  }

  it('changes the focused group when group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledWith(fakeGroupsService.focus, fakeGroup.id);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('clears the direct linked ids from the store when the group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledOnce(fakeStore.clearDirectLinkedIds);
  });

  it('clears the direct-linked group fetch failed from the store when the group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledOnce(fakeStore.clearDirectLinkedGroupFetchFailed);
  });

  it('sets alt text for organization logo', () => {
    const group = {
      ...fakeGroup,
      // Dummy scheme to avoid actually trying to load image.
      logo: 'dummy://hypothes.is/logo.svg',
      organization: { name: 'org' },
    };
    fakeGroupListItemCommon.orgName
      .withArgs(group)
      .returns(group.organization.name);

    const wrapper = createGroupListItem(group);
    const altText = wrapper.find('MenuItem').prop('iconAlt');

    assert.equal(altText, group.organization.name);
  });

  describe('selected state', () => {
    [
      {
        description: 'is selected if group is the focused group',
        focusedGroupId: 'groupid',
        expectedIsSelected: true,
      },
      {
        description: 'is not selected if group is not the focused group',
        focusedGroupId: 'other',
        expectedIsSelected: false,
      },
    ].forEach(({ description, focusedGroupId, expectedIsSelected }) => {
      it(description, () => {
        fakeStore.focusedGroupId.returns(focusedGroupId);

        const wrapper = createGroupListItem(fakeGroup);

        assert.equal(
          wrapper.find('MenuItem').prop('isSelected'),
          expectedIsSelected
        );
      });
    });
  });

  it('expands submenu if `isExpanded` is `true`', () => {
    const wrapper = createGroupListItem(fakeGroup, { isExpanded: true });
    assert.isTrue(
      wrapper
        .find('MenuItem')
        .first()
        .prop('isExpanded')
    );
  });

  it('collapses submenu if `isExpanded` is `false`', () => {
    const wrapper = createGroupListItem(fakeGroup, { isExpanded: false });
    assert.isFalse(
      wrapper
        .find('MenuItem')
        .first()
        .prop('isExpanded')
    );
  });

  it('toggles submenu when toggle is clicked', () => {
    const onExpand = sinon.stub();
    const wrapper = createGroupListItem(fakeGroup, { onExpand });
    const toggleSubmenu = () => {
      const dummyEvent = new Event('dummy');
      act(() => {
        wrapper
          .find('MenuItem')
          .first()
          .props()
          .onToggleSubmenu(dummyEvent);
      });
      wrapper.update();
    };

    toggleSubmenu();
    assert.calledWith(onExpand, true);
    onExpand.resetHistory();

    wrapper.setProps({ isExpanded: true });
    toggleSubmenu();
    assert.calledWith(onExpand, false);
  });

  it('does not show submenu toggle if there are no available actions', () => {
    fakeGroup.links.html = null;
    fakeGroup.type = 'open';
    const wrapper = createGroupListItem(fakeGroup);
    assert.isFalse(wrapper.find('MenuItem').prop('isExpanded'));
  });

  function getSubmenu(wrapper) {
    const submenu = wrapper
      .find('MenuItem')
      .first()
      .prop('submenu');
    return mount(<div>{submenu}</div>);
  }

  it('does not show link to activity page if not available', () => {
    fakeGroup.links.html = null;
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    const submenu = getSubmenu(wrapper);
    assert.isFalse(submenu.exists('MenuItem[label="View group activity"]'));
  });

  it('shows link to activity page if available', () => {
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    const submenu = getSubmenu(wrapper);
    assert.isTrue(submenu.exists('MenuItem[label="View group activity"]'));
  });

  it('does not show "Leave" action if user cannot leave', () => {
    fakeGroup.type = 'open';
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    const submenu = getSubmenu(wrapper);
    assert.isFalse(submenu.exists('MenuItem[label="Leave group"]'));
  });

  it('shows "Leave" action if user can leave', () => {
    fakeGroup.type = 'private';
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    const submenu = getSubmenu(wrapper);
    assert.isTrue(submenu.exists('MenuItem[label="Leave group"]'));
  });

  it('prompts to leave group if "Leave" action is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });

    const submenu = getSubmenu(wrapper);
    clickMenuItem(submenu, 'Leave group');

    assert.called(window.confirm);
    assert.notCalled(fakeGroupsService.leave);
  });

  it('leaves group if "Leave" is clicked and user confirms', () => {
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    window.confirm.returns(true);

    const submenu = getSubmenu(wrapper);
    clickMenuItem(submenu, 'Leave group');

    assert.called(window.confirm);
    assert.calledWith(fakeGroupsService.leave, fakeGroup.id);
  });

  [
    {
      enforced: false,
      isScopedToUri: false,
      expectDisabled: false,
    },
    {
      enforced: true,
      isScopedToUri: false,
      expectDisabled: true,
    },
    {
      enforced: true,
      isScopedToUri: true,
      expectDisabled: false,
    },
  ].forEach(({ enforced, isScopedToUri, expectDisabled }) => {
    it('disables menu item and shows note in submenu if group is not selectable', () => {
      fakeGroup.scopes.enforced = enforced;
      fakeGroup.isScopedToUri = isScopedToUri;
      const wrapper = createGroupListItem(fakeGroup, {
        isExpanded: true,
      });
      assert.equal(
        wrapper
          .find('MenuItem')
          .first()
          .prop('isDisabled'),
        expectDisabled
      );

      const submenu = getSubmenu(wrapper);
      assert.equal(submenu.exists('.group-list-item__footer'), expectDisabled);
    });
  });

  [
    {
      groupType: 'private',
      expectedText: 'Copy invite link',
      hasLink: true,
    },
    {
      groupType: 'open',
      expectedText: 'Copy activity link',
      hasLink: true,
    },
    {
      groupType: 'restricted',
      expectedText: 'Copy activity link',
      hasLink: true,
    },
    {
      groupType: 'open',
      expectedText: null,
      hasLink: false,
    },
  ].forEach(({ groupType, expectedText, hasLink }) => {
    it('shows appropriate "Copy link" action', () => {
      fakeGroup.type = groupType;
      fakeGroup.links.html = hasLink ? 'https://anno.co/groups/1' : null;
      const wrapper = createGroupListItem(fakeGroup, {
        isExpanded: true,
      });
      const submenu = getSubmenu(wrapper);
      const copyAction = submenu
        .find('MenuItem')
        .filterWhere(n => n.prop('label').startsWith('Copy'));

      if (expectedText) {
        assert.equal(copyAction.prop('label'), expectedText);
      } else {
        assert.isFalse(copyAction.exists());
      }
    });
  });

  it('copies activity URL if "Copy link" action is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    clickMenuItem(getSubmenu(wrapper), 'Copy invite link');
    assert.calledWith(fakeCopyText, 'https://annotate.com/groups/groupid');
    assert.calledWith(fakeToastMessenger.success, 'Copied link for "Test"');
  });

  it('reports an error if "Copy link" action fails', () => {
    fakeCopyText.throws(new Error('Something went wrong'));
    const wrapper = createGroupListItem(fakeGroup, {
      isExpanded: true,
    });
    clickMenuItem(getSubmenu(wrapper), 'Copy invite link');
    assert.calledWith(fakeCopyText, 'https://annotate.com/groups/groupid');
    assert.calledWith(fakeToastMessenger.error, 'Unable to copy link');
  });
});
