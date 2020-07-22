import useRootThread from '../use-root-thread';
import { $imports } from '../use-root-thread';

describe('sidebar/components/hooks/use-root-thread', () => {
  let fakeStore;
  let fakeThreadAnnotations;

  beforeEach(() => {
    fakeStore = {
      threadState: sinon.stub(),
    };
    fakeThreadAnnotations = sinon.stub();

    $imports.$mock({
      '../../store/use-store': callback => callback(fakeStore),
      '../../util/thread-annotations': fakeThreadAnnotations,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should return results of `threadAnnotations` with current thread state', () => {
    fakeThreadAnnotations.returns('a tisket, a tasket');
    fakeStore.threadState.returns('current-thread-state');

    const results = useRootThread();

    assert.calledWith(fakeThreadAnnotations, 'current-thread-state');
    assert.equal(results, 'a tisket, a tasket');
  });
});
