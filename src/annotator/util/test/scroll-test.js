import {
  offsetRelativeTo,
  scrollElement,
  scrollElementIntoView,
} from '../scroll';

describe('annotator/util/scroll', () => {
  let containers;

  beforeEach(() => {
    sinon.stub(window, 'requestAnimationFrame');
    window.requestAnimationFrame.yields();
    containers = [];
  });

  afterEach(() => {
    containers.forEach(c => c.remove());
    window.requestAnimationFrame.restore();
  });

  function createContainer() {
    const el = document.createElement('div');
    containers.push(el);
    document.body.append(el);
    return el;
  }

  describe('offsetRelativeTo', () => {
    it('returns the offset of an element relative to the given ancestor', () => {
      const parent = createContainer();
      parent.style.position = 'relative';

      const child = document.createElement('div');
      child.style.position = 'absolute';
      child.style.top = '100px';
      parent.append(child);

      const grandchild = document.createElement('div');
      grandchild.style.position = 'absolute';
      grandchild.style.top = '150px';
      child.append(grandchild);

      assert.equal(offsetRelativeTo(child, parent), 100);
      assert.equal(offsetRelativeTo(grandchild, parent), 250);
    });

    it('returns 0 if the parent is not an ancestor of the element', () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      child.style.position = 'absolute';
      child.style.top = '100px';

      assert.equal(offsetRelativeTo(child, parent), 0);
    });
  });

  describe('scrollElement', () => {
    it("animates the element's `scrollTop` offset to the target position", async () => {
      const container = createContainer();
      container.style.overflow = 'scroll';
      container.style.width = '200px';
      container.style.height = '500px';
      container.style.position = 'relative';

      const child = document.createElement('div');
      child.style.height = '3000px';
      container.append(child);

      await scrollElement(container, 2000, { maxDuration: 5 });

      assert.equal(container.scrollTop, 2000);
      container.remove();
    });
  });

  describe('scrollElementIntoView', () => {
    let container;
    let target;

    beforeEach(() => {
      container = document.createElement('div');
      container.style.height = '500px';
      container.style.overflow = 'auto';
      container.style.position = 'relative';
      document.body.append(container);

      target = document.createElement('div');
      target.style.position = 'absolute';
      target.style.top = '1000px';
      target.style.height = '20px';
      target.style.width = '100px';
      container.append(target);

      assert.isTrue(container.scrollHeight > container.clientHeight);
    });

    afterEach(() => {
      target.remove();
    });

    // A basic test for scrolling. We assume that the underlying implementation
    // has more detailed tests.
    it('scrolls element into view', async () => {
      await scrollElementIntoView(target, { maxDuration: 1 });

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      assert.isTrue(containerRect.top <= targetRect.top);
      assert.isTrue(containerRect.bottom >= targetRect.bottom);
    });

    it('installs scroll-into-view workaround for XHTML documents', async () => {
      try {
        // Simulate an XHTML document, where `tagName` is not upper-cased as
        // it is for HTML documents.
        Object.defineProperty(document.body, 'tagName', {
          value: 'body',
          configurable: true,
        });
        assert.equal(document.body.tagName, 'body');

        await scrollElementIntoView(target, { maxDuration: 1 });

        assert.equal(document.body.tagName, 'BODY');
      } finally {
        // Remove property override installed by this test.
        delete document.body.tagName;
      }
    });

    it('opens containing `<details>` tag to make content visible', async () => {
      const container = createContainer();
      const details = document.createElement('details');
      container.append(details);

      const summary = document.createElement('summary');
      summary.append('Summary');
      details.append(summary);

      const target = document.createElement('div');
      details.append(target);

      assert.isFalse(details.open);
      await scrollElementIntoView(target, { maxDuration: 1 });
      assert.isTrue(details.open);
    });
  });
});
