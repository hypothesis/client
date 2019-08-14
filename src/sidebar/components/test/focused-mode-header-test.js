'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const FocusedModeHeader = require('../focused-mode-header');

describe('FocusedModeHeader', function() {
  let fakeStore;
  function createComponent() {
    return shallow(<FocusedModeHeader />);
  }

  beforeEach(function() {
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
    FocusedModeHeader.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    FocusedModeHeader.$imports.$restore();
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

        assert.match(wrapper.text(), /Annotations by.+Fake User/);
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

        assert.match(wrapper.text(), /Everybody.*s annotations/);
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
});
