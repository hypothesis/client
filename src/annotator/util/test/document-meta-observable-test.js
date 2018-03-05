'use strict';

const documentMetaObservable = require('../document-meta-observable');

describe('annotator.util.document-meta-observable', () => {
  let subscriptions = [];

  function observeMeta(callback) {
    const observable = documentMetaObservable();
    const subscription = observable.subscribe({
      next: callback,
    });
    subscriptions.push(subscription);
    return subscription;
  }

  function createMeta(name, content) {
    const metaEl = document.createElement('meta');
    metaEl.name = name;
    metaEl.content = content;
    return metaEl;
  }

  function createLink(rel, href) {
    const linkEl = document.createElement('link');
    linkEl.rel = rel;
    linkEl.href = href;
    return linkEl;
  }

  afterEach(() => {
    subscriptions.forEach(s => s.unsubscribe());
  });

  describe('documentMetaObservable', () => {
    it('notifies when `<meta>` metadata changes', () => {
      const metaChanged = new Promise(resolve => observeMeta(resolve));

      const headEl = document.querySelector('head');
      const metaEl = createMeta('meta_key', 'meta_value');
      headEl.appendChild(metaEl);

      return metaChanged.then((meta) => {
        assert.equal(meta.meta.meta_key, 'meta_value');
      });
    });

    it('notifies when `<link>` metadata changes', () => {
      const metaChanged = new Promise(resolve => observeMeta(resolve));

      const headEl = document.querySelector('head');
      const linkEl = createLink('link_rel', 'https://example.com');
      headEl.appendChild(linkEl);

      return metaChanged.then((meta) => {
        assert.equal(meta.links.link_rel, 'https://example.com/');
      });
    });

    it('does not notify if metadata is unchanged', done => {
      const headEl = document.querySelector('head');
      const linkEl = createLink('link_rel', 'https://example.com');
      headEl.appendChild(linkEl);
      
      let didChange = false;
      observeMeta(() => didChange = true);

      const otherLinkEl = createLink('link_rel', 'https://example.com');
      headEl.appendChild(otherLinkEl);

      setTimeout(() => {
        assert.equal(didChange, false);
        done();
      }, 0);
    });
  });
});
