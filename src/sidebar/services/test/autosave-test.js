import * as annotationFixtures from '../../test/annotation-fixtures';
import createFakeStore from '../../test/fake-redux-store';
import { waitFor } from '../../../test-util/wait';

import autosaveService, { $imports } from '../autosave';

describe('autosaveService', () => {
  let fakeAnnotationsService;
  let fakeNewHighlights;
  let fakeRetryPromiseOperation;
  let fakeStore;

  beforeEach(() => {
    fakeAnnotationsService = { save: sinon.stub().resolves() };
    fakeNewHighlights = sinon.stub().returns([]);
    fakeRetryPromiseOperation = sinon.stub().callsFake(callback => callback());
    fakeStore = createFakeStore({}, { newHighlights: fakeNewHighlights });

    $imports.$mock({
      '../util/retry': {
        retryPromiseOperation: fakeRetryPromiseOperation,
      },
    });
  });

  /**
   * Make `fakeStore.newHighlights` return a single highlight fixture.
   */
  const oneNewHighlight = () => {
    const newHighlight = annotationFixtures.newHighlight();
    newHighlight.$tag = 'deadbeef';
    fakeStore.newHighlights.returns([newHighlight]);
    return newHighlight;
  };

  afterEach(() => {
    $imports.$restore();
  });

  it('should subscribe to store updates and check for new highlights', () => {
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    svc.init();

    fakeStore.setState({});

    assert.calledOnce(fakeStore.newHighlights);
  });

  it('should save new highlights', () => {
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    svc.init();
    const newHighlight = oneNewHighlight();

    fakeStore.setState({});

    assert.calledOnce(fakeAnnotationsService.save);
    assert.calledWith(fakeAnnotationsService.save, newHighlight);
  });

  it('should not try to save a highlight that is already being saved', () => {
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    svc.init();

    oneNewHighlight();

    fakeStore.setState({});
    assert.isTrue(svc.isSaving());

    fakeStore.setState({});
    assert.calledOnce(fakeAnnotationsService.save);
  });

  it('should not retry a highlight that failed to save', async () => {
    fakeAnnotationsService.save.rejects(new Error('Something went wrong'));
    const svc = autosaveService(fakeAnnotationsService, fakeStore);
    svc.init();

    oneNewHighlight();

    fakeStore.setState({});
    assert.calledOnce(fakeAnnotationsService.save);

    await waitFor(() => !svc.isSaving());

    fakeAnnotationsService.save.resetHistory();

    fakeStore.setState({});
    assert.notCalled(fakeAnnotationsService.save);
  });
});
