import { mount } from '@hypothesis/frontend-testing';
import { useRef } from 'preact/hooks';

import { useContentTruncated } from '../use-content-truncated';

describe('useContentTruncated', () => {
  function FakeComponent({ children }) {
    const truncatedElementRef = useRef(null);
    const isTruncated = useContentTruncated(truncatedElementRef);

    return (
      <div data-testid="container">
        <div
          style={{ width: '100px', maxWidth: '100%' }}
          className="truncate"
          ref={truncatedElementRef}
        >
          {children}
        </div>
        <div data-testid="is-truncated">{isTruncated ? 'Yes' : 'No'}</div>
      </div>
    );
  }

  function createComponent(content) {
    return mount(<FakeComponent>{content}</FakeComponent>, { connected: true });
  }

  function isTruncated(wrapper) {
    return wrapper.find('[data-testid="is-truncated"]').text() === 'Yes';
  }

  function waitForResize(element) {
    return new Promise(resolve => {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        resolve();
      });
      observer.observe(element);
    });
  }

  [
    {
      content: 'foo',
      shouldBeTruncated: false,
    },
    {
      content: 'foo'.repeat(1000),
      shouldBeTruncated: true,
    },
  ].forEach(({ content, shouldBeTruncated }) => {
    it('checks if content is truncated once mounted', () => {
      const wrapper = createComponent(content);
      assert.equal(isTruncated(wrapper), shouldBeTruncated);
    });
  });

  it('checks if content is truncated when resized', async () => {
    const wrapper = createComponent('some content');

    // Content is initially not truncated
    assert.isFalse(isTruncated(wrapper));

    // When we resize the container to make it smaller, the content gets
    // truncated
    const container = wrapper.find('[data-testid="container"]').getDOMNode();
    const resizePromise = waitForResize(container);
    container.style.width = '10px';

    await resizePromise;
    wrapper.update();

    assert.isTrue(isTruncated(wrapper));
  });
});
