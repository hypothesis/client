import * as annotationFixtures from '../../test/annotation-fixtures';
import createFakeStore from '../../test/fake-redux-store';

import autosaveService from '../autosave';
import { $imports } from '../autosave';

describe('autosaveService', () => {
  let fakeAnnotationsService;
  let fakeNewHighlights;
  let fakeRetryPromiseOperation;
  let fakeStore;

  beforeEach(() => {
    fakeAnnotationsService = { save: sinon.stub().resolves() };
    fakeNewHighlights = sinon.stub().returns([]);
    fakeRetryPromiseOperation = sinon.stub().resolves();
    fakeStore = createFakeStore(
      { annotations: [] },
      { newHighlights: fakeNewHighlights }
    );

    $imports.$mock({
      '../util/retry': {
        retryPromiseOperation: fakeRetryPromiseOperation,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should subscribe to store updates and check for new highlights', () => {
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    svc.init();

    fakeStore.setState({
      annotations: ['foo'],
    });

    assert.calledOnce(fakeStore.newHighlights);
  });

  it('should save new highlights', () => {
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    const newHighlight = annotationFixtures.newHighlight();
    svc.init();
    newHighlight.$tag = 'deadbeef';
    fakeStore.newHighlights.returns([newHighlight]);

    fakeStore.setState({
      annotations: ['foo'],
    });

    assert.calledOnce(fakeRetryPromiseOperation);
  });

  describe('retries and failures', () => {
    it('should not try to save a highlight that is already being saved');
    it('should not try to save a highlight that has failed to save');
  });
});
