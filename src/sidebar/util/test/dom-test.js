'use strict';

const { listen } = require('../dom');

describe('sidebar/util/dom', () => {
  const createElement = () => ({
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
  });

  describe('listen', () => {
    [true, false].forEach(useCapture => {
      it('adds listeners for specified events', () => {
        const element = createElement();
        const handler = sinon.stub();

        listen(element, ['click', 'mousedown'], handler, { useCapture });

        assert.calledWith(
          element.addEventListener,
          'click',
          handler,
          useCapture
        );
        assert.calledWith(
          element.addEventListener,
          'mousedown',
          handler,
          useCapture
        );
      });
    });

    [true, false].forEach(useCapture => {
      it('removes listeners when returned function is invoked', () => {
        const element = createElement();
        const handler = sinon.stub();

        const removeListeners = listen(
          element,
          ['click', 'mousedown'],
          handler,
          { useCapture }
        );
        removeListeners();

        assert.calledWith(
          element.removeEventListener,
          'click',
          handler,
          useCapture
        );
        assert.calledWith(
          element.removeEventListener,
          'mousedown',
          handler,
          useCapture
        );
      });
    });
  });
});
