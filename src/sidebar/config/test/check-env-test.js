import { addConfigFragment } from '../../../shared/config-fragment';
import { checkEnvironment } from '../check-env';

describe('checkEnvironment', () => {
  let fakeWindow;

  beforeEach(() => {
    fakeWindow = {
      origin: 'https://hypothes.is',
      location: {
        href: 'https://hypothes.is/some-app',
      },
    };

    fakeWindow.location.href = addConfigFragment(fakeWindow.location.href, {
      origin: 'https://hypothes.is',
      version: '1.0.0-dummy-version',
    });

    sinon.stub(console, 'warn');
  });

  afterEach(() => {
    console.warn.restore();
  });

  it('returns true if all checks pass', () => {
    assert.isTrue(checkEnvironment(fakeWindow));
    assert.notCalled(console.warn);
  });

  it('returns false if annotator and sidebar versions do not match', () => {
    fakeWindow.location.href = addConfigFragment(fakeWindow.location.href, {
      origin: 'https://hypothes.is',
      version: '1.0.0-other-version',
    });
    assert.isFalse(checkEnvironment(fakeWindow));
    assert.called(console.warn);
  });

  it('returns false if the app is loaded in a sandboxed frame', () => {
    fakeWindow.origin = 'null';
    assert.isFalse(checkEnvironment(fakeWindow));
    assert.called(console.warn);
  });

  it('returns false if the app is loaded in a different origin than expected', () => {
    fakeWindow.origin = 'https://hypothes.is.some-proxy.edu';
    assert.isFalse(checkEnvironment(fakeWindow));
    assert.called(console.warn);
  });
});
