import { mount } from 'enzyme';
import { createElement } from 'preact';

import FocusedModeHeader from '../focused-mode-header';
import { $imports } from '../focused-mode-header';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('FocusedModeHeader', function () {
  let fakeStore;
  function createComponent() {
    return mount(<FocusedModeHeader />);
  }

  beforeEach(function () {
    fakeStore = {
      selection: {
        focusMode: {
          enabled: true,
          focused: true,
        },
      },
      focusModeFocused: sinon.stub().returns(true),
      focusModeUserPrettyName: sinon.stub().returns('Fake User'),
      focusModeHasUser: sinon.stub().returns(true),
      setFocusModeFocused: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('not in user-focused mode', () => {
    it('should not render anything if not in user-focused mode', () => {
      fakeStore.focusModeHasUser = sinon.stub().returns(false);

      const wrapper = createComponent();

      assert.isFalse(wrapper.exists('.focused-mode-header'));
    });
  });

  context('user-focused mode', () => {
    context('focus is applied (focused/on)', () => {
      it("should render status text indicating only that user's annotations are visible", () => {
        const wrapper = createComponent();

        assert.match(wrapper.text(), /Showing.+Fake User.+only/);
      });

      it('should render a button allowing the user to view all annotations', () => {
        const wrapper = createComponent();

        const button = wrapper.find('button');

        assert.include(button.text(), 'Show all');
      });
    });

    context('focus is not applied (unfocused/off)', () => {
      beforeEach(() => {
        fakeStore.focusModeFocused = sinon.stub().returns(false);
      });

      it("should render status text indicating that all user's annotations are visible", () => {
        const wrapper = createComponent();

        assert.match(wrapper.text(), /Showing.+all/);
      });

      it("should render a button allowing the user to view only focus user's annotations", () => {
        const wrapper = createComponent();

        const button = wrapper.find('button');

        assert.include(button.text(), 'Show only Fake User');
      });
    });

    describe('toggle button', () => {
      it('should toggle focus mode to false if clicked when focused', () => {
        fakeStore.focusModeFocused = sinon.stub().returns(true);
        const wrapper = createComponent();

        wrapper.find('button').simulate('click');

        assert.calledWith(fakeStore.setFocusModeFocused, false);
      });

      it('should toggle focus mode to true if clicked when not focused', () => {
        fakeStore.focusModeFocused = sinon.stub().returns(false);
        const wrapper = createComponent();

        wrapper.find('button').simulate('click');

        assert.calledWith(fakeStore.setFocusModeFocused, true);
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});
