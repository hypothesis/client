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
      focusModeFocused: sinon.stub().returns(false),
      focusModeUserPrettyName: sinon.stub().returns('Fake User'),
      setFocusModeFocused: sinon.stub(),
    };
    FocusedModeHeader.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    FocusedModeHeader.$imports.$restore();
  });

  it('creates the component', () => {
    const wrapper = createComponent();
    assert.include(wrapper.text(), 'All annotations');
  });

  it("sets the button's text to the user's name when focused", () => {
    fakeStore.focusModeFocused = sinon.stub().returns(true);
    const wrapper = createComponent();
    assert.include(wrapper.text(), 'Annotations by Fake User');
  });

  describe('clicking the button shall toggle the focused mode', function() {
    it('when focused is false, toggle to true', () => {
      const wrapper = createComponent();
      wrapper.find('button').simulate('click');
      assert.calledWith(fakeStore.setFocusModeFocused, true);
    });

    it('when focused is true, toggle to false', () => {
      fakeStore.focusModeFocused = sinon.stub().returns(true);
      const wrapper = createComponent();
      wrapper.find('button').simulate('click');
      assert.calledWith(fakeStore.setFocusModeFocused, false);
    });
  });
});
