import { createElement } from 'preact';

import { setupIE11Fixes } from '../renderer-options';
import { $imports } from '../renderer-options';

describe('shared/renderer-options', () => {
  let fakeIsIE11;

  beforeEach(() => {
    fakeIsIE11 = sinon.stub().returns(true);
    $imports.$mock({
      './user-agent': {
        isIE11: fakeIsIE11,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('setupIE11Fixes', () => {
    let fakeOptions;
    let prevHook;

    beforeEach(() => {
      prevHook = sinon.stub();
      fakeOptions = {
        vnode: undefined,
      };
    });

    context('when isIE11 is false', () => {
      it('does not set a new vnode option if isIE11 is false', () => {
        fakeIsIE11.returns(false);
        setupIE11Fixes(fakeOptions);
        assert.isNotOk(fakeOptions.vnode);
      });
    });

    context('when isIE11 is true', () => {
      it('sets a new vnode option', () => {
        setupIE11Fixes(fakeOptions);
        assert.isOk(fakeOptions.vnode);
      });

      it('does not override an existing option if one exists', () => {
        fakeOptions.vnode = prevHook;
        setupIE11Fixes(fakeOptions);
        fakeOptions.vnode({});
        assert.called(prevHook);
      });

      it("alters the `dir` attribute when its equal to 'auto'", () => {
        setupIE11Fixes(fakeOptions);
        const vDiv = createElement('div', { dir: 'auto' }, 'text');
        fakeOptions.vnode(vDiv);
        assert.equal(vDiv.props.dir, '');
      });

      it('does not alter the `dir` attribute when vnode.type is not a string', () => {
        setupIE11Fixes(fakeOptions);
        const vDiv = createElement('div', { dir: 'auto' }, 'text');
        vDiv.type = () => {}; // force it to be a function
        fakeOptions.vnode(vDiv);
        assert.equal(vDiv.props.dir, 'auto');
      });

      it("does not alter the `dir` attribute when its value is not 'auto'", () => {
        setupIE11Fixes(fakeOptions);
        const vDiv = createElement('function', { dir: 'ltr' }, 'text');
        fakeOptions.vnode(vDiv);
        assert.equal(vDiv.props.dir, 'ltr');
      });
    });
  });
});
