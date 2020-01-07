import { createElement } from 'preact';
import { useRef } from 'preact/hooks';
import propTypes from 'prop-types';
import { act } from 'preact/test-utils';
import { mount } from 'enzyme';

import useElementShouldClose from '../use-element-should-close';

describe('hooks.useElementShouldClose', () => {
  let handleClose;
  let e;
  const events = [
    new Event('mousedown'),
    new Event('click'),
    ((e = new Event('keypress')), (e.key = 'Escape'), e),
    new Event('focus'),
  ];

  // Create a fake component to mount in tests that uses the hook
  function FakeComponent({ isOpen = true }) {
    const myRef = useRef();
    useElementShouldClose(myRef, isOpen, handleClose);
    return (
      <div ref={myRef}>
        <button>Hi</button>
      </div>
    );
  }

  FakeComponent.propTypes = {
    isOpen: propTypes.bool,
  };

  function createComponent(props) {
    return mount(<FakeComponent isOpen={true} {...props} />);
  }

  beforeEach(() => {
    handleClose = sinon.stub();
  });

  events.forEach(event => {
    it(`should invoke close callback once for events outside of element (${event.type})`, () => {
      const wrapper = createComponent();

      act(() => {
        document.body.dispatchEvent(event);
      });
      wrapper.update();

      assert.calledOnce(handleClose);

      // Update the component to change it and re-execute the hook
      wrapper.setProps({ isOpen: false });

      act(() => {
        document.body.dispatchEvent(event);
      });

      // Cleanup of hook should have removed eventListeners, so the callback
      // is not called again
      assert.calledOnce(handleClose);
    });
  });

  events.forEach(event => {
    it(`should not invoke close callback on events outside of element if element closed (${event.type})`, () => {
      const wrapper = createComponent({ isOpen: false });

      act(() => {
        document.body.dispatchEvent(event);
      });
      wrapper.update();

      assert.equal(handleClose.callCount, 0);
    });
  });

  events.forEach(event => {
    it(`should not invoke close callback on events inside of element (${event.type})`, () => {
      const wrapper = createComponent();
      const button = wrapper.find('button');

      act(() => {
        button.getDOMNode().dispatchEvent(event);
      });
      wrapper.update();

      assert.equal(handleClose.callCount, 0);
    });
  });
});
