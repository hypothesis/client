import isSidebar from '../is-sidebar';

describe('sidebar.utils.is-sidebar', () => {
  [
    '/a/random-annotation-id',
    '/stream/',
    '/stream',
    '/a/',
    '/a/foo.html',
  ].forEach(fakePath => {
    it(`returns false if window.location is in stream or single-annotation view (${fakePath})`, () => {
      const window_ = {};
      window_.location = new URL(`http://www.example.com${fakePath}`);
      assert.isFalse(isSidebar(window_));
    });
  });

  ['/whatever', '/anything-else', '/a', '/apples/', '/app.html'].forEach(
    fakePath => {
      it(`returns true if window.location is not in stream or single-annotation view (${fakePath})`, () => {
        const window_ = {};
        window_.location = new URL(`http://www.example.com${fakePath}`);
        assert.isTrue(isSidebar(window_));
      });
    }
  );
});
