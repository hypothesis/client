'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');
const { act } = require('preact/test-utils');

const GroupList = require('../group-list');

describe('GroupList', () => {
  let fakeServiceConfig;
  let fakeServiceUrl;
  let fakeSettings;
  let fakeStore;

  const testGroup = {
    id: 'testgroup',
    name: 'Test group',
    organization: { id: 'testorg', name: 'Test Org' },
  };

  function createGroupList() {
    return shallow(
      <GroupList serviceUrl={fakeServiceUrl} settings={fakeSettings} />
    ).dive();
  }

  /**
   * Configure the store to populate all of the group sections.
   * Must be called before group list is rendered.
   */
  function populateGroupSections() {
    const testGroups = [
      {
        ...testGroup,
        id: 'zzz',
      },
      {
        ...testGroup,
        id: 'aaa',
      },
    ];
    fakeStore.getMyGroups.returns(testGroups);
    fakeStore.getCurrentlyViewingGroups.returns(testGroups);
    fakeStore.getFeaturedGroups.returns(testGroups);
    return testGroups;
  }

  beforeEach(() => {
    fakeServiceUrl = sinon.stub();
    fakeSettings = {
      authDomain: 'hypothes.is',
    };
    fakeStore = {
      getCurrentlyViewingGroups: sinon.stub().returns([]),
      getFeaturedGroups: sinon.stub().returns([]),
      getMyGroups: sinon.stub().returns([]),
      focusedGroup: sinon.stub().returns(testGroup),
      profile: sinon.stub().returns({ userid: null }),
    };
    fakeServiceConfig = sinon.stub().returns(null);

    GroupList.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
      '../service-config': fakeServiceConfig,
    });
  });

  afterEach(() => {
    GroupList.$imports.$restore();
  });

  it('displays no sections if there are no groups', () => {
    const wrapper = createGroupList();
    assert.isFalse(wrapper.exists('GroupListSection'));
  });

  it('displays "Currently Viewing" section if there are currently viewing groups', () => {
    fakeStore.getCurrentlyViewingGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(
      wrapper.exists('GroupListSection[heading="Currently Viewing"]')
    );
  });

  it('displays "Featured Groups" section if there are featured groups', () => {
    fakeStore.getFeaturedGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(
      wrapper.exists('GroupListSection[heading="Featured Groups"]')
    );
  });

  it('displays "My Groups" section if user is a member of any groups', () => {
    fakeStore.getMyGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(wrapper.exists('GroupListSection[heading="My Groups"]'));
  });

  it('sorts groups within each section by organization', () => {
    const testGroups = populateGroupSections();
    const fakeGroupOrganizations = groups =>
      groups.sort((a, b) => a.id.localeCompare(b.id));
    GroupList.$imports.$mock({
      '../util/group-organizations': fakeGroupOrganizations,
    });

    const wrapper = createGroupList();
    const sections = wrapper.find('GroupListSection');

    assert.equal(sections.length, 3);
    sections.forEach(section => {
      assert.deepEqual(
        section.prop('groups'),
        fakeGroupOrganizations(testGroups)
      );
    });
  });

  [
    {
      userid: null,
      expectNewGroupButton: false,
    },
    {
      userid: 'acct:john@hypothes.is',
      expectNewGroupButton: true,
    },
    {
      userid: 'acct:john@otherpublisher.org',
      expectNewGroupButton: false,
    },
  ].forEach(({ userid, expectNewGroupButton }) => {
    it('displays "New private group" button if user is logged in with first-party account', () => {
      fakeStore.profile.returns({ userid });
      const wrapper = createGroupList();
      const newGroupButton = wrapper.find(
        'MenuItem[label="New private group"]'
      );
      assert.equal(newGroupButton.length, expectNewGroupButton ? 1 : 0);
    });
  });

  it('opens new window at correct URL when "New private group" is clicked', () => {
    fakeServiceUrl
      .withArgs('groups.new')
      .returns('https://example.com/groups/new');
    fakeStore.profile.returns({ userid: 'jsmith@hypothes.is' });
    const wrapper = createGroupList();
    const newGroupButton = wrapper.find('MenuItem[label="New private group"]');
    assert.equal(newGroupButton.props().href, 'https://example.com/groups/new');
  });

  it('displays the group name and icon as static text if there is only one group and no actions available', () => {
    GroupList.$imports.$mock({
      '../util/is-third-party-service': () => true,
    });
    const wrapper = createGroupList();
    assert.equal(wrapper.text(), 'Test group');
  });

  it('renders a placeholder if groups have not loaded yet', () => {
    fakeStore.focusedGroup.returns(null);
    const wrapper = createGroupList();
    const label = wrapper.find('Menu').prop('label');
    assert.equal(shallow(label).text(), '…');
  });

  it('renders the publisher-provided icon in the toggle button', () => {
    fakeServiceConfig.returns({ icon: 'test-icon' });
    const wrapper = createGroupList();
    const label = wrapper.find('Menu').prop('label');
    const img = shallow(label).find('img');
    assert.equal(img.prop('src'), 'test-icon');
  });

  /**
   * Assert that the submenu for a particular group is expanded (or none is
   * if `group` is `null`).
   */
  const verifyGroupIsExpanded = (wrapper, group) =>
    wrapper.find('GroupListSection').forEach(section => {
      assert.equal(section.prop('expandedGroup'), group);
    });

  it("sets or resets expanded group item when a group's submenu toggle is clicked", () => {
    const testGroups = populateGroupSections();

    // Render group list. Initially no submenu should be expanded.
    const wrapper = createGroupList();
    verifyGroupIsExpanded(wrapper, null);

    // Expand a group in one of the sections.
    act(() => {
      wrapper
        .find('GroupListSection')
        .first()
        .prop('onExpandGroup')(testGroups[0]);
    });
    wrapper.update();
    verifyGroupIsExpanded(wrapper, testGroups[0]);

    // Reset expanded group.
    act(() => {
      wrapper
        .find('GroupListSection')
        .first()
        .prop('onExpandGroup')(null);
    });
    wrapper.update();
    verifyGroupIsExpanded(wrapper, null);
  });

  it('resets expanded group when menu is closed', () => {
    const testGroups = populateGroupSections();
    const wrapper = createGroupList();

    // Expand one of the submenus.
    act(() => {
      wrapper
        .find('GroupListSection')
        .first()
        .prop('onExpandGroup')(testGroups[0]);
    });
    wrapper.update();
    verifyGroupIsExpanded(wrapper, testGroups[0]);

    // Close the menu
    act(() => {
      wrapper.find('Menu').prop('onOpenChanged')(false);
    });
    wrapper.update();
    verifyGroupIsExpanded(wrapper, null);
  });
});
