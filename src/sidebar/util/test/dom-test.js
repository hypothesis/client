import { listen, getElementHeightWithMargins } from '../dom';

describe('sidebar/util/dom', () => {
  describe('getElementHeightWithMargins', () => {
    let theElement;

    beforeEach(() => {
      theElement = document.createElement('div');
      theElement.id = 'testElement';
      theElement.style.height = '450px';
      document.body.appendChild(theElement);
    });

    it("should return an element's height", () => {
      const testElement = document.getElementById('testElement');
      assert.equal(getElementHeightWithMargins(testElement), 450);
    });

    it('should include vertical margins', () => {
      const testElement = document.getElementById('testElement');
      testElement.style.marginTop = '10px';
      testElement.style.marginBottom = '10px';
      assert.equal(getElementHeightWithMargins(testElement), 470);
    });
  });

  describe('listen', () => {
    const createFakeElement = () => ({
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    });
    [true, false].forEach(useCapture => {
      it('adds listeners for specified events', () => {
        const element = createFakeElement();
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
        const element = createFakeElement();
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
