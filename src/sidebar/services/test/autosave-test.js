import { waitFor } from '@hypothesis/frontend-testing';

import * as annotationFixtures from '../../test/annotation-fixtures';
import { fakeReduxStore } from '../../test/fake-redux-store';
import { AutosaveService, $imports } from '../autosave';

describe('AutosaveService', () => {
  let fakeAnnotationsService;
  let fakeNewHighlights;
  let fakeRetryPromiseOperation;
  let fakeStore;
  let fakeToastMessenger;

  beforeEach(() => {
    fakeAnnotationsService = { save: sinon.stub().resolves() };
    fakeNewHighlights = sinon.stub().returns([]);
    fakeRetryPromiseOperation = sinon.stub().callsFake(callback => callback());
    fakeStore = fakeReduxStore({}, { newHighlights: fakeNewHighlights });
    fakeToastMessenger = {
      success: sinon.stub(),
    };

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

  const createService = () =>
    new AutosaveService(fakeAnnotationsService, fakeToastMessenger, fakeStore);

  afterEach(() => {
    $imports.$restore();
  });

  it('should subscribe to store updates and check for new highlights', () => {
    const svc = createService();
    svc.init();

    fakeStore.setState({});

    assert.calledOnce(fakeStore.newHighlights);
  });

  it('should save new highlights', () => {
    const svc = createService();
    svc.init();
    const newHighlight = oneNewHighlight();

    fakeStore.setState({});

    assert.calledOnce(fakeAnnotationsService.save);
    assert.calledWith(fakeAnnotationsService.save, newHighlight);
  });

  it('should announce saved highlight via toast messenger service', async () => {
    const svc = createService();
    svc.init();
    oneNewHighlight();

    fakeStore.setState({});
    await waitFor(() => !svc.isSaving());

    assert.calledOnce(fakeToastMessenger.success);
    assert.calledWith(fakeToastMessenger.success, 'Highlight saved', {
      visuallyHidden: true,
    });
  });

  it('should not try to save a highlight that is already being saved', () => {
    const svc = createService();
    svc.init();

    oneNewHighlight();

    fakeStore.setState({});
    assert.isTrue(svc.isSaving());

    fakeStore.setState({});
    assert.calledOnce(fakeAnnotationsService.save);
  });

  it('should not retry a highlight that failed to save', async () => {
    fakeAnnotationsService.save.rejects(new Error('Something went wrong'));
    const svc = createService();
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
