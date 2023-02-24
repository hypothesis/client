import type { SinonSandbox, SinonStub } from 'sinon';
import { createSandbox } from 'sinon';

import type { PortRPC } from '../../shared/messaging';
import { annotationCounts } from '../annotation-counts';

type PortRPCMock = PortRPC<any, any> & { on: SinonStub };

describe('annotationCounts', () => {
  let countEl1: HTMLElement;
  let countEl2: HTMLElement;
  let CrossFrame: SinonStub;
  let fakeCrossFrame: PortRPCMock;
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();

    countEl1 = document.createElement('button');
    countEl1.setAttribute('data-hypothesis-annotation-count', '');
    document.body.appendChild(countEl1);

    countEl2 = document.createElement('button');
    countEl2.setAttribute('data-hypothesis-annotation-count', '');
    document.body.appendChild(countEl2);

    fakeCrossFrame = {
      on: sandbox.stub().returns(fakeCrossFrame),
    } as PortRPCMock;

    CrossFrame = sandbox.stub();
    CrossFrame.returns(fakeCrossFrame);
  });

  afterEach(() => {
    sandbox.restore();
    countEl1.remove();
    countEl2.remove();
  });

  describe('listen for "publicAnnotationCountChanged" event', () => {
    const emitEvent = function (...arg: any[]) {
      let evt;
      let fn: (...args: any[]) => void;

      const event = arg[0];
      const args = 2 <= arg.length ? Array.prototype.slice.call(arg, 1) : [];

      const crossFrameArgs = fakeCrossFrame.on.args ?? [];
      for (let i = 0, len = crossFrameArgs.length; i < len; i++) {
        evt = crossFrameArgs[i][0];
        fn = crossFrameArgs[i][1];

        if (event === evt) {
          fn(...args);
        }
      }
    };

    it('displays the updated annotation count on the appropriate elements', () => {
      const newCount = 10;
      annotationCounts(document.body, fakeCrossFrame);

      emitEvent('publicAnnotationCountChanged', newCount);

      assert.equal(countEl1.textContent, `${newCount}`);
      assert.equal(countEl2.textContent, `${newCount}`);
    });
  });
});
