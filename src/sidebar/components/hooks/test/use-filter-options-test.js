import { mount } from 'enzyme';

import { useUserFilterOptions } from '../use-filter-options';
import { $imports } from '../use-filter-options';

describe('sidebar/components/hooks/use-user-filter-options', () => {
  let fakeStore;
  let lastUserOptions;

  // Mount a dummy component to be able to use the hook
  function DummyComponent() {
    lastUserOptions = useUserFilterOptions();
  }

  function annotationFixtures() {
    return [
      {
        user: 'acct:dingbat@localhost',
        user_info: { display_name: 'Ding Bat' },
      },
      {
        user: 'acct:abalone@localhost',
        user_info: { display_name: 'Aba Lone' },
      },
      {
        user: 'acct:bananagram@localhost',
        user_info: { display_name: 'Zerk' },
      },
      {
        user: 'acct:dingbat@localhost',
        user_info: { display_name: 'Ding Bat' },
      },
    ];
  }

  beforeEach(() => {
    fakeStore = {
      allAnnotations: sinon.stub().returns([]),
      getFocusFilters: sinon.stub().returns({}),
      isFeatureEnabled: sinon.stub().returns(false),
      profile: sinon.stub().returns({}),
    };

    $imports.$mock({
      '../../store/use-store': { useStoreProxy: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should return a user filter option for each user who has authored an annotation', () => {
    fakeStore.allAnnotations.returns(annotationFixtures());

    mount(<DummyComponent />);

    assert.deepEqual(lastUserOptions, [
      { value: 'abalone', display: 'abalone' },
      { value: 'bananagram', display: 'bananagram' },
      { value: 'dingbat', display: 'dingbat' },
    ]);
  });

  it('should use display names if feature flag enabled', () => {
    fakeStore.allAnnotations.returns(annotationFixtures());
    fakeStore.isFeatureEnabled.withArgs('client_display_names').returns(true);

    mount(<DummyComponent />);

    assert.deepEqual(lastUserOptions, [
      { value: 'abalone', display: 'Aba Lone' },
      { value: 'dingbat', display: 'Ding Bat' },
      { value: 'bananagram', display: 'Zerk' },
    ]);
  });

  it('sorts the current user to the front with " (Me)" suffix', () => {
    fakeStore.allAnnotations.returns(annotationFixtures());
    fakeStore.profile.returns({
      userid: 'acct:bananagram@localhost',
    });

    mount(<DummyComponent />);

    assert.deepEqual(lastUserOptions, [
      { value: 'bananagram', display: 'bananagram (Me)' },
      { value: 'abalone', display: 'abalone' },
      { value: 'dingbat', display: 'dingbat' },
    ]);
  });

  it('does not add (Me)" suffix if user has no annotations', () => {
    fakeStore.allAnnotations.returns(annotationFixtures());
    fakeStore.profile.returns({
      userid: 'acct:fakeaccount@localhost',
    });

    mount(<DummyComponent />);

    assert.deepEqual(lastUserOptions, [
      { value: 'abalone', display: 'abalone' },
      { value: 'bananagram', display: 'bananagram' },
      { value: 'dingbat', display: 'dingbat' },
    ]);
  });

  describe('when focused-user filter is configured', () => {
    beforeEach(() => {
      fakeStore.getFocusFilters.returns({
        user: { value: 'carrotNumberOne', display: 'Number One Carrot' },
      });
    });

    it('should add focused-user filter information', () => {
      fakeStore.allAnnotations.returns(annotationFixtures());
      fakeStore.isFeatureEnabled.withArgs('client_display_names').returns(true);

      mount(<DummyComponent />);

      assert.deepEqual(lastUserOptions, [
        { value: 'abalone', display: 'Aba Lone' },
        { value: 'dingbat', display: 'Ding Bat' },
        { value: 'carrotNumberOne', display: 'Number One Carrot' },
        { value: 'bananagram', display: 'Zerk' },
      ]);
    });

    it('always uses display name for focused user', () => {
      fakeStore.allAnnotations.returns(annotationFixtures());
      fakeStore.isFeatureEnabled
        .withArgs('client_display_names')
        .returns(false);
      fakeStore.getFocusFilters.returns({
        user: { value: 'carrotNumberOne', display: 'Numero Uno Zanahoria' },
      });

      mount(<DummyComponent />);

      assert.deepEqual(lastUserOptions, [
        { value: 'abalone', display: 'abalone' },
        { value: 'bananagram', display: 'bananagram' },
        { value: 'dingbat', display: 'dingbat' },
        { value: 'carrotNumberOne', display: 'Numero Uno Zanahoria' },
      ]);
    });

    it('sorts the current user to the front with " (Me)" suffix', () => {
      fakeStore.allAnnotations.returns(annotationFixtures());
      fakeStore.isFeatureEnabled.withArgs('client_display_names').returns(true);
      fakeStore.profile.returns({
        userid: 'acct:bananagram@localhost',
      });

      mount(<DummyComponent />);

      assert.deepEqual(lastUserOptions, [
        { value: 'bananagram', display: 'Zerk (Me)' },
        { value: 'abalone', display: 'Aba Lone' },
        { value: 'dingbat', display: 'Ding Bat' },
        { value: 'carrotNumberOne', display: 'Number One Carrot' },
      ]);
    });

    it('does not add (Me)" suffix if user has no annotations', () => {
      fakeStore.allAnnotations.returns(annotationFixtures());
      fakeStore.isFeatureEnabled.withArgs('client_display_names').returns(true);
      fakeStore.profile.returns({
        userid: 'acct:fakeid@localhost',
      });

      mount(<DummyComponent />);

      assert.deepEqual(lastUserOptions, [
        { value: 'abalone', display: 'Aba Lone' },
        { value: 'dingbat', display: 'Ding Bat' },
        { value: 'carrotNumberOne', display: 'Number One Carrot' },
        { value: 'bananagram', display: 'Zerk' },
      ]);
    });
  });
});
