import useRootThread from '../use-root-thread';
import { $imports } from '../use-root-thread';

describe('sidebar/components/hooks/use-root-thread', () => {
  let fakeStore;
  let fakeThreadAnnotations;

  beforeEach(() => {
    fakeStore = {
      allAnnotations: sinon.stub().returns(['1', '2']),
      filterQuery: sinon.stub().returns('itchy'),
      route: sinon.stub().returns('66'),
      selectionState: sinon.stub().returns({ hi: 'there' }),
      userFilter: sinon.stub().returns('hotspur'),
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

    const results = useRootThread();

    const threadState = fakeThreadAnnotations.getCall(0).args[0];
    assert.deepEqual(threadState.annotations, ['1', '2']);
    assert.equal(threadState.selection.filterQuery, 'itchy');
    assert.equal(threadState.route, '66');
    assert.equal(threadState.selection.filters.user, 'hotspur');
    assert.equal(results, 'a tisket, a tasket');
  });
});
