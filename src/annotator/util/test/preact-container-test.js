import { useLayoutEffect } from 'preact/hooks';

import { PreactContainer } from '../preact-container';

describe('PreactContainer', () => {
  let rootContainer;
  let unmounted;

  function Widget({ label }) {
    // Use a layout effect here so it runs synchronously on unmount.
    useLayoutEffect(() => {
      return () => {
        unmounted = true;
      };
    }, []);
    return <button>{label}</button>;
  }

  beforeEach(() => {
    rootContainer = document.createElement('div');
    unmounted = false;
  });

  afterEach(() => {
    rootContainer.remove();
  });

  it('should create container and render element', () => {
    let label = 'foo';
    const container = new PreactContainer('widget', () => (
      <Widget label={label} />
    ));
    container.render();
    assert.equal(container.element.localName, 'hypothesis-widget');

    const button = container.element.shadowRoot.querySelector('button');
    assert.ok(button);
    assert.equal(button.textContent, 'foo');

    label = 'bar';
    container.render();

    assert.equal(button.textContent, 'bar');
  });

  it('should unmount and remove element when `destroy` is called', () => {
    let label = 'foo';
    const container = new PreactContainer('widget', () => (
      <Widget label={label} />
    ));
    rootContainer.append(container);
    container.render();

    container.destroy();

    assert.equal(rootContainer.children.length, 0);
    assert.isTrue(unmounted);
  });
});
